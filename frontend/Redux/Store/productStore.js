import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { productListReducer, productReviewsReducer } from '../Reducers/productReducers';

const rootReducer = combineReducers({
  productList: productListReducer,
  productReviews: productReviewsReducer
});

const middleware = [thunk];

const store = createStore(rootReducer, applyMiddleware(...middleware));

export default store;
