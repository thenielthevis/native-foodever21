import { SET_CURRENT_USER } from "../Actions/Auth.actions"
import isEmpty from "../../assets/common/is-empty"

const initialState = {
    isAuthenticated: false,
    user: {},
    userProfile: null,
    allUsers: [], // Initialize empty array
    loading: false,
    error: null
};

export default function (state = initialState, action) {
    console.log('Auth Reducer - Action:', action.type, action.payload);
    
    switch (action.type) {
        case SET_CURRENT_USER: 
            return {
                ...state,
                isAuthenticated: !isEmpty(action.payload),
                user: action.payload,
                userProfile: action.userProfile,
                loading: false,
                error: null
            };
        // Add a case for Google sign-in loading state
        case "GOOGLE_SIGNIN_LOADING":
            return {
                ...state,
                loading: true,
                error: null
            };
        case "GET_USERS_REQUEST":
            return {
                ...state,
                loading: true,
                error: null  // Clear any previous errors
            };
        case "GET_USERS_SUCCESS":
            console.log('Users fetched successfully:', action.payload?.length || 0);
            return {
                ...state,
                loading: false,
                allUsers: action.payload || [],
                error: null
            };
        case "GET_USERS_FAIL":
            console.error('Failed to fetch users:', action.payload);
            return {
                ...state,
                loading: false,
                error: action.payload,
                allUsers: [] // Reset to empty array on error
            };
        default:
            return state;
    }
}