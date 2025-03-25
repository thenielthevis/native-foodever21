import { 
  PRODUCT_LIST_REQUEST, 
  PRODUCT_LIST_SUCCESS, 
  PRODUCT_LIST_FAIL,
  PRODUCT_REVIEWS_REQUEST,
  PRODUCT_REVIEWS_SUCCESS,
  PRODUCT_REVIEWS_FAIL 
} from '../Constants/productConstants';

// Reducer for product list
export const productListReducer = (state = { products: [] }, action) => {
  switch (action.type) {
    case PRODUCT_LIST_REQUEST:
      return { loading: true, products: [] };
    case PRODUCT_LIST_SUCCESS:
      return { loading: false, products: action.payload };
    case PRODUCT_LIST_FAIL:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};

// Reducer for product reviews
export const productReviewsReducer = (state = { reviews: [] }, action) => {
  switch (action.type) {
    case PRODUCT_REVIEWS_REQUEST:
      return { loading: true, reviews: [] };
    case PRODUCT_REVIEWS_SUCCESS:
      return { loading: false, reviews: action.payload };
    case PRODUCT_REVIEWS_FAIL:
      return { loading: false, error: action.payload };
    default:
      return state;
  }
};
