import { Image, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Fontisto from "react-native-vector-icons/Fontisto";
import { LinearGradient } from 'expo-linear-gradient';

// Import axios and baseURL to fix hardcoded URL issue
import axios from 'axios';
import baseURL from '../../assets/common/baseurl';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { signInWithEmailAndPassword, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth } from "../../firebaseConfig";

// Replace the deprecated expo-google-app-auth with these
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

// Ensure WebBrowser redirects are handled
WebBrowser.maybeCompleteAuthSession();

const Signin = ({ navigation }) => {
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
    if (!validateForm() || isLoading) return; // Prevent multiple submissions
    
    setIsLoading(true);
    setError('');
    
    try {
      console.log("Attempting to sign in with:", email);
      
      // Sign in with Firebase authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get Firebase token and save it
      const token = await user.getIdToken();
      await AsyncStorage.setItem("jwt", token);
      
      console.log("Firebase authentication successful for:", user.email);
      
      // Make direct axios call to your backend
      try {
        const backendResponse = await axios.post(
          `${baseURL}auth/login`, 
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
        
        console.log("Backend login response:", backendResponse.data);
        
        // Store user data in a single operation to reduce renders
        const dataToStore = {};
        
        if (backendResponse.data.token) {
          dataToStore.backendToken = backendResponse.data.token;
        }
        
        if (backendResponse.data.user) {
          dataToStore.userData = JSON.stringify(backendResponse.data.user);
        }
        
        // Batch storage operations
        if (Object.keys(dataToStore).length > 0) {
          const storagePromises = Object.entries(dataToStore).map(([key, value]) => 
            AsyncStorage.setItem(key, value)
          );
          await Promise.all(storagePromises);
        }
        
      } catch (backendError) {
        console.warn("Backend login failed, but continuing with Firebase auth:", backendError);
        // Continue even if backend fails - we'll try to sync later
      }
      
      // Only set loading to false after all async operations are complete
      setIsLoading(false);
      
      // Navigate to Home screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (firebaseError) {
      // Set specific error message based on Firebase error code
      let errorMessage = 'Failed to sign in. Please try again';
      
      switch(firebaseError.code) {
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address format';
          break;
        case 'auth/user-disabled':
          errorMessage = 'This account has been disabled';
          break;
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Too many failed login attempts. Please try again later';
          break;
        default:
          console.error("Firebase auth error:", firebaseError.code, firebaseError.message);
      }
      
      // Update state only once
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  // Google Auth config - Add proper error handling for client IDs
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID || 'YOUR_WEB_CLIENT_ID',
    androidClientId: process.env.EXPO_PUBLIC_ANDROID_CLIENT_ID || 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID || 'YOUR_IOS_CLIENT_ID',
  });
  
  // Handle Google Auth response - Optimize to prevent redundant updates
  useEffect(() => {
    if (response?.type === 'success' && !isLoading) {
      const { id_token } = response.params;
      handleGoogleCredential(id_token);
    }
  }, [response]);
  
  const handleGoogleCredential = async (idToken) => {
    if (isLoading) return; // Prevent multiple submissions
    
    setIsLoading(true);
    setError('');
    
    try {
      // Create a Google credential with the token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      // Get Firebase token and save it
      const token = await user.getIdToken();
      await AsyncStorage.setItem("jwt", token);
      
      // Try to login with backend just like in handleSignIn
      try {
        await axios.post(
          `${baseURL}auth/login`, 
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
      } catch (backendError) {
        console.warn("Backend login after Google sign-in failed:", backendError);
        // Continue even if backend fails
      }
      
      console.log("Google sign in successful:", user.uid);
      setIsLoading(false);
      
      // Use reset instead of navigate for a cleaner navigation experience
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };
  
  // Handle Google sign in - prevent multiple calls
  const handleGoogleSignIn = async () => {
    if (isLoading) return; // Prevent multiple submissions
    
    try {
      setIsLoading(true);
      await promptAsync();
    } catch (error) {
      console.error("Google sign in error:", error);
      setError('Failed to start Google sign in.');
      setIsLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = () => {
    Alert.alert("Forgot Password", "A reset link will be sent to your email");
  };

  // Handle sign up
  const handleSignUp = () => {
    navigation.navigate('signup'); // Navigate to the sign-up screen
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
          onPress={handleGoogleSignIn}
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
    }
});