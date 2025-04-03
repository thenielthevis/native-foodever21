import axios from 'axios'
import { API_URL } from '@env'
import * as SecureStore from 'expo-secure-store'
import {
  ADD_TO_CART,
  UPDATE_CART_QUANTITY,
  REMOVE_FROM_CART,
  SET_CART_LOADING,
  SET_CART_ERROR,
  SET_CART_COUNT,
  SET_ORDER_COUNT,
  GET_ORDER_LIST_REQUEST,
  GET_ORDER_LIST_SUCCESS,
  GET_ORDER_LIST_FAIL
} from '../Constants/cartConstants'

export const addToCart = (productId, quantity) => async (dispatch) => {
  try {
    dispatch({ type: SET_CART_LOADING, payload: true });
    
    const token = await SecureStore.getItemAsync("jwt");
    const userDataStr = await SecureStore.getItemAsync("userData");
    
    if (!token || !userDataStr) {
      throw new Error('Authentication required');
    }

    const userData = JSON.parse(userDataStr);

    const response = await axios.post(
      `${API_URL}/add-to-orderlist`,
      {
        product_id: productId,
        user_id: userData._id,
        quantity
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Add to local state
    dispatch({
      type: ADD_TO_CART,
      payload: response.data.order
    });

    // Refresh entire cart data to ensure sync
    await dispatch(getUserOrderList());

    return { success: true };
  } catch (error) {
    console.error('Add to cart error:', error);
    dispatch({
      type: SET_CART_ERROR,
      payload: error.message || 'Failed to add to cart'
    });
    return { success: false, error: error.message };
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};

export const updateCartQuantity = (orderId, quantity) => async (dispatch) => {
  try {
    dispatch({ type: SET_CART_LOADING, payload: true });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await axios.put(
      `${API_URL}/update-order/${orderId}`,
      { quantity },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    // Dispatch success action with updated order
    dispatch({
      type: UPDATE_CART_QUANTITY,
      payload: response.data.order
    });

    // Refresh the cart to get updated data
    dispatch(getUserOrderList());

  } catch (error) {
    console.error('Error updating quantity:', error);
    dispatch({
      type: SET_CART_ERROR,
      payload: error.response?.data?.message || 'Failed to update quantity'
    });
    Alert.alert('Error', 'Failed to update quantity');
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};

export const fetchCartCount = () => async (dispatch) => {
  try {
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      dispatch({ type: SET_CART_COUNT, payload: 0 });
      return;
    }

    // Get cart count from API
    const response = await axios.get(`${API_URL}/get-orderlist-count`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Cart count response (total quantities):', response.data);

    dispatch({
      type: SET_CART_COUNT,
      payload: response.data.count || 0
    });
  } catch (error) {
    console.error('Failed to fetch cart count:', error);
    dispatch({ type: SET_CART_COUNT, payload: 0 });
  }
};

export const initializeCartCount = () => async (dispatch) => {
  try {
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) return;

    const response = await axios.get(`${API_URL}/get-orderlist-count`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    dispatch({
      type: SET_CART_COUNT,
      payload: response.data.count || 0
    });
  } catch (error) {
    console.error('Failed to initialize cart count:', error);
  }
};

export const fetchOrderCount = () => async (dispatch) => {
  try {
    console.log('Fetching order count...');
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      console.log('No token found for order count');
      dispatch({ type: SET_ORDER_COUNT, payload: 0 });
      return;
    }

    console.log('Using token:', token ? 'Token exists' : 'No token');

    // Make sure to verify user auth first
    const userDataStr = await SecureStore.getItemAsync("userData");
    if (!userDataStr) {
      throw new Error('User data not found');
    }

    const userData = JSON.parse(userDataStr);
    console.log('User data found:', !!userData);

    const response = await axios.get(`${API_URL}/get-orderlist-count`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Order count response:', response.data);

    dispatch({
      type: SET_ORDER_COUNT,
      payload: response.data.count || 0
    });
  } catch (error) {
    console.error('Failed to fetch order count:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    dispatch({ type: SET_ORDER_COUNT, payload: 0 });
  }
};

export const getUserOrderList = () => async (dispatch) => {
  try {
    dispatch({ type: GET_ORDER_LIST_REQUEST });
    
    const token = await SecureStore.getItemAsync("jwt");
    const userDataStr = await SecureStore.getItemAsync("userData");
    
    if (!token || !userDataStr) {
      throw new Error('Authentication required');
    }

    const response = await axios.get(`${API_URL}/user-orderlist`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Update both orderList and cart count
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: response.data.orders || []
    });

    // Update cart count
    const totalQuantity = (response.data.orders || []).reduce((sum, order) => sum + (order.quantity || 0), 0);
    dispatch({ type: SET_CART_COUNT, payload: totalQuantity });

    return response.data.orders;
  } catch (error) {
    console.error('Failed to fetch order list:', error);
    dispatch({
      type: GET_ORDER_LIST_FAIL,
      payload: error.message
    });
    return [];
  }
};

export const clearCartData = () => (dispatch) => {
  try {
    dispatch({ type: 'CLEAR_CART_DATA' });
    dispatch({ type: SET_CART_COUNT, payload: 0 });
  } catch (error) {
    console.error('Error clearing cart data:', error);
  }
};

export const removeFromCart = (orderId) => async (dispatch) => {
  try {
    dispatch({ type: SET_CART_LOADING, payload: true });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) {
      throw new Error('Authentication token not found');
    }

    await axios.delete(`${API_URL}/delete-order/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Remove from local state first
    dispatch({
      type: REMOVE_FROM_CART,
      payload: orderId
    });

    // Refresh entire cart data to ensure sync
    await dispatch(getUserOrderList());

  } catch (error) {
    console.error('Error removing item:', error);
    dispatch({
      type: SET_CART_ERROR,
      payload: error.response?.data?.message || 'Failed to remove item'
    });
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};
