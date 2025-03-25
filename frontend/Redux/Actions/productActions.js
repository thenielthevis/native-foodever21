import axios from 'axios';
import { PRODUCT_LIST_REQUEST, 
        PRODUCT_LIST_SUCCESS, 
        PRODUCT_LIST_FAIL, 
        PRODUCT_REVIEWS_REQUEST, 
        PRODUCT_REVIEWS_SUCCESS, 
        PRODUCT_REVIEWS_FAIL 
} from '../Constants/productConstants';
import { API_URL } from '@env';

export const listProducts = () => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_LIST_REQUEST });
    
    console.log('Fetching products from:', `${API_URL}/products`);
    const { data } = await axios.get(`${API_URL}/products`, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    });
    console.log('Products received:', data.products);

    // Transform the data to ensure image URLs are correct
    const transformedProducts = data.products.map(product => ({
      ...product,
      image: product.images && product.images.length > 0 ? product.images[0].url : null
    }));

    dispatch({ 
      type: PRODUCT_LIST_SUCCESS,
      payload: transformedProducts 
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    dispatch({
      type: PRODUCT_LIST_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

export const fetchProductReviews = (productId) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_REVIEWS_REQUEST });

    const { data } = await axios.get(`${API_URL}/product/${productId}/reviews`);

    if (data.success) {
      dispatch({
        type: PRODUCT_REVIEWS_SUCCESS,
        payload: data.reviews
      });
    } else {
      throw new Error('Failed to fetch reviews');
    }
  } catch (error) {
    dispatch({
      type: PRODUCT_REVIEWS_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};