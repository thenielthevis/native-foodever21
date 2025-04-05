import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { PRODUCT_LIST_REQUEST,
        PRODUCT_LIST_SUCCESS,
        PRODUCT_LIST_FAIL,
        PRODUCT_REVIEWS_REQUEST,
        PRODUCT_REVIEWS_SUCCESS,
        PRODUCT_REVIEWS_FAIL,
        PRODUCT_CREATE_REQUEST,
        PRODUCT_CREATE_SUCCESS,
        PRODUCT_CREATE_FAIL,
        PRODUCT_UPDATE_REQUEST,
        PRODUCT_UPDATE_SUCCESS,
        PRODUCT_UPDATE_FAIL,
        PRODUCT_DELETE_REQUEST,
        PRODUCT_DELETE_SUCCESS,
        PRODUCT_DELETE_FAIL,
        USER_REVIEW_REQUEST,
        USER_REVIEW_SUCCESS,
        USER_REVIEW_FAIL,
        USER_REVIEW_RESET
} from '../Constants/productConstants';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';

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

    const token = await SecureStore.getItemAsync('jwt');
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      }
    };

    // Get reviews with user details
    const { data } = await axios.get(`${API_URL}/product/${productId}/reviews`, config);
    console.log('Reviews data received:', data); // Debug log

    if (data.success) {
      // Ensure each review has the required fields
      const processedReviews = data.reviews.map(review => ({
        ...review,
        avatarURL: review.avatarURL || null,
        name: review.name || review.username || 'Anonymous User',
        rating: review.rating || 0,
        createdAt: review.createdAt || new Date(),
        comment: review.comment || ''
      }));

      console.log('Processed reviews:', processedReviews); // Debug log

      dispatch({
        type: PRODUCT_REVIEWS_SUCCESS,
        payload: processedReviews
      });
    } else {
      throw new Error(data.message || 'Failed to fetch reviews');
    }
  } catch (error) {
    console.error('Error fetching reviews:', error);
    dispatch({
      type: PRODUCT_REVIEWS_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Create review action
export const createProductReview = (productId, review) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_REVIEWS_REQUEST });

    const token = await SecureStore.getItemAsync('jwt');
    console.log('Token for review:', token ? 'Token exists' : 'No token found');

    if (!token) {
      throw new Error('Please login to write a review');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    console.log('Sending review request with data:', { productId, review });
    const { data } = await axios.post(
      `${API_URL}/product/${productId}/review`,
      review,
      config
    );

    if (data.success) {
      dispatch({
        type: PRODUCT_REVIEWS_SUCCESS,
        payload: data.reviews
      });
      return data;
    } else {
      throw new Error(data.message || 'Failed to create review');
    }
  } catch (error) {
    console.error('Review creation error:', error);
    dispatch({
      type: PRODUCT_REVIEWS_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

// Create product action
export const createProduct = (productData) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_CREATE_REQUEST });
    console.log('Creating new product:', productData.name);

    const formData = new FormData();
   
    // Add product details to formData
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('price', productData.price);
    formData.append('category', productData.category);
    formData.append('status', productData.status);
    formData.append('discount', productData.discount);

    // Add images to formData
    if (productData.images && productData.images.length > 0) {
      console.log(`Processing ${productData.images.length} images`);
     
      for (let i = 0; i < productData.images.length; i++) {
        // Create file from uri
        const uri = productData.images[i].url;
        const filename = uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
       
        console.log(`Adding image ${i+1}: ${filename}`);
        formData.append('images', {
          uri,
          name: filename,
          type
        });
      }
    } else {
      console.log('No images provided for new product');
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true
    };

    console.log('Sending create product request');
    const { data } = await axios.post(`${API_URL}/admin/product/create`, formData, config);
    console.log('Product created successfully:', data.product.name);

    dispatch({
      type: PRODUCT_CREATE_SUCCESS,
      payload: data.product
    });
  } catch (error) {
    console.error('Error creating product:', error.response?.data || error.message);
    dispatch({
      type: PRODUCT_CREATE_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Update review action
export const updateProductReview = (productId, reviewId, reviewData) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_REVIEWS_REQUEST });

    const token = await SecureStore.getItemAsync('jwt');
    if (!token) {
      throw new Error('Please login to edit a review');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    console.log('Sending review update with data:', { productId, reviewId, reviewData });
    const { data } = await axios.put(
      `${API_URL}/product/${productId}/review/${reviewId}`,
      reviewData,
      config
    );

    if (data.success) {
      // Refresh reviews after updating
      const updatedReviews = await axios.get(
        `${API_URL}/product/${productId}/reviews`,
        config
      );

      dispatch({
        type: PRODUCT_REVIEWS_SUCCESS,
        payload: updatedReviews.data.reviews
      });
    } else {
      throw new Error(data.message || 'Failed to update review');
    }
  } catch (error) {
    console.error('Review update error:', error);
    dispatch({
      type: PRODUCT_REVIEWS_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

// Delete review action
export const deleteProductReview = (productId, reviewId) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_REVIEWS_REQUEST });

    const token = await SecureStore.getItemAsync('jwt');
    if (!token) {
      throw new Error('Please login to delete a review');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    console.log('Deleting review:', { productId, reviewId });
    const { data } = await axios.delete(
      `${API_URL}/product/${productId}/review/${reviewId}`,
      config
    );

    if (data.success) {
      // Refresh reviews after deletion
      const updatedReviews = await axios.get(
        `${API_URL}/product/${productId}/reviews`,
        config
      );

      dispatch({
        type: PRODUCT_REVIEWS_SUCCESS,
        payload: updatedReviews.data.reviews
      });
    } else {
      throw new Error(data.message || 'Failed to delete review');
    }
  } catch (error) {
    console.error('Review deletion error:', error);
    dispatch({
      type: PRODUCT_REVIEWS_FAIL,
      payload: error.response?.data?.message || error.message
    });
    throw error;
  }
};

// Get user's review for specific product
export const getUserProductReview = (productId) => async (dispatch) => {
  try {
    dispatch({ type: USER_REVIEW_REQUEST });

    const token = await SecureStore.getItemAsync('jwt');
    if (!token) {
      dispatch({ type: USER_REVIEW_SUCCESS, payload: null });
      return null;
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    };

    const { data } = await axios.get(
      `${API_URL}/product/${productId}/my-review`,
      config
    );

    if (data.success) {
      dispatch({
        type: USER_REVIEW_SUCCESS,
        payload: data.review
      });
      return data.review;
    } else if (data.canReview && data.isNewReview) {
      // User can create a new review but doesn't have one yet
      dispatch({
        type: USER_REVIEW_SUCCESS,
        payload: null
      });
      return null;
    } else {
      throw new Error(data.message || 'Failed to fetch user review');
    }
  } catch (error) {
    // If 404 (no review found), just set userReview to null
    if (error.response && error.response.status === 404) {
      dispatch({
        type: USER_REVIEW_SUCCESS,
        payload: null
      });
      return null;
    } else {
      console.error('Error fetching user review:', error);
      dispatch({
        type: USER_REVIEW_FAIL,
        payload: error.response?.data?.message || error.message
      });
      throw error;
    }
  }
};

// Update product action
export const updateProduct = (id, productData) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_UPDATE_REQUEST });
    console.log(`Updating product ID: ${id}`);

    const formData = new FormData();
   
    // Add product details to formData - ensure all are strings and properly formatted
    formData.append('name', productData.name);
    formData.append('description', productData.description);
    formData.append('price', productData.price.toString());
    formData.append('category', productData.category);
    formData.append('status', productData.status);
    formData.append('discount', productData.discount.toString());

    // Debug what we're sending
    Object.keys(productData).forEach(key => {
      if (key !== 'images') {
        console.log(`Field ${key}:`, productData[key]);
      }
    });

    // Add images to formData if they exist
    if (productData.images && productData.images.length > 0) {
      // Track if we need to upload new images
      let hasNewImages = false;
     
      console.log(`Processing ${productData.images.length} images`);
     
      for (let i = 0; i < productData.images.length; i++) {
        const image = productData.images[i];
       
        // Check if this is a new image (local URI) that needs uploading
        if (image.url && !image.url.startsWith('http')) {
          hasNewImages = true;
         
          const uri = image.url;
          const filename = uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image';
         
          console.log(`Adding new image for upload: ${filename}`);
          formData.append('images', {
            uri,
            name: filename,
            type
          });
        }
      }
     
      // If no new images, pass the existing image data as JSON
      if (!hasNewImages && productData.images.length > 0) {
        console.log('Using existing images:', productData.images.map(img => img.public_id));
        formData.append('existingImages', JSON.stringify(productData.images));
      }
    } else {
      console.log('No images provided');
    }

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true
    };

    console.log('Sending update request to server');
    const { data } = await axios.put(`${API_URL}/admin/product/update/${id}`, formData, config);
   
    if (data.success) {
      console.log('Update successful, received product data:', {
        id: data.product._id,
        name: data.product.name,
        description: data.product.description
      });
     
      dispatch({
        type: PRODUCT_UPDATE_SUCCESS,
        payload: data.product
      });
    } else {
      throw new Error(data.message || 'Update failed');
    }
  } catch (error) {
    console.error('Error updating product:', error.response?.data || error.message);
    dispatch({
      type: PRODUCT_UPDATE_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Delete product action
export const deleteProduct = (id) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_DELETE_REQUEST });

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    };

    await axios.delete(`${API_URL}/admin/product/delete/${id}`, config);

    dispatch({
      type: PRODUCT_DELETE_SUCCESS
    });
  } catch (error) {
    dispatch({
      type: PRODUCT_DELETE_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};

// Delete multiple products action
export const deleteBulkProducts = (ids) => async (dispatch) => {
  try {
    dispatch({ type: PRODUCT_DELETE_REQUEST });

    const config = {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    };

    await axios.post(`${API_URL}/admin/products/deletebulk`, { ids }, config);

    dispatch({
      type: PRODUCT_DELETE_SUCCESS
    });
  } catch (error) {
    dispatch({
      type: PRODUCT_DELETE_FAIL,
      payload: error.response?.data?.message || error.message
    });
  }
};