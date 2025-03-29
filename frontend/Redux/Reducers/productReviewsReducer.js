const initialState = {
  loading: false,
  error: null,
  reviews: []
};

export const productReviewsReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'FETCH_REVIEWS_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_REVIEWS_SUCCESS':
      return { ...state, loading: false, reviews: action.payload };
    case 'FETCH_REVIEWS_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};
