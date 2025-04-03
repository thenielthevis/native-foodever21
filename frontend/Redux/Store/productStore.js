import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import {
  productListReducer,
  productReviewsReducer,
  productCreateReducer,
  productUpdateReducer,
  productDeleteReducer
} from '../Reducers/productReducers';

// Create a product-focused store that only handles product actions
const productReducer = combineReducers({
  productList: productListReducer,
  productReviews: productReviewsReducer,
  productCreate: productCreateReducer,
  productUpdate: productUpdateReducer,
  productDelete: productDeleteReducer
});

const middleware = [thunk];

// Dedicated store for product-related state only
const productStore = createStore(
  productReducer,
  applyMiddleware(...middleware)
);

export default productStore;