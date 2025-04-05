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
    dispatch({ type: GET_ALL_ORDERS_REQUEST });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_URL}/admin/orders`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    dispatch({
      type: GET_ALL_ORDERS_SUCCESS,
      payload: response.data
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching all orders:', error);
    dispatch({
      type: GET_ALL_ORDERS_FAIL,
      payload: error.response?.data?.message || 'Failed to fetch orders'
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

    // Updated endpoint to match the router definition
    const response = await axios.put(
      `${API_URL}/admin/orders/${orderId}/status`,
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

export const getUserOrders = () => async (dispatch) => {
  try {
    dispatch({ type: GET_USER_ORDERS_REQUEST });

    const token = await SecureStore.getItemAsync('jwt');
    if (!token) {
      throw new Error('No authentication token found');
    }

    console.log('Fetching orders with token:', token.substring(0, 20) + '...');

    const response = await axios.get(
      `${API_URL}/user-orders`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('API response status:', response.status);
    console.log('API response success flag:', response.data?.success);
    console.log('API response orders count:', response.data?.orders?.length || 0);

    if (response.data?.success) {
      // Ensure we have an array of orders
      const ordersArray = Array.isArray(response.data.orders) ? response.data.orders : [];
      
      console.log('Dispatching orders to Redux store:', ordersArray.length);
      
      // Dispatch to Redux
      dispatch({
        type: GET_USER_ORDERS_SUCCESS,
        payload: ordersArray
      });
      
      // Also return the data so we can use it directly
      return ordersArray;
    } else {
      console.log('API returned success=false');
      throw new Error(response.data?.message || 'Failed to fetch orders');
    }
  } catch (error) {
    console.error('Error fetching orders:', {
      message: error.message,
      response: error.response?.data
    });
    
    dispatch({
      type: GET_USER_ORDERS_FAIL,
      payload: error.response?.data?.message || error.message
    });
    return [];
  }
};