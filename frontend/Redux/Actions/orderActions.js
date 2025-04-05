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

    // The response now contains the complete order data
    const updatedOrder = response.data.order;
    console.log('Updated order data:', updatedOrder);

    dispatch({
      type: UPDATE_ORDER_STATUS_SUCCESS,
      payload: updatedOrder
    });
   
    dispatch(getAllOrders());
    
    return updatedOrder;
  } catch (error) {
    console.error('Error updating order status:', error.response || error);
    dispatch({
      type: UPDATE_ORDER_STATUS_FAIL,
      payload: error.response?.data?.message || 'Failed to update order status'
    });
    throw error;
  }
};


// Action to fetch a specific order by ID (admin only)
export const getOrderById = (orderId) => async (dispatch) => {
  try {
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');

    const response = await axios.get(
      `${API_URL}/admin/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error fetching order details:', error);
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