import { Image, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Fontisto from "react-native-vector-icons/Fontisto";
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch } from 'react-redux';

// Import axios and API_URL to fix hardcoded URL issue
import axios from 'axios';
import { API_URL } from '@env';
// Replace AsyncStorage with SecureStore
import * as SecureStore from 'expo-secure-store';

import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_SIGNIN_CONFIG } from '../../google-auth-config';
import { fetchCartCount } from '../../Redux/Actions/cartActions';
import { setCurrentUser, googleLoginUser } from '../../Redux/Actions/Auth.actions';

import 'expo-dev-client';
import { ReactNativeFirebase } from "@react-native-firebase/app";

// Initialize Google Sign-in
GoogleSignin.configure(GOOGLE_SIGNIN_CONFIG);

const Signin = ({ navigation }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const configureGoogleSignIn = async () => {
      try {
        await GoogleSignin.configure({
          webClientId: "411310768407-a6l9sff0ni31a224d1rqmoq0to0qf7hg.apps.googleusercontent.com",
          offlineAccess: true,
          forceCodeForRefreshToken: false,
        });

        const isAvailable = await GoogleSignin.hasPlayServices();
        console.log('Play Services available:', isAvailable);

      } catch (error) {
        console.error('Google SignIn Configuration Error:', {
          code: error.code,
          message: error.message,
          stack: error.stack,
          fullError: JSON.stringify(error, null, 2)
        });
      }
    };
    
    configureGoogleSignIn();
    checkStoredData();
  }, []);

  const onGoogleButtonPress = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError('');
    
    try {
      await GoogleSignin.signOut();
      
      console.log('Starting Google Sign-in process...');
      await GoogleSignin.hasPlayServices();
      
      const signInResult = await GoogleSignin.signIn();
      console.log('Google Sign In Result:', signInResult);

      if (!signInResult?.data?.idToken) {
        throw new Error('No ID token present in Google Sign-in response');
      }

      // Create Firebase credential
      const credential = GoogleAuthProvider.credential(
        signInResult.data.idToken
      );

      // Sign in to Firebase
      const userCredential = await signInWithCredential(auth, credential);
      console.log('Firebase auth successful:', userCredential.user);

      // Get fresh token for backend calls
      const idToken = await userCredential.user.getIdToken();

      // Call backend to sync with MongoDB
      const backendResponse = await axios.post(
        `${API_URL}/auth/login`,
        {
          email: userCredential.user.email,
          uid: userCredential.user.uid,
          displayName: signInResult.data.user.name,
          photoURL: signInResult.data.user.photo
        },
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!backendResponse.data.success) {
        throw new Error(backendResponse.data.message || 'Backend sync failed');
      }

      // Store complete user data
      const userData = {
        ...backendResponse.data.user,
        token: idToken
      };

      // Save tokens and user data
      await SecureStore.setItemAsync("userData", JSON.stringify(userData));
      await SecureStore.setItemAsync("jwt", idToken);

      // Dispatch actions to Redux store
      dispatch(setCurrentUser(userData, backendResponse.data.user));
      await dispatch(googleLoginUser({
        user: userCredential.user,
        backendUser: backendResponse.data.user
      }));

      // Optional: Register for push notifications if needed
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (pushToken) {
          await registerPushNotificationToken(pushToken);
        }
      } catch (pushError) {
        console.warn('Push notification registration failed:', pushError);
        // Continue with login even if push registration fails
      }

      // Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error) {
      console.error('Google Sign-In Error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this helper function for push notifications
  const registerForPushNotificationsAsync = async () => {
    try {
      // Your existing push notification registration logic
      // Return the token if successful
      return null; // Replace with actual implementation if needed
    } catch (error) {
      console.error('Push registration error:', error);
      return null;
    }
  };
  
  // State for form inputs and validation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({
    email: '',
    password: ''
  });
  // Use a single loading state variable
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation function
  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Memoize the validateForm function to prevent unnecessary re-renders
  const validateForm = useCallback(() => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [email, password]);

  // Handle sign in with Firebase
  const handleSignIn = async () => {
    if (!validateForm() || isLoading) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log("Signin - Attempting Firebase auth with:", email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      await SecureStore.setItemAsync("jwt", token);
      console.log("Signin - Firebase auth successful, token stored");
      
      try {
        console.log("Signin - Calling backend login...");
        const backendResponse = await axios.post(
          `${API_URL}/auth/login`,
          {
            email: user.email,
            uid: user.uid
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        console.log("Signin - Backend response:", backendResponse.data);
        
        if (!backendResponse.data.success || !backendResponse.data.user || !backendResponse.data.user._id) {
          console.error("Invalid response structure:", backendResponse.data);
          throw new Error('Invalid response from server');
        }

        const userData = {
          _id: backendResponse.data.user._id,
          username: backendResponse.data.user.username || user.displayName || email.split('@')[0],
          email: backendResponse.data.user.email || user.email,
          role: backendResponse.data.user.role || 'user',
          status: backendResponse.data.user.status || 'active',
          firebaseUid: user.uid,
          token: token
        };

        console.log("Signin - Storing user data:", {
          id: userData._id,
          email: userData.email,
          username: userData.username
        });

        await SecureStore.setItemAsync("userData", JSON.stringify(userData));
        
        // Verify stored data
        const storedData = await SecureStore.getItemAsync("userData");
        const parsedData = JSON.parse(storedData);
        console.log('Signin - Verification:', {
          stored_id: parsedData._id,
          stored_email: parsedData.email,
          has_token: !!parsedData.token
        });

        await dispatch(fetchCartCount());  // Add this line

        setIsLoading(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
        
      } catch (backendError) {
        console.error("Signin - Backend error:", backendError);
        throw new Error(backendError.message || 'Failed to complete login');
      }
      
    } catch (error) {
      console.error("Signin error:", error);
      setError(error.message);
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "A reset link will be sent to your email");
  };

  // Handle sign up
  const handleSignUp = () => {
    navigation.navigate('Signup'); // Navigate to the sign-up screen
  };

  // Add a helper function to check stored data
  const checkStoredData = async () => {
    try {
      const userData = await SecureStore.getItemAsync("userData");
      const userToken = await SecureStore.getItemAsync("jwt");
      console.log('Current stored userData:', userData ? JSON.parse(userData) : null);
      console.log('Current stored jwt:', userToken);
    } catch (error) {
      console.error('Error checking stored data:', error);
    }
  };

  return (
    <LinearGradient
      colors={['#FF8C42', '#F9A826', '#FFF1D0']}
      style={styles.container}
    >
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.formContainer}>
        <Text style={styles.welcomeText}>Taste the Experience</Text>
        <Text style={styles.signInText}>Burgers, Pasta & Sandwiches await you</Text>

        <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
          <FontAwesome name={"user"} size={20} color={"#FF8C42"} style={styles.inputIcon}/>
          <TextInput
            style={styles.TextInput}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            accessible={true}
            accessibilityLabel="Email input field"
            accessibilityHint="Enter your email address"
            placeholderTextColor="#999"
          />
        </View>
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
          <Fontisto name={"locked"} size={20} color={"#FF8C42"} style={styles.inputIcon}/>
          <TextInput
            style={styles.TextInput}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            accessible={true}
            accessibilityLabel="Password input field"
            accessibilityHint="Enter your password"
            placeholderTextColor="#999"
          />
        </View>
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

        <TouchableOpacity onPress={handleForgotPassword}>
          <Text style={styles.forgotPassword}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signInButtonContainer}
          onPress={handleSignIn}
          disabled={isLoading}
          accessible={true}
          accessibilityLabel="Sign in button"
          accessibilityHint="Double tap to sign in to your account"
        >
          <LinearGradient
            colors={isLoading ? ['#c0c0c0', '#a0a0a0'] : ['#FF8C42', '#F9A826']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradientButton}
          >
            <Text style={styles.signInButtonText}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.orContainer}>
          <View style={styles.divider} />
          <Text style={styles.orText}>Or</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity 
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          accessible={true}
          accessibilityLabel="Sign in with Google button"
          accessibilityHint="Double tap to sign in with your Google account"
        >
          <Image 
            source={require('../../assets/google-icon.png')} 
            style={{width: 20, height: 20, marginRight: 10}} 
          />
          <Text style={styles.googleButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        <View style={styles.accountContainer}>
          <Text style={styles.accountText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpText}>Sign up</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.backToHomeContainer}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backToHomeText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Signin;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    logo: {
      width: 120,
      height: 120,
    },
    appName: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFF',
      marginTop: 10,
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    formContainer: {
      paddingHorizontal: 25,
      marginTop: 20,
    },
    welcomeText: {
      fontSize: 32,
      fontWeight: '700',
      color: '#333', // Changed to darker color
      textAlign: 'center',
      marginBottom: 5,
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 2,
    },
    signInText: {
      textAlign: "center",
      fontSize: 16,
      color: "#333", // Changed to darker color
      marginBottom: 30,
      opacity: 1,
      fontWeight: '500',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    inputContainer: {
      backgroundColor: "#FFFFFF",
      flexDirection: "row",
      borderRadius: 12,
      marginBottom: 15,
      alignItems: "center",
      height: 55,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    inputIcon: {
      marginLeft: 15,
      marginRight: 10,
    },
    TextInput: {
      flex: 1,
      fontSize: 16,
      color: '#333',
    },
    errorText: {
      color: '#FF3B30',
      fontSize: 12,
      marginLeft: 5,
      marginTop: -10,
      marginBottom: 10,
    },
    forgotPassword: {
      textAlign: "right",
      color: "#333", // Changed to darker color
      fontSize: 14,
      marginTop: 5,
      marginBottom: 20,
      fontWeight: '500',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    signInButtonContainer: {
      height: 55,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 15,
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
    },
    gradientButton: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    signInButtonText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontWeight: "600",
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    orContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    divider: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    orText: {
      marginHorizontal: 10,
      color: '#333', // Changed to darker color
      fontSize: 14,
      fontWeight: '500',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    googleButton: {
      flexDirection: 'row',
      backgroundColor: 'white',
      borderRadius: 12,
      height: 55,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    googleButtonText: {
      color: '#333',
      fontSize: 16,
      fontWeight: '500',
    },
    accountContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 25,
    },
    accountText: {
      color: '#333', // Changed to a darker color
      fontSize: 15,
      fontWeight: '500',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    signUpText: {
      color: '#333', // Changed to a darker color
      fontSize: 15,
      fontWeight: 'bold',
      textDecorationLine: 'underline',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
    inputError: {
      borderWidth: 1,
      borderColor: '#FF3B30',
    },
    backgroundPattern: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0.03,
      zIndex: -1,
    },
    backToHomeContainer: {
      alignItems: 'center',
      marginTop: 15,
    },
    backToHomeText: {
      color: '#333',
      fontSize: 14,
      fontWeight: '500',
      textDecorationLine: 'underline',
      textShadowColor: 'rgba(255, 255, 255, 0.5)',
      textShadowOffset: { width: 0.5, height: 0.5 },
      textShadowRadius: 1,
    },
});