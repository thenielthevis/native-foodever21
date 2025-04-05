import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, Image, Button } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { getUserOrders } from '../../Redux/Actions/orderActions';
import BottomNav from '../Shared/StyledComponents/BottomNav';
import { SafeAreaView } from 'react-native-safe-area-context';

const UserOrdersScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [localOrders, setLocalOrders] = useState([]);
  const [isLocalData, setIsLocalData] = useState(false);
  
  // Get the complete state tree for debugging
  const fullState = useSelector(state => state);
  console.log('Redux store keys:', Object.keys(fullState));
  
  // Find the order reducer regardless of where it's mounted
  let orderReducerKey = Object.keys(fullState).find(key => 
    fullState[key] && typeof fullState[key] === 'object' && 
    fullState[key].hasOwnProperty('userOrders')
  );
  
  console.log('Found order reducer at key:', orderReducerKey);
  
  // Get the orders data from Redux store with improved fallback
  const { loading, error, orders } = useSelector(state => {
    // First try the key we found automatically
    if (orderReducerKey && state[orderReducerKey]?.userOrders) {
      return {
        loading: state[orderReducerKey].userOrders.loading || false,
        error: state[orderReducerKey].userOrders.error || null,
        orders: state[orderReducerKey].userOrders.orders || []
      };
    }
    
    // Try common Redux naming patterns
    const possibleKeys = ['orderReducer', 'order', 'orders', 'ordersState'];
    for (const key of possibleKeys) {
      if (state[key]?.userOrders) {
        console.log('Found orders at key:', key);
        return {
          loading: state[key].userOrders.loading || false,
          error: state[key].userOrders.error || null,
          orders: state[key].userOrders.orders || []
        };
      }
    }
    
    // Try a flatter structure
    if (state.userOrders) {
      console.log('Found userOrders at root level');
      return {
        loading: state.userOrders.loading || false,
        error: state.userOrders.error || null,
        orders: state.userOrders.orders || []
      };
    }
    
    // Last resort fallback
    console.log('Could not find orders in Redux state');
    return { loading: false, error: null, orders: [] };
  });
  
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      console.log('Loading orders...');
      setLoadError(null);
      const result = await dispatch(getUserOrders());
      
      // Store orders in local state as a fallback
      if (Array.isArray(result) && result.length > 0) {
        console.log('Storing orders in local state:', result.length);
        setLocalOrders(result);
        setIsLocalData(true);
      } else {
        console.log('No orders returned from API call');
      }
    } catch (error) {
      console.error('Failed to load orders:', error);
      setLoadError(error.message || 'Failed to load orders');
    }
  };

  // Get final orders to display (from Redux or local state)
  const displayOrders = (orders && orders.length > 0) ? orders : localOrders;
  const hasOrders = Array.isArray(displayOrders) && displayOrders.length > 0;
  
  console.log('Display decision:', { 
    reduxOrdersCount: orders?.length || 0,
    localOrdersCount: localOrders?.length || 0,
    usingLocalData: isLocalData && displayOrders === localOrders,
    hasOrders
  });

  // Force a refresh with a button for testing
  const forceRefresh = () => {
    console.log('Forcing refresh...');
    loadOrders();
  };

  // Use useCallback to define the refresh function
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders().finally(() => setRefreshing(false));
  }, [dispatch]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Check if we have product data before rendering
  const renderProductItem = ({ item }) => {
    if (!item.productId) {
      console.log('Missing product data:', item);
      return (
        <View style={styles.productItem}>
          <Text>Product data unavailable</Text>
        </View>
      );
    }

    // Debug image data
    console.log('Product image data:', {
      productId: item.productId._id,
      name: item.productId.name,
      hasImages: !!item.productId.images,
      imagesLength: item.productId.images?.length,
      firstImage: item.productId.images?.[0]?.url,
      directImage: item.productId.image
    });

    // Get the correct image URL with multiple fallbacks
    let imageUrl = null;
    
    // Try standard product structure (images array)
    if (item.productId.images && item.productId.images.length > 0) {
      const firstImage = item.productId.images[0];
      if (firstImage.url) {
        imageUrl = firstImage.url;
        console.log('Using image from images array:', imageUrl);
      }
    }
    
    // Try direct image field if images array didn't work
    if (!imageUrl && item.productId.image) {
      imageUrl = item.productId.image;
      console.log('Using direct image property:', imageUrl);
    }
    
    // Try alternative image property names
    if (!imageUrl && item.productId.imageUrl) {
      imageUrl = item.productId.imageUrl;
      console.log('Using imageUrl property:', imageUrl);
    }
    
    if (!imageUrl && item.productId.img) {
      imageUrl = item.productId.img;
      console.log('Using img property:', imageUrl);
    }
    
    // Default fallback
    if (!imageUrl || imageUrl.trim() === '') {
      imageUrl = 'https://via.placeholder.com/150';
      console.log('Using default placeholder image');
    }
    
    // Check if URL needs to be prefixed (e.g., relative path vs absolute URL)
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('https://via.placeholder.com')) {
      // Add base URL if the path is relative
      imageUrl = `${API_URL}/${imageUrl.replace(/^\/+/, '')}`;
      console.log('Added base URL to image path:', imageUrl);
    }

    return (
      <View style={styles.productItem}>
        <View style={styles.productImageContainer}>
          <Image 
            source={{ uri: imageUrl }} 
            style={styles.productImage}
            defaultSource={require('../../assets/logo.png')}
            onError={() => console.log('Image failed to load:', imageUrl)}
          />
        </View>
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.productId.name}</Text>
          <Text style={styles.productQuantity}>Quantity: {item.quantity}</Text>
          <Text style={styles.productPrice}>₱{item.productId.price * item.quantity}</Text>
          
          {/* Add Review button for completed orders */}
          {item.parentOrder && item.parentOrder.status === 'completed' && (
            <Button 
              title="Review Product"
              onPress={() => navigation.navigate('ProductReview', { 
                productId: item.productId._id,
                productName: item.productId.name,
                productImage: imageUrl
              })}
              color="#FF6B00"
            />
          )}
        </View>
      </View>
    );
  };

  // Check if we have complete order data
  const renderOrderItem = ({ item }) => {
    if (!item || !item._id) {
      console.log('Invalid order item:', item);
      return null;
    }

    // Add parent order reference to each product for the Review button logic
    const productsWithParentOrder = item.products.map(product => ({
      ...product,
      parentOrder: {
        _id: item._id,
        status: item.status
      }
    }));

    return (
      <View style={styles.orderCard}>
        <Text style={styles.orderId}>Order #{item._id.slice(-6)}</Text>
        <Text style={styles.orderDate}>
          Placed on: {formatDate(item.createdAt)}
        </Text>
        <Text style={[styles.orderStatus, styles[`status${item.status}`]]}>
          Status: {item.status.toUpperCase()}
        </Text>
        
        <View style={styles.productsContainer}>
          <Text style={styles.productsHeader}>Order Items:</Text>
          <FlatList
            data={productsWithParentOrder}
            renderItem={renderProductItem}
            keyExtractor={(product, index) => `${item._id}-product-${index}`}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.orderTotal}>
            Total: ₱{item.totalPrice?.toFixed(2) || '0.00'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>My Orders</Text>
        <Button title="Refresh" onPress={forceRefresh} color="#FF6B00" />
      </View>
      
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Loading orders...</Text>
        </View>
      ) : error || loadError ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error || loadError}</Text>
          <Text style={styles.retryText} onPress={loadOrders}>Tap to retry</Text>
        </View>
      ) : hasOrders ? (
        <FlatList
          data={displayOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item._id?.toString() || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.retryText} onPress={forceRefresh}>Tap to refresh</Text>
          <Text style={styles.debugText}>
            Redux state: {orderReducerKey ? `Found at ${orderReducerKey}` : 'Not found'}{'\n'}
            Orders source: {isLocalData ? 'Local state' : 'Redux'}{'\n'}
            Redux keys: {Object.keys(fullState).join(', ')}
          </Text>
        </View>
      )}
      
      <BottomNav navigation={navigation} activeRoute="Orders" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F2', // Warmer background color
  },
  header: {
    padding: 16,
    backgroundColor: '#FF6B00', // Food-themed header color
    borderBottomWidth: 1,
    borderBottomColor: '#FF8F3D',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    margin: 10,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333333',
  },
  orderDate: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 10,
  },
  orderStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#FFF9F2',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 10,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  productImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 10,
    marginRight: 15,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginBottom: 8,
  },
  productsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  productsHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333333',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 12,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  statusshipping: {
    backgroundColor: '#FFF0E0',
    color: '#FF9800',
  },
  statuscompleted: {
    backgroundColor: '#E8F5E9',
    color: '#4CAF50',
  },
  statuscancelled: {
    backgroundColor: '#FFEBEE',
    color: '#F44336',
  },
  retryText: {
    marginTop: 12,
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: '500',
  },
  debugText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999999',
    textAlign: 'center'
  }
});

export default UserOrdersScreen;
