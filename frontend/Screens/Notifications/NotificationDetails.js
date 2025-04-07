import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { markAsRead } from '../../services/notificationsDB';
import axios from 'axios';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';

const NotificationDetails = ({ route, navigation }) => {
  const { notification } = route.params;
  const [order, setOrder] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const setupNotification = async () => {
    if (notification?.id) {
      await markAsRead(notification.id);
    }

    const notificationData = notification?.data || {};
    
    if (notificationData.type === 'ORDER_STATUS_UPDATE') {
      if (notificationData.orderId) {
        if (notificationData.products) {
          setOrder({
            _id: notificationData.orderId,
            orderNumber: notificationData.orderNumber,
            products: notificationData.products,
            status: notificationData.status,
            paymentMethod: notificationData.paymentMethod,
            createdAt: notificationData.orderDate,
            customer: notificationData.customer
          });
        } else {
          await fetchOrderDetails(notificationData.orderId);
        }
      }
    } else if (notificationData.type === 'PRODUCT_DISCOUNT') {
      setProduct({
        _id: notificationData.productId,
        name: notificationData.productName,
        image: notificationData.image,
          images: notificationData.images || [], // Add images array
        price: notificationData.price,
        discountedPrice: notificationData.discountedPrice,
        discount: notificationData.discount,
          category: notificationData.category || 'Unknown', // Add category
          status: notificationData.status || 'Available', // Add status
          description: notificationData.description || '', // Add description
          ratings: notificationData.ratings || 0,
          numOfReviews: notificationData.numOfReviews || 0,
          reviews: notificationData.reviews || []
      });
    }
    
    setLoading(false);
  };

  useEffect(() => {
    setupNotification();
  }, [notification]);

  const onRefresh = async () => {
    setRefreshing(true);
    setOrder(null);
    setProduct(null);
    await setupNotification();
    setRefreshing(false);
  };

  useEffect(() => {
    const fetchCompleteProductData = async () => {
      if (notification?.data?.type === 'PRODUCT_DISCOUNT' && notification?.data?.productId) {
        try {
          const token = await SecureStore.getItemAsync('jwt');
          const response = await axios.get(
            `${API_URL}/product/${notification.data.productId}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (response.data.product) {
            setProduct({
              ...response.data.product,
              discountedPrice: response.data.product.price * (1 - response.data.product.discount / 100)
            });
          }
        } catch (error) {
          console.error('Error fetching complete product data:', error);
        }
      }
      setLoading(false);
    };

    fetchCompleteProductData();
  }, [notification]);

  const fetchOrderDetails = async (orderId) => {
    if (orderId) {
      try {
        setLoading(true);
        const token = await SecureStore.getItemAsync('jwt');
        
        const response = await axios.get(
          `${API_URL}/admin/orders/${orderId}`, 
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data) {
          console.log('Found order:', response.data);
          setOrder(response.data);
        } else {
          console.log('Order not found:', orderId);
        }
      } catch (error) {
        console.error('Error fetching order:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Handle different date formats
      const date = typeof dateString === 'number' 
        ? new Date(dateString) 
        : new Date(dateString);

      return date.toLocaleString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date not available';
    }
  };

  const formatCurrency = (amount) => {
    return `₱${Number(amount).toFixed(2)}`;
  };

  const calculateOrderTotals = (products) => {
    if (!products?.length) return { subtotal: 0, total: 0 };
    
    const subtotal = products.reduce((sum, item) => {
      const product = item.productId || item;
      const price = product.discountedPrice || product.price || 0;
      return sum + (price * item.quantity);
    }, 0);
    
    return {
      subtotal,
      total: subtotal
    };
  };

  const renderOrderDetails = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      );
    }

    if (!order) return null;

    const { subtotal, total } = calculateOrderTotals(order.products);

    // Format order number safely
    const orderNumber = order._id 
      ? `Order #${order._id.toString().slice(-4)}`
      : order.orderNumber || 'Order Details';

    return (
      <View style={styles.orderContainer}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderNumber}>{orderNumber}</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: order.status === 'completed' ? '#4CAF50' : 
              order.status === 'cancelled' ? '#F44336' : '#FF8C00' }
          ]}>
            <Text style={styles.statusText}>
              {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(order.createdAt)}</Text>
        </View>

        <View style={styles.orderInfo}>
          <Text style={styles.infoLabel}>Payment:</Text>
          <Text style={styles.infoValue}>
            {(order.paymentMethod || 'cash_on_delivery')
              .split('_')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Ordered Items:</Text>
        <View style={styles.itemsList}>
          {order.products?.map((item, index) => (
            <OrderItem 
              key={index}
              item={item}
              formatCurrency={formatCurrency}
            />
          ))}
        </View>

        <OrderTotals
          subtotal={subtotal}
          total={total}
          formatCurrency={formatCurrency}
        />
      </View>
    );
  };

  // Add helper function for formatting payment method
  const formatPaymentMethod = (method) => {
    if (!method) return 'Cash on Delivery';
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Update the renderProductDiscount function
  const renderProductDiscount = () => {
    if (!product) return null;
  
    // Handle image as an array
    const imageUrl = product.images && product.images.length > 0 
      ? product.images[0] 
      : product.image || null;
  
    return (
      <TouchableOpacity 
        style={styles.productDiscountContainer}
        onPress={() => navigation.navigate('ProductDetails', { product })}
      >
        <Image
          source={{ uri: product.images?.[0]?.url || product.image }}
          style={styles.discountProductImage}
          defaultSource={require('../../assets/Home/placeholder.png')}
        />
        
        <View style={styles.discountInfo}>
          <Text style={styles.discountProductName}>{product.name}</Text>
          
          {/* Status and Category in one row */}
          <View style={styles.statusCategoryRow}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: product.status === 'Available' ? '#e6ffe6' : '#ffe6e6' }
            ]}>
              <View style={[
                styles.statusDot, 
                { backgroundColor: product.status === 'Available' ? '#00cc00' : '#ff3333' }
              ]} />
              <Text style={[
                styles.statusText, 
                { color: product.status === 'Available' ? '#006600' : '#cc0000' }
              ]}>
                {product.status}
              </Text>
            </View>

            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{product.category}</Text>
            </View>
          </View>
          
          {/* Ratings and Reviews */}
          <View style={styles.reviewsContainer}>
            <View style={styles.ratingContainer}>
              {renderStars(product.ratings)}
              <Text style={styles.ratingText}>{product.ratings?.toFixed(1) || '0.0'}</Text>
            </View>
            <Text style={styles.reviewsCount}>
              {product.numOfReviews || 0} {product.numOfReviews === 1 ? 'Review' : 'Reviews'}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>₱{product.price?.toFixed(2)}</Text>
            <Text style={styles.discountedPrice}>₱{product.discountedPrice?.toFixed(2)}</Text>
          </View>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{product.discount}% OFF</Text>
          </View>
        </View>

        <View style={styles.callToAction}>
          <Text style={styles.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={20} color="#FF8C00" />
        </View>
      </TouchableOpacity>
    );
  };

  // Add renderStars helper function
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<Ionicons key={i} name="star" size={16} color="#FFD700" />);
      } else if (hasHalfStar && i === fullStars + 1) {
        stars.push(<Ionicons key={i} name="star-half" size={16} color="#FFD700" />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={16} color="#FFD700" />);
      }
    }
    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF8C00"]}
            tintColor="#FF8C00"
          />
        }
      >
        <View style={styles.notificationHeader}>
          <Ionicons 
            name={notification?.data?.type === 'PRODUCT_DISCOUNT' ? "pricetag" : "receipt"} 
            size={32} 
            color="#FF8C00" 
          />
          <Text style={styles.timestamp}>
            {formatDate(
              notification?.created_at || 
              notification?.notification?.date ||
              new Date().getTime()
            )}
          </Text>
        </View>

        <Text style={styles.title}>
          {notification?.title || notification?.notification?.request?.content?.title || 'Order Update'}
        </Text>
        <Text style={styles.body}>
          {notification?.body || notification?.notification?.request?.content?.body || ''}
        </Text>

        {notification?.data?.type === 'ORDER_STATUS_UPDATE' ? renderOrderDetails() : renderProductDiscount()}
      </ScrollView>
    </View>
  );
};

const OrderItem = ({ item, formatCurrency }) => {
  // Check if the product exists and has the correct data
  const product = item.productId || item;
  
  // Handle image as an array
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : product.image || null;
  
  return (
    <View style={styles.productItem}>
      <Image
        source={imageUrl ? { uri: imageUrl } : require('../../assets/Home/placeholder.png')}
        style={styles.productImage}
        defaultSource={require('../../assets/Home/placeholder.png')}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productName}>
          {product.name || 'Product'}
        </Text>
        <Text style={styles.productQuantity}>
          {item.quantity}x @ {formatCurrency(product.discountedPrice || product.price || 0)}
        </Text>
        <Text style={styles.itemTotal}>
          {formatCurrency((product.discountedPrice || product.price || 0) * item.quantity)}
        </Text>
      </View>
    </View>
  );
};

const OrderTotals = ({ subtotal, total, formatCurrency }) => (
  <View style={styles.totalSection}>
    <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
    <TotalRow 
      label="Total" 
      value={formatCurrency(total)}
      style={styles.finalTotal}
      valueStyle={styles.finalTotalValue}
    />
  </View>
);

const TotalRow = ({ label, value, style, valueStyle }) => (
  <View style={[styles.totalRow, style]}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={[styles.totalValue, valueStyle]}>{value}</Text>
  </View>
);

const additionalStyles = {
  productDiscountContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  discountProductImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
    resizeMode: 'cover',
  },
  discountInfo: {
    marginBottom: 15,
  },
  discountProductName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'line-through',
    marginRight: 10,
  },
  discountedPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  discountBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  discountText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  callToAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  viewDetailsText: {
    color: '#FF8C00',
    fontWeight: 'bold',
    marginRight: 5,
  },
  categoryTag: {
    backgroundColor: 'rgba(255, 153, 0, 0.1)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ff9900',
    marginBottom: 8,
    marginTop: 5,
  },
  categoryText: {
    color: '#ff9900',
    fontSize: 12,
    fontWeight: '600',
  },
  reviewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  ratingText: {
    marginLeft: 5,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  reviewsCount: {
    fontSize: 14,
    color: '#666',
  },
  statusCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: 'black',
    borderWidth: 1,
  },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  timestamp: {
    color: '#666',
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  body: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 20,
  },
  orderContainer: {
    backgroundColor: '#F8F8F8',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderColor: 'black',
    borderWidth: 1,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderInfo: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
  },
  productItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
  },
  productImageContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF8C00',
    marginTop: 4,
  },
  totalSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 15,
    color: '#666',
  },
  totalValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  ...additionalStyles,
});

export default NotificationDetails;
