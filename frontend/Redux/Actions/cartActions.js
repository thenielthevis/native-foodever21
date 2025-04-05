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
import { initDatabase, saveCartItem, getCartItems, clearCartItems, getCartTotalCount, updateCartItemQuantity, deleteCartItem } from '../../services/database';

export const addToCart = (product, quantity) => async (dispatch) => {
  try {
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) throw new Error('User not authenticated');
    
    const { firebaseUid } = JSON.parse(userData);
    await initDatabase();
    await saveCartItem(firebaseUid, product, quantity);
    
    // Immediately get and update cart count
    const newCount = await getCartTotalCount(firebaseUid);
    console.log('New cart count after add:', newCount);
    
    dispatch({ 
      type: 'UPDATE_CART_COUNT',
      payload: newCount
    });

    // Also update cart items list
    const cartItems = await getCartItems(firebaseUid);
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: cartItems.map(item => ({
        order_id: `order_${item.product_id}`,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image
        },
        quantity: item.quantity
      }))
    });
    
    return { success: true };
  } catch (error) {
    console.error('Add to cart error:', error);
    return { success: false, error: error.message };
  }
};

export const updateCartQuantity = (orderId, quantity) => async (dispatch) => {
  try {
    dispatch({ type: SET_CART_LOADING, payload: true });
    
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) throw new Error('User not authenticated');
    const { firebaseUid } = JSON.parse(userData);
    
    await initDatabase();
    const productId = orderId.split('_')[1] || orderId;
    await updateCartItemQuantity(firebaseUid, productId, quantity);
    
    // Fetch updated items with user ID
    const cartItems = await getCartItems(firebaseUid);
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: cartItems.map(item => ({
        order_id: `order_${item.product_id}`,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image
        },
        quantity: item.quantity
      }))
    });

    // Update cart count with user ID
    const count = await getCartTotalCount(firebaseUid);
    dispatch({ type: SET_CART_COUNT, payload: count });
  } catch (error) {
    console.error('Error updating quantity:', error);
    dispatch({
      type: SET_CART_ERROR,
      payload: 'Failed to update quantity'
    });
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};

export const fetchCartCount = () => async (dispatch) => {
  try {
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) return;
    
    const { firebaseUid } = JSON.parse(userData);
    await initDatabase();
    const count = await getCartTotalCount(firebaseUid);
    
    dispatch({ 
      type: SET_CART_COUNT, 
      payload: count || 0 
    });
  } catch (error) {
    console.error('Failed to fetch cart count:', error);
    dispatch({ type: SET_CART_COUNT, payload: 0 });
  }
};

export const fetchOrderCount = () => async (dispatch) => {
  try {
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) return;
    
    const { firebaseUid } = JSON.parse(userData);
    
    // Make sure to await database initialization
    await initDatabase();
    const count = await getCartTotalCount(firebaseUid);
    // console.log('Current cart count:', count);
    
    dispatch({
      type: 'UPDATE_CART_COUNT',
      payload: count
    });
  } catch (error) {
    console.error('Error fetching cart count:', error);
    dispatch({
      type: 'UPDATE_CART_COUNT',
      payload: 0
    });
  }
};

export const getUserOrderList = () => async (dispatch) => {
  try {
    dispatch({ type: GET_ORDER_LIST_REQUEST });
    
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) {
      throw new Error('User not authenticated');
    }
    const { firebaseUid } = JSON.parse(userData);
    
    await initDatabase();
    const cartItems = await getCartItems(firebaseUid);
    
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: cartItems.map(item => ({
        order_id: `order_${item.product_id}`,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image
        },
        quantity: item.quantity
      }))
    });

    return cartItems;
  } catch (error) {
    console.error('Failed to fetch cart items:', error);
    dispatch({ type: GET_ORDER_LIST_FAIL, payload: error.message });
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
    
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) throw new Error('User not authenticated');
    const { firebaseUid } = JSON.parse(userData);
    
    await initDatabase();
    const productId = orderId.split('_')[1] || orderId;
    await deleteCartItem(firebaseUid, productId);

    dispatch({ type: REMOVE_FROM_CART, payload: orderId });

    // Fetch updated items with user ID
    const cartItems = await getCartItems(firebaseUid);
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: cartItems.map(item => ({
        order_id: `order_${item.product_id}`,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image
        },
        quantity: item.quantity
      }))
    });

    // Update cart count with user ID
    const count = await getCartTotalCount(firebaseUid);
    dispatch({ type: SET_CART_COUNT, payload: count });
  } catch (error) {
    console.error('Error removing item:', error);
    dispatch({
      type: SET_CART_ERROR,
      payload: 'Failed to remove item'
    });
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};

export const clearSelectedItems = (selectedOrders) => async (dispatch) => {
  try {
    dispatch({ type: SET_CART_LOADING, payload: true });
    
    const userData = await SecureStore.getItemAsync('userData');
    if (!userData) throw new Error('User not authenticated');
    const { firebaseUid } = JSON.parse(userData);
    
    await initDatabase();
    
    // Delete each selected item from SQLite
    for (const order of selectedOrders) {
      await deleteCartItem(firebaseUid, order.product.id);
    }
    
    // Refresh cart items with user ID
    const cartItems = await getCartItems(firebaseUid);
    dispatch({
      type: GET_ORDER_LIST_SUCCESS,
      payload: cartItems.map(item => ({
        order_id: `order_${item.product_id}`,
        product: {
          id: item.product_id,
          name: item.product_name,
          price: item.product_price,
          image: item.product_image
        },
        quantity: item.quantity
      }))
    });

    // Update cart count
    const count = await getCartTotalCount(firebaseUid);
    dispatch({ type: SET_CART_COUNT, payload: count });

  } catch (error) {
    console.error('Error clearing selected items:', error);
    dispatch({ type: SET_CART_ERROR, payload: error.message });
  } finally {
    dispatch({ type: SET_CART_LOADING, payload: false });
  }
};
