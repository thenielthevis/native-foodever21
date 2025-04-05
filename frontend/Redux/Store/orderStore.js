import { createStore } from 'redux';
import { orderReducer } from '../Reducers/orderReducers';

const initialState = {
  loading: false,
  error: null,
  selectedItems: [],
  paymentMethod: null,
  orders: [],
  userOrders: {
    orders: [],
    loading: false,
    error: null
  },
  currentOrder: null,
  taxRate: 0.12
};

const orderStore = createStore(orderReducer, initialState);

export default orderStore;
