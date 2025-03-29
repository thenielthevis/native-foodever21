import { createStore } from 'redux';
import { orderReducer } from '../Reducers/orderReducers';

const initialState = {
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

const orderStore = createStore(orderReducer, initialState);

export default orderStore;
