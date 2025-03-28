import React, { createContext, useContext, useState, useEffect, useReducer, useRef } from 'react';
import { jwtDecode } from "jwt-decode";
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store'; // Add SecureStore import
import { auth } from '../../firebaseConfig';
import authReducer from "../Reducers/Auth.reducer";
import { setCurrentUser, getUserProfile } from "../Actions/Auth.actions";

// Create context
const UserContext = createContext(null);

// Constants for secure storage
const JWT_TOKEN_KEY = 'foodever21_jwt_token';

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stateUser, dispatch] = useReducer(authReducer, {
    isAuthenticated: null,
    user: {}
  });
  
  // Use ref to track initialization state and prevent duplicate processing
  const initialized = useRef(false);

  useEffect(() => {
    // Skip if already initialized
    if (initialized.current) return;
    initialized.current = true;
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Set basic user data from Firebase
        const basicUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'User',
          photoURL: firebaseUser.photoURL || 'https://via.placeholder.com/150'
        };
        
        // Set user and loading state immediately with basic data
        setUser(basicUser);
        setLoading(false);
        
        try {
          // Get token for legacy reducer system
          const token = await firebaseUser.getIdToken();
          
          // Store token in SecureStore
          try {
            await SecureStore.setItemAsync(JWT_TOKEN_KEY, token);
            // Clear any tokens in AsyncStorage (for migration)
            await AsyncStorage.removeItem("jwt");
          } catch (secureStoreError) {
            console.error('Failed to save token in SecureStore, falling back to AsyncStorage:', secureStoreError);
            await AsyncStorage.setItem("jwt", token);
          }
          
          const decoded = jwtDecode(token);
          
          // Update reducer state (for backward compatibility)
          dispatch(setCurrentUser(decoded, basicUser));
          
          // Get additional user data from backend
          try {
            const userData = await getUserProfile();
            
            // Merge Firebase and backend data
            const fullUserData = {
              ...basicUser,
              ...userData,
              uid: firebaseUser.uid
            };
            
            setUser(fullUserData);
            
            // Update reducer state with full data
            dispatch(setCurrentUser(decoded, fullUserData));
          } catch (profileError) {
            console.error("Failed to load user profile:", profileError);
          }
        } catch (error) {
          console.error("Failed to process user data:", error);
        }
      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
        
        try {
          // Clear tokens from both stores
          await SecureStore.deleteItemAsync(JWT_TOKEN_KEY);
          await AsyncStorage.removeItem("jwt");
          dispatch(setCurrentUser({}));
        } catch (error) {
          console.error("Error clearing token:", error);
        }
      }
    });
    
    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      setUser,
      stateUser,
      dispatch 
    }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// For backward compatibility
export default UserContext;