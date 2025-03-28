import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { getUserOrderList, removeFromCart, fetchOrderCount, updateCartQuantity } from '../../Redux/Actions/cartActions';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { setSelectedItems } from '../../Redux/Actions/orderActions';

const CartScreen = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [selectedItems, setSelectedItems] = useState({});
  const [loading, setLoading] = useState(false);
  
  const { orderList, loading: cartLoading, error } = useSelector(state => {
    return {
      orderList: state.cart?.orderList || [],
      loading: state.cart?.loading || false,
      error: state.cart?.error || null
    };
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync("jwt");
      const userData = await SecureStore.getItemAsync("userData");
      
      if (!token || !userData) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'signin' }],
        });
        return;
      }

      // Fetch both order list and count
      dispatch(getUserOrderList());
      dispatch(fetchOrderCount());
    };
    
    checkAuth();
  }, [dispatch]);

  const handleQuantityUpdate = async (orderId, newQuantity) => {
    if (newQuantity <= 0) {
      Alert.alert('Invalid Quantity', 'Quantity must be greater than 0');
      return;
    }
    
    try {
      setLoading(true);
      await dispatch(updateCartQuantity(orderId, newQuantity));
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItemSelection = (orderId) => {
    setSelectedItems(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const calculateTotal = () => {
    return orderList.reduce((total, item) => {
      if (selectedItems[item.order_id]) {
        const price = item.product.discountedPrice || item.product.price;
        return total + (price * item.quantity);
      }
      return total;
    }, 0);
  };

  const handleDelete = (orderId) => {
    dispatch(removeFromCart(orderId));
  };

  const handleOrderNow = () => {
    try {
      const selectedOrderIds = Object.keys(selectedItems).filter(orderId => selectedItems[orderId]);
      
      if (selectedOrderIds.length === 0) {
        Alert.alert('Error', 'Please select at least one item');
        return;
      }

      // Get the selected orders with their details
      const selectedOrders = orderList.filter(order => selectedItems[order.order_id]);
      
      // Dispatch selected orders to Redux
      dispatch({
        type: 'SET_SELECTED_ORDERS',
        payload: selectedOrders
      });

      // Navigate to confirmation screen
      navigation.navigate('Confirm');

    } catch (error) {
      console.error('handleOrderNow - Error:', error);
      Alert.alert(
        'Error',
        'Something went wrong while processing your order. Please try again.'
      );
    }
  };

  // Add this helper function to check if any items are selected
  const hasSelectedItems = () => {
    return Object.values(selectedItems).some(isSelected => isSelected);
  };

  const renderItem = ({ item }) => (
    <View style={styles.orderItem}>
      <TouchableOpacity
        style={styles.checkbox}
        onPress={() => toggleItemSelection(item.order_id)}
      >
        <Ionicons
          name={selectedItems[item.order_id] ? "checkbox" : "square-outline"}
          size={24}
          color="#ff9900"
        />
      </TouchableOpacity>
      
      <Image 
        source={{ uri: item.product.image }} 
        style={styles.productImage}
        defaultSource={require('../../assets/Home/placeholder.png')}
      />
      
      <View style={styles.productInfo}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{item.product.name}</Text>
          <TouchableOpacity 
            onPress={() => handleDelete(item.order_id)}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={24} color="#ff4444" />
          </TouchableOpacity>
        </View>
        <View style={styles.priceContainer}>
          {item.product.discountedPrice ? (
            <>
              <Text style={styles.originalPrice}>₱{item.product.price}</Text>
              <Text style={styles.discountedPrice}>₱{item.product.discountedPrice}</Text>
            </>
          ) : (
            <Text style={styles.productPrice}>₱{item.product.price}</Text>
          )}
        </View>
        
        <View style={styles.quantityControl}>
          <TouchableOpacity 
            style={[
              styles.quantityButton,
              item.quantity <= 1 && styles.quantityButtonDisabled
            ]}
            disabled={item.quantity <= 1}
            onPress={() => handleQuantityUpdate(item.order_id, item.quantity - 1)}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          
          <Text style={styles.quantityText}>{item.quantity}</Text>
          
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleQuantityUpdate(item.order_id, item.quantity + 1)}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (cartLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff9900" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text>Error: {error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orderList}
        renderItem={renderItem}
        keyExtractor={item => item.order_id?.toString()}
        ListEmptyComponent={
          <View style={styles.emptyCart}>
            <Text>No items in cart</Text>
          </View>
        }
      />

      <View style={styles.bottomNav}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>₱{calculateTotal().toFixed(2)}</Text>
        </View>
        <TouchableOpacity 
          style={[
            styles.orderButton,
            !hasSelectedItems() && styles.orderButtonDisabled
          ]}
          disabled={!hasSelectedItems()}
          onPress={handleOrderNow}
        >
          <Text style={[
            styles.orderButtonText,
            !hasSelectedItems() && styles.orderButtonTextDisabled
          ]}>
            Order Now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  orderItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 10,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productInfo: {
    marginLeft: 16,
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteButton: {
    padding: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  discountedPrice: {
    fontSize: 16,
    color: '#ff9900',
    fontWeight: 'bold',
  },
  productPrice: {
    fontSize: 16,
    color: '#ff9900',
    fontWeight: 'bold',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 20,
    color: '#333',
  },
  quantityText: {
    marginHorizontal: 15,
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  bottomNav: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 30,
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ff9900',
  },
  orderButton: {
    backgroundColor: '#ff9900',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  orderButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.8,
  },
  orderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orderButtonTextDisabled: {
    color: '#666',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default CartScreen;
