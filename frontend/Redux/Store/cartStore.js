import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { cartReducer } from '../Reducers/cartReducers';
import { productListReducer } from '../Reducers/productReducers';
import { productReviewsReducer } from '../Reducers/productReviewsReducer';
import { orderReducer } from '../Reducers/orderReducers';

const initialState = {
  cart: {
    cartItems: [],
    loading: false,
    error: null,
    cartCount: 0,
    orderCount: 0,
    orderList: []
  },
  productList: { loading: false, products: [] },
  productReviews: { loading: false, reviews: [], error: null },
  order: {
    loading: false,
    error: null,
    selectedItems: [],
    paymentMethod: null,
    orders: [],
    currentOrder: null,
    taxRate: 0.12
  }
};

const rootReducer = combineReducers({
  cart: cartReducer,
  productList: productListReducer,
  productReviews: productReviewsReducer,
  order: orderReducer
});

// Add more detailed logging middleware
const loggerMiddleware = store => next => action => {
  console.log('Dispatching action:', {
    type: action.type,
    payload: action.payload,
    state: store.getState()
  });
  const result = next(action);
//   console.log('New state:', store.getState());
  return result;
};

const store = createStore(
  rootReducer,
  initialState,
  applyMiddleware(thunk, loggerMiddleware)
);

// Add debugging
store.subscribe(() => {
  const state = store.getState();
//   console.log('Store Updated - Full State:', state);
//   console.log('Store Updated - Cart State:', {
//     cartCount: state.cart?.cartCount,
//     orderCount: state.cart?.orderCount
//   });
});

export default store;
