import {
  PRODUCT_REVIEWS_REQUEST,
  PRODUCT_REVIEWS_SUCCESS,
  PRODUCT_REVIEWS_FAIL,
  USER_REVIEW_REQUEST,
  USER_REVIEW_SUCCESS,
  USER_REVIEW_FAIL,
  USER_REVIEW_RESET
} from '../Constants/productConstants';

const initialState = {
  loading: false,
  error: null,
  reviews: [],
  userReview: null
};

export const productReviewsReducer = (state = initialState, action) => {
  switch (action.type) {
    case PRODUCT_REVIEWS_REQUEST:
    case USER_REVIEW_REQUEST:
      return { ...state, loading: true, error: null };
    
    case PRODUCT_REVIEWS_SUCCESS:
      return { 
        ...state, 
        loading: false, 
        reviews: action.payload,
        error: null 
      };
    
    case USER_REVIEW_SUCCESS:
      return {
        ...state,
        loading: false,
        userReview: action.payload,
        error: null
      };
    
    case PRODUCT_REVIEWS_FAIL:
    case USER_REVIEW_FAIL:
      return { 
        ...state, 
        loading: false, 
        error: action.payload
      };
    
    case USER_REVIEW_RESET:
      return {
        ...state,
        userReview: null
      };
      
    default:
      return state;
  }
};
