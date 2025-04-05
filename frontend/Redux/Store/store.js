import { createStore, combineReducers, applyMiddleware } from "redux";
import { thunk } from "redux-thunk";

// Import reducers
import { cartReducer } from '../Reducers/cartReducers';
import { 
    productListReducer, 
    productReviewsReducer,
    productCreateReducer,
    productUpdateReducer,
    productDeleteReducer 
} from '../Reducers/productReducers';
import { orderReducer } from '../Reducers/orderReducers';
import authReducer from '../Reducers/Auth.reducer';

// Combine reducers
const rootReducer = combineReducers({
    // Auth feature
    auth: authReducer,

    // Cart features
    cart: cartReducer,

    // Product features
    productList: productListReducer,
    productReviews: productReviewsReducer,
    productCreate: productCreateReducer,
    productUpdate: productUpdateReducer,
    productDelete: productDeleteReducer,

    // Order features
    order: orderReducer
});

// Custom middleware for logging
const logger = store => next => action => {
    console.log('📦 Dispatching:', action.type);
    const result = next(action);
    console.log('🔄 Updated State:', store.getState());
    return result;
};

// Create store with middleware
const store = createStore(
    rootReducer,
    applyMiddleware(thunk, logger)
);

export default store;