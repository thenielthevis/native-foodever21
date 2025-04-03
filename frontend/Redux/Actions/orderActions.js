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
  SET_PAYMENT_METHOD,
  // Add the new imports
  GET_ALL_ORDERS_REQUEST,
  GET_ALL_ORDERS_SUCCESS,
  GET_ALL_ORDERS_FAIL,
  UPDATE_ORDER_STATUS_REQUEST,
  UPDATE_ORDER_STATUS_SUCCESS,
  UPDATE_ORDER_STATUS_FAIL
} from '../Constants/orderConstants';
import { clearCartData } from './cartActions';


// Add these new admin actions


// Action to fetch all orders (admin only)
export const getAllOrders = () => async (dispatch) => {
  try {
    console.log('getAllOrders - Starting to fetch all orders');
    dispatch({ type: GET_ALL_ORDERS_REQUEST });
   
    // Get authentication token
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      throw new Error('No authentication token found. Please log in again.');
    }
   
    // Make sure API_URL is correct - log it for debugging
    console.log(`API_URL from env: ${API_URL}`);
   
    // Make sure the endpoint has a leading slash if needed
    const endpoint = API_URL.endsWith('/') ? 'orders' : '/orders';
    const fullUrl = `${API_URL}${endpoint}`;
   
    console.log(`Making request to: ${fullUrl}`);
   
    // Make request WITH authentication headers
    const response = await axios.get(
      fullUrl,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}` // Add token to request
        },
        timeout: 10000  // 10 second timeout
      }
    );


    console.log('getAllOrders - Raw response status:', response.status);
   
    // Check if response data exists and is an array
    if (!response.data) {
      throw new Error('No data received from server');
    }
   
    const orders = Array.isArray(response.data) ? response.data : [];
    console.log(`getAllOrders - Processing ${orders.length} orders`);


    // Format orders for display - using safer access patterns
    const formattedOrders = orders.map(order => {
      // Defensive programming for nested properties
      const safeOrder = {
        id: order._id || 'unknown-id',
        orderNumber: `ORD-${order._id ? order._id.substring(0, 4) : 'XXXX'}`,
        customer: order.userId?.username || 'Unknown Customer',
        date: new Date(order.createdAt || order.timestamp || Date.now()).toISOString().split('T')[0],
        amount: 0,
        status: (order.status?.charAt(0).toUpperCase() + order.status?.slice(1)) || 'Processing',
        items: []
      };
     
      // Safely calculate amount and format items
      if (Array.isArray(order.products)) {
        safeOrder.amount = order.products.reduce((total, item) => {
          const price = item.productId?.price || 0;
          const quantity = item.quantity || 1;
          return total + (price * quantity);
        }, 0);
       
        safeOrder.items = order.products.map(item => ({
          name: item.productId?.name || 'Unknown Product',
          quantity: item.quantity || 1,
          price: item.productId?.price || 0
        }));
      }
     
      return safeOrder;
    });


    dispatch({
      type: GET_ALL_ORDERS_SUCCESS,
      payload: formattedOrders
    });
   
    return formattedOrders;
  } catch (error) {
    console.error('Error fetching all orders:', error);
    console.error('Error response:', error.response?.data);
    console.error('Error status:', error.response?.status);
   
    // Specific handling for 401 errors
    if (error.response?.status === 401) {
      Alert.alert(
        'Authentication Error',
        'Your session has expired or you do not have permission to access this data. Please log in again.',
        [{ text: 'OK' }]
      );
    } else if (__DEV__) {
      // For debugging purposes, show a detailed alert in dev mode
      Alert.alert(
        'API Error',
        `Status: ${error.response?.status || 'unknown'}\n` +
        `Message: ${error.message}\n` +
        `URL: ${API_URL}/orders`
      );
    }
   
    dispatch({
      type: GET_ALL_ORDERS_FAIL,
      payload: error.response?.status === 401
        ? 'Authentication error. Please log in again.'
        : error.message || 'Failed to fetch orders'
    });
    throw error;
  }
};


// Action to update order status (admin only)
export const updateOrderStatus = (orderId, status) => async (dispatch) => {
  try {
    dispatch({ type: UPDATE_ORDER_STATUS_REQUEST });
   
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');


    // First check if the order is eligible for status update
    const response = await axios.put(
      `${API_URL}/orders/statuses/${orderId}`,
      { status },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );


    dispatch({
      type: UPDATE_ORDER_STATUS_SUCCESS,
      payload: response.data
    });
   
    // Refresh order list after status update
    dispatch(getAllOrders());
   
    return response.data;
  } catch (error) {
    console.error('Error updating order status:', error);
   
    // Check if error is specifically about immutable status
    if (error.response?.data?.message?.includes('Cannot update status')) {
      Alert.alert(
        'Status Update Failed',
        `This order is already ${error.response.data.currentStatus} and cannot be modified.`
      );
    } else {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update order status'
      );
    }
   
    dispatch({
      type: UPDATE_ORDER_STATUS_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};


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