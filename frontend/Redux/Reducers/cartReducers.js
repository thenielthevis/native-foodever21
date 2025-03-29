import {
  ADD_TO_CART,
  UPDATE_CART_QUANTITY,
  REMOVE_FROM_CART,
  CLEAR_CART,
  SET_CART_LOADING,
  SET_CART_ERROR,
  SET_CART_COUNT,
  SET_ORDER_COUNT,
  GET_ORDER_LIST_REQUEST,
  GET_ORDER_LIST_SUCCESS,
  GET_ORDER_LIST_FAIL
} from '../Constants/cartConstants'

const initialState = {
  cartItems: [],
  loading: false,
  error: null,
  cartCount: 0,
  orderCount: 0,
  orderList: [],
  selectedOrders: []
}

export const cartReducer = (state = initialState, action) => {
  switch (action.type) {
    case ADD_TO_CART:
      return {
        ...state,
        cartItems: [...state.cartItems, action.payload]
      }
    case UPDATE_CART_QUANTITY:
      return {
        ...state,
        cartItems: state.cartItems.map(item =>
          item._id === action.payload.orderId
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      }
    case REMOVE_FROM_CART:
      return {
        ...state,
        orderList: state.orderList.filter(item => item.order_id !== action.payload)
      }
    case SET_CART_LOADING:
      return {
        ...state,
        loading: action.payload
      }
    case SET_CART_ERROR:
      return {
        ...state,
        error: action.payload
      }
    case SET_CART_COUNT:
      console.log('Setting cart count:', action.payload);
      return {
        ...state,
        cartCount: action.payload
      }
    case SET_ORDER_COUNT:
    //   console.log('Reducer - Updating orderCount:', action.payload);
      return {
        ...state,
        orderCount: action.payload
      }
    case GET_ORDER_LIST_REQUEST:
      return { ...state, loading: true }
    case GET_ORDER_LIST_SUCCESS:
      return { ...state, loading: false, orderList: action.payload }
    case GET_ORDER_LIST_FAIL:
      return { ...state, loading: false, error: action.payload }
    case 'SET_SELECTED_ORDERS':
      // For direct ordering or cart selection
      return {
        ...state,
        selectedOrders: action.payload
      }
    case 'CLEAR_SELECTED_ORDERS':
      return {
        ...state,
        selectedOrders: []
      }
    case 'CLEAR_CART_DATA':
      return {
        ...initialState
      }
    default:
      return state
  }
}
