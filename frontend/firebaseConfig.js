// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5h5mV34VXOuTkCmdJvGufjbkmEAHpE6I",
  authDomain: "foodever21-fa168.firebaseapp.com",
  projectId: "foodever21-fa168",
  storageBucket: "foodever21-fa168.firebasestorage.app",
  messagingSenderId: "411310768407",
  appId: "1:411310768407:web:5d5cbddc0586b1473c3752",
  measurementId: "G-TL5BH6MCSH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Google Auth Provider and export
export const googleProvider = new GoogleAuthProvider();
// Configure Google provider (optional)
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Export the app and auth instances
export { app, auth };
export default app;