import {
  CREATE_ORDER_REQUEST,
  CREATE_ORDER_SUCCESS,
  CREATE_ORDER_FAIL,
  GET_USER_ORDERS_REQUEST,
  GET_USER_ORDERS_SUCCESS,
  GET_USER_ORDERS_FAIL,
  SET_SELECTED_ITEMS,
  SET_PAYMENT_METHOD,
  CLEAR_ORDER_STATE
} from '../Constants/orderConstants';

const initialState = {
  loading: false,
  error: null,
  selectedItems: [],
  paymentMethod: null,
  orders: [],
  currentOrder: null,
  taxRate: 0.12 // 12% tax rate
};

export const orderReducer = (state = initialState, action) => {
  try {
    console.log('orderReducer - Received action:', action);
    
    if (!action?.type) {
      console.error('orderReducer - Invalid action:', action);
      return state;
    }

    switch (action.type) {
      case CREATE_ORDER_REQUEST:
        return { ...state, loading: true };
      case CREATE_ORDER_SUCCESS:
        return {
          ...state,
          loading: false,
          currentOrder: action.payload,
          error: null
        };
      case CREATE_ORDER_FAIL:
        return { ...state, loading: false, error: action.payload };
      case GET_USER_ORDERS_REQUEST:
        return { ...state, loading: true };
      case GET_USER_ORDERS_SUCCESS:
        return { ...state, loading: false, orders: action.payload };
      case GET_USER_ORDERS_FAIL:
        return { ...state, loading: false, error: action.payload };
      case SET_SELECTED_ITEMS:
        console.log('orderReducer - Processing SET_SELECTED_ITEMS:', {
          payload: action.payload,
          isArray: Array.isArray(action.payload),
          length: action.payload?.length
        });
        
        if (!Array.isArray(action.payload)) {
          console.error('orderReducer - Invalid payload format:', action.payload);
          return state;
        }
        
        return {
          ...state,
          selectedItems: action.payload,
          error: null
        };
      case SET_PAYMENT_METHOD:
        return { ...state, paymentMethod: action.payload };
      case CLEAR_ORDER_STATE:
        return { ...initialState };
      default:
        return state;
    }
  } catch (error) {
    console.error('orderReducer - Error:', error);
    return {
      ...state,
      error: error.message
    };
  }
};
