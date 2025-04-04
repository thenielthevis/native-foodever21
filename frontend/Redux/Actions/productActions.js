import axios from 'axios';
import { 
  PRODUCT_LIST_REQUEST,
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
  PRODUCT_DELETE_FAIL
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