import jwtDecode from "jwt-decode"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as SecureStore from 'expo-secure-store'; // Add SecureStore import
import { auth } from "../../firebaseConfig"
import axios from 'axios';
// Fix the import path to use the correct relative path
import { API_URL } from '@env';
import { updateProfile } from 'firebase/auth';

// Use optional import for Toast to prevent crashes if the module is missing
let Toast;
try {
  Toast = require("react-native-toast-message").default;
} catch (error) {
  // Create a mock Toast object for environments where the module is not available
  Toast = {
    show: (options) => console.log("Toast message:", options.text1),
  };
}

export const SET_CURRENT_USER = "SET_CURRENT_USER";
export const GET_ALL_USERS = "GET_ALL_USERS";

// Constants for secure storage
const JWT_TOKEN_KEY = 'foodever21_jwt_token';

// Helper function to save JWT token securely
const saveToken = async (token) => {
  try {
    await SecureStore.setItemAsync(JWT_TOKEN_KEY, token);
    console.log('Token saved securely:', token);
    return true;
  } catch (error) {
    console.error('Error saving token to SecureStore:', error);
    // Fallback to AsyncStorage if SecureStore fails
    try {
      await AsyncStorage.setItem("jwt", token);
      console.log('Token saved to AsyncStorage as fallback');
      return true;
    } catch (asyncError) {
      console.error('Failed to save token in fallback storage:', asyncError);
      return false;
    }
  }
};

// Helper function to get JWT token
const getToken = async () => {
  try {
    // Try to get from SecureStore first
    const token = await SecureStore.getItemAsync(JWT_TOKEN_KEY);
    if (token) {
      return token;
    }
   
    // If not in SecureStore, check AsyncStorage (for backward compatibility)
    const asyncToken = await AsyncStorage.getItem("jwt");
    if (asyncToken) {
      // If found in AsyncStorage, migrate it to SecureStore
      await saveToken(asyncToken);
      // Remove from AsyncStorage after migration
      await AsyncStorage.removeItem("jwt");
      return asyncToken;
    }
   
    return null;
  } catch (error) {
    console.error('Error retrieving token:', error);
    return null;
  }
};


// Helper function to remove JWT token
const removeToken = async () => {
  try {
    // Remove from both storages to ensure it's completely gone
    await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
    await AsyncStorage.removeItem("jwt");
    return true;
  } catch (error) {
    console.error('Error removing token:', error);
    return false;
  }
};


export const registerPushNotificationToken = async (token) => {
  try {
    // Get the current Firebase user
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { error: true, message: 'Not authenticated' };
    }
   
    // Get a fresh token
    const authToken = await firebaseUser.getIdToken(true);
   
    // Send FCM token to backend
    const response = await axios.post(
      `${API_URL}auth/update-fcm-token`,
      { fcmToken: token },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
   
    console.log('FCM token registered successfully');
    return response.data;
  } catch (error) {
    // console.log('Error registering FCM token');
    return {
      error: true,
      message: error.response?.data?.message || error.message || 'Failed to register notification token'
    };
  }
};

// Add this function to remove the token when logging out
export const unregisterPushNotificationToken = async () => {
  try {
    // Get the current Firebase user
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { success: true, message: 'Already logged out' };
    }
   
    // Get a fresh token
    const authToken = await firebaseUser.getIdToken(true);
   
    // Remove FCM token from backend
    const response = await axios.delete(
      `${API_URL}auth/remove-fcm-token`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
   
    console.log('FCM token unregistered successfully');
    return response.data;
  } catch (error) {
    console.error('Error unregistering FCM token:', error);
    return { error: true, message: 'Failed to unregister notification token' };
  }
};


// Helper function to handle API errors
const handleApiError = (error, customMessage = 'An error occurred') => {
  console.error('API Error:', error);
 
  let errorMessage = customMessage;
 
  if (error.response) {
    console.error('Error data:', error.response.data);
    console.error('Error status:', error.response.status);
    errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
  } else if (error.request) {
    console.error('Error request:', error.request);
    errorMessage = 'No response from server. Please check your internet connection.';
  }
 
  return { error: true, message: errorMessage };
};

// Function to log in with backend
const loginUserWithBackend = async (firebaseUser) => {
  try {
    console.log('Logging in with backend for user:', firebaseUser.uid);
   
    // Get a fresh Firebase token with force refresh
    const token = await firebaseUser.getIdToken(true);
   
    // Store token securely
    await saveToken(token);
   
    const userData = {
      email: firebaseUser.email,
      firebaseUid: firebaseUser.uid,
      displayName: firebaseUser.displayName || '',
    };
   
    // First check if user exists by directly attempting to get user data
    try {
      const meResponse = await axios.get(`${API_URL}auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
     
      return meResponse.data;
    } catch (userCheckError) {
      // User doesn't exist or token issue, try registration
      try {
        const registerResponse = await registerUserWithBackend({
          username: firebaseUser.displayName || 'User',
          email: firebaseUser.email,
          firebaseUid: firebaseUser.uid
        });
       
        // After successful registration, try to get user data again
        const afterRegisterResponse = await axios.get(`${API_URL}auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
       
        return afterRegisterResponse.data;
      } catch (registrationError) {
        // If registration fails, try login as a last resort
        const loginResponse = await axios.post(`${API_URL}auth/login`, userData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
       
        return loginResponse.data;
      }
    }
  } catch (error) {
    console.error('Backend login failed!', error.message);
    return {
      error: true,
      message: error.message || 'Failed to login with backend',
      firebaseUser: {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName
      }
    };
  }
};


// Function to register user with backend
const registerUserWithBackend = async (userData) => {
  try {
    const completeUserData = {
      username: userData.username || 'User',
      email: userData.email,
      firebaseUid: userData.firebaseUid,
      ...(userData.password && { password: userData.password }),
      ...(userData.userImage && { userImage: userData.userImage }),
    };
   
    // Get the Firebase token for authorization
    const user = auth.currentUser;
    let token;
   
    try {
      token = user ? await user.getIdToken(true) : null;
    } catch (tokenError) {
      console.error('Error getting Firebase token:', tokenError);
    }
   
    const response = await axios.post(`${API_URL}auth/signup`, completeUserData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      timeout: 15000
    });
   
    // If successful, store user data in AsyncStorage for offline access
    if (response.data && (response.data.user || response.data.uid)) {
      try {
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user || {}));
      } catch (storageError) {
        console.error('Error storing user data:', storageError);
      }
    }
   
    return response.data;
  } catch (error) {
    // If the user likely exists (409 Conflict or specific message from server)
    if (
      (error.response && error.response.status === 409) ||
      (error.response && error.response.data && error.response.data.message &&
       error.response.data.message.includes('already exists'))
    ) {
      return { success: true, message: 'User already exists' };
    }
   
    return handleApiError(error, 'Failed to register user with backend');
  }
};


// Function to get current user data
const getCurrentUser = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            return { error: true, message: 'Not authenticated' };
        }


        // Get a fresh token
        const token = await user.getIdToken(true);
        await saveToken(token);


        try {
            const response = await axios.get(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });


            if (response.data.success) {
                return response.data;
            } else {
                throw new Error(response.data.message || 'Failed to get user data');
            }
        } catch (error) {
            if (error.response?.status === 401) {
                // Token expired, try to get a new one
                const newToken = await user.getIdToken(true);
                await saveToken(newToken);
               
                // Retry with new token
                const retryResponse = await axios.get(`${API_URL}/auth/me`, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
               
                return retryResponse.data;
            }
            throw error;
        }
    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        return { error: true, message: error.message };
    }
};


// Main login function
export const loginUser = async (user, dispatch) => {
    try {
        // First, authenticate with Firebase
        const userCredential = await auth.signInWithEmailAndPassword(user.email, user.password);
        const firebaseUser = userCredential.user;
       
        // Use the internal function to login with backend
        const userData = await loginUserWithBackend(firebaseUser);
       
        if (userData.error) {
            throw new Error(userData.message || "Login failed");
        }
       
        // Check if the user account is inactive - improved check covering all cases
        const userStatus = userData.user?.status || userData.status;
        if (userStatus === 'inactive') {
            console.log('Detected inactive account, signing out user');
            await auth.signOut(); // Sign out the user from Firebase
            throw new Error('Your account has been deactivated. Please contact support for assistance.');
        }
       
        // Get the token that was stored
        const token = await getToken();
       
        if (token) {
            const decoded = jwtDecode(token);
            dispatch(setCurrentUser(decoded, userData.user || userData));
            return userData.user || userData;
        } else {
            throw new Error('No authentication token received');
        }
    } catch (err) {
        Toast.show({
            topOffset: 60,
            type: "error",
            text1: "Login failed",
            text2: err.message || "Please check your credentials"
        });
        console.error("Login error:", err);
        logoutUser(dispatch);
        throw err;
    }
};


// Function to get user profile - Modified to fetch from MongoDB
export const getUserProfile = async () => {
    try {
        const token = await SecureStore.getItemAsync("jwt");
        if (!token) {
            throw new Error('Authentication token not found');
        }


        const response = await axios.get(`${API_URL}/auth/me`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });


        console.log('MongoDB User Profile Response:', response.data);


        if (!response.data || !response.data.user) {
            throw new Error('Invalid response format from server');
        }


        // Return the complete user object from MongoDB
        return response.data.user;
    } catch (error) {
        console.log("Error fetching user profile from MongoDB");
        throw error;
    }
};


// Registration function
export const registerUser = async (userData, dispatch) => {
    try {
        console.log('Starting registration process for:', userData.email);
       
        // Register with Firebase first
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            userData.email,
            userData.password
        );
       
        const firebaseUser = userCredential.user;
       
        // Update Firebase profile
        if (userData.username) {
            await updateProfile(firebaseUser, {
                displayName: userData.username
            });
        }
       
        // Get token
        const token = await firebaseUser.getIdToken(true);
        await saveToken(token);
       
        // Register with backend
        const backendData = await registerUserWithBackend({
            ...userData,
            firebaseUid: firebaseUser.uid
        });
       
        if (backendData.error) {
            await firebaseUser.delete();
            throw new Error(backendData.message || "Registration failed");
        }
       
        // Set user in Redux store using the backend response data
        const decoded = jwtDecode(token);
        dispatch(setCurrentUser(decoded, backendData.user));
       
        // Return the complete user data
        return backendData.user;
    } catch (error) {
        console.error("Registration error:", error);
        throw error;
    }
};


// Function to update user profile
export const updateUserProfile = async (userData) => {
  try {
    // Get the current Firebase user
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { error: true, message: 'Not authenticated. Please log in again.' };
    }
   
    // Prepare request data
    const requestData = {
      username: userData.username,
      firebaseUid: firebaseUser.uid,
      ...(userData.userImage && { userImage: userData.userImage }),
      ...(userData.mobileNumber !== undefined && { mobileNumber: userData.mobileNumber }),
      ...(userData.address !== undefined && { address: userData.address })
    };
   
    // Get a fresh token
    const token = await firebaseUser.getIdToken(true);
    await saveToken(token);
   
    const response = await axios.put(`${API_URL}/auth/updateUser`, requestData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });
   
    // Update the Firebase profile to stay in sync
    if (response.data && response.data.user) {
      try {
        const profileUpdates = {
          displayName: userData.username
        };
       
        if (userData.userImage) {
          profileUpdates.photoURL = userData.userImage;
        }
       
        await updateProfile(firebaseUser, profileUpdates);
       
        // Update AsyncStorage data
        const storedUserData = await AsyncStorage.getItem('userData');
        if (storedUserData) {
          const parsedData = JSON.parse(storedUserData);
          const updatedData = {
            ...parsedData,
            username: userData.username,
            ...(userData.userImage && { userImage: userData.userImage }),
            ...(userData.mobileNumber !== undefined && { mobileNumber: userData.mobileNumber }),
            ...(userData.address !== undefined && { address: userData.address })
          };
          await AsyncStorage.setItem('userData', JSON.stringify(updatedData));
        }
      } catch (updateError) {
        console.error('Error syncing profile data:', updateError);
      }
    }
   
    return response.data;
  } catch (error) {
    return handleApiError(error, 'Failed to update profile');
  }
};


export const logoutUser = async (dispatch) => {
  try {
      // Unregister push notification token
      await unregisterPushNotificationToken();
     
      // Continue with the rest of your logout logic
      await removeToken();
      await AsyncStorage.removeItem("userData");
      await auth.signOut();
      dispatch(setCurrentUser({}));
  } catch (error) {
      console.error("Logout error:", error);
  }
};


export const setCurrentUser = (user, userProfile = null) => {
  return {
    type: SET_CURRENT_USER,
    payload: user,
    userProfile: userProfile || user
  };
};

export const getAllUsers = () => async (dispatch) => {
  try {
    dispatch({ type: "GET_USERS_REQUEST" });
    
    const token = await SecureStore.getItemAsync("jwt");
    if (!token) throw new Error('No authentication token found');

    console.log('Fetching users with token:', token ? 'Token exists' : 'No token');

    const response = await axios.get(
      `${API_URL}/auth/users`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Users API Response:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to fetch users');
    }

    dispatch({
      type: "GET_USERS_SUCCESS",
      payload: response.data.users || []
    });

    return response.data.users || [];
  } catch (error) {
    console.error('Error fetching users:', error.response || error);
    dispatch({
      type: "GET_USERS_FAIL",
      payload: error.response?.data?.message || error.message
    });
    return [];
  }
};

export const googleLoginUser = (userData) => async (dispatch) => {
  try {
    const { user, backendUser } = userData;
    
    // Get fresh token
    const token = await user.getIdToken(true);
    await saveToken(token);

    // Combine Firebase and MongoDB data
    const combinedUserData = {
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      uid: user.uid,
      token, // Include the token
      ...backendUser // Include all backend user data
    };

    dispatch(setCurrentUser(combinedUserData, backendUser));
    return combinedUserData;
  } catch (error) {
    console.error('Google login action error:', error);
    throw error;
  }
};