import axios from 'axios';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import {
  CREATE_ORDER_REQUEST,
  CREATE_ORDER_SUCCESS,
  CREATE_ORDER_FAIL,
  GET_USER_ORDERS_REQUEST,
  GET_USER_ORDERS_SUCCESS,
  GET_USER_ORDERS_FAIL,
  SET_SELECTED_ITEMS,
  SET_PAYMENT_METHOD
} from '../Constants/orderConstants';
import { clearCartData } from './cartActions';

export const createOrder = (orderData) => async (dispatch) => {
  try {
    dispatch({ type: CREATE_ORDER_REQUEST });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const response = await axios.post(
      `${API_URL}/place-order`,
      orderData,
      config
    );

    dispatch({
      type: CREATE_ORDER_SUCCESS,
      payload: response.data.order
    });

    return response.data;
  } catch (error) {
    dispatch({
      type: CREATE_ORDER_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

export const setSelectedItems = (selectedOrderIds) => async (dispatch) => {
  try {
    console.log('Fetching details for selected orders:', selectedOrderIds);

    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');

    // Fetch full order details for selected items
    const response = await axios.post(
      `${API_URL}/get-selected-orders`,
      { orderIds: selectedOrderIds },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Selected orders with details:', response.data);

    return dispatch({
      type: SET_SELECTED_ITEMS,
      payload: response.data.orders
    });
  } catch (error) {
    console.error('Error in setSelectedItems:', error);
    throw error;
  }
};

export const processOrder = (orderDetails) => async (dispatch) => {
  try {
    dispatch({ type: CREATE_ORDER_REQUEST });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');

    // 1. Create the order
    const orderResponse = await axios.post(
      `${API_URL}/place-order`,
      orderDetails,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // 2. Delete processed items from orderlist
    await axios.post(
      `${API_URL}/cleanup-orderlist`,
      { orderIds: orderDetails.orderIds },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    dispatch({
      type: CREATE_ORDER_SUCCESS,
      payload: orderResponse.data.order
    });

    return orderResponse.data;
  } catch (error) {
    dispatch({
      type: CREATE_ORDER_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

export const setPaymentMethod = (method) => ({
  type: SET_PAYMENT_METHOD,
  payload: method
});

export const placeOrder = (orderData, navigation) => async (dispatch) => {
  try {
    dispatch({ type: CREATE_ORDER_REQUEST });
    const token = await SecureStore.getItemAsync("jwt");

    if (!token) {
      throw new Error('Authentication token not found');
    }

    console.log('Placing order:', {
      userId: orderData.userId,
      productsCount: orderData.products.length
    });

    // Step 1: Place the order
    const orderResponse = await axios.post(
      `${API_URL}/place-order`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Order response:', orderResponse.data);

    // Step 2: Clean up cart
    await axios.delete(`${API_URL}/delete-ordered-products`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: {
        userId: orderData.userId,
        productIds: orderData.products.map(p => p.productId)
      }
    });

    dispatch({ type: CREATE_ORDER_SUCCESS, payload: orderResponse.data.order });
    dispatch(clearCartData());

    Alert.alert(
      'Order Placed Successfully',
      'Thank you for your order!',
      [
        {
          text: 'OK',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        }
      ]
    );

  } catch (error) {
    console.error('Order placement error:', error.response?.data || error.message);
    dispatch({
      type: CREATE_ORDER_FAIL,
      payload: error.response?.data?.message || 'Failed to place order'
    });
    Alert.alert('Error', 'Failed to place order. Please try again.');
  }
};
