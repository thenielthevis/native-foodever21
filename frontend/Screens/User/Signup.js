import { Image, StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, Modal, Platform, ActivityIndicator } from 'react-native';
import React, { useState, useEffect, useRef } from 'react';

// Fix icon imports - use specific imports to avoid potential issues
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Fontisto from 'react-native-vector-icons/Fontisto';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// Firebase auth imports
import { createUserWithEmailAndPassword, updateProfile, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { auth, googleProvider } from "../../firebaseConfig";

// Expo imports
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store'; // Import SecureStore instead of AsyncStorage

// Backend related imports
import axios from 'axios';
// Remove AsyncStorage import
import { API_URL } from '@env';

// Import the custom loading component for the food-themed loading animation
import FoodLoadingIndicator from '../../Components/FoodLoadingIndicator';

// Ensure WebBrowser redirects are handled
WebBrowser.maybeCompleteAuthSession();

const Signup = () => {
  const navigation = useNavigation();
  
  // State for form inputs
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  
  // Image handling state
  const [profileImage, setProfileImage] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [cloudinaryUrl, setCloudinaryUrl] = useState(null);
  
  // Add launchCam state (though we won't use it in the component like you mentioned)
  const [launchCam, setLaunchCam] = useState(false);
  
  // Keep permission state for general use
  const [hasPermission, setHasPermission] = useState(null);
  
  // Error and loading states
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    profileImage: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Request camera permissions on component mount
  useEffect(() => {
    (async () => {
      try {
        // Request just the permissions we need for ImagePicker
        const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
        const imagePickerPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        const permissionsGranted = 
          mediaLibraryPermission.status === 'granted' && 
          imagePickerPermission.status === 'granted';
        
        setHasPermission(permissionsGranted);
      } catch (error) {
        console.error('Error requesting permissions:', error);
        setHasPermission(false);
      }
    })();
  }, []);
  
  // Existing validation functions
  const validateName = (name) => {
    return name.trim().length >= 3;
  };
  
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  const validatePassword = (password) => {
    return password.length >= 6;
  };
  
  // Form validation
  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      name: '', 
      email: '', 
      password: '', 
      confirmPassword: '', 
      profileImage: ''
    };
    
    // Name validation
    if (!name) {
      newErrors.name = 'Name is required';
      isValid = false;
    } else if (!validateName(name)) {
      newErrors.name = 'Name must be at least 3 characters';
      isValid = false;
    }
    
    // Email validation
    if (!email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }
    
    // Password validation
    if (!password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    }
    
    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }
    
    setErrors(newErrors);  
    return isValid;
  };
  
  // Image picker function
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Use MediaTypeOptions since MediaType is undefined
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
  
      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };
  
  // Camera functions
  const openCamera = async () => {
    setLaunchCam(true); // Set launchCam state to true (as you mentioned)
    
    try {
      // Request camera permissions directly
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is required for this feature.');
        return;
      }
      
      // Launch camera directly using ImagePicker
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        // Update profile image with the photo URI
        setProfileImage(result.assets[0].uri);
        
        try {
          // Save to media library
          await MediaLibrary.saveToLibraryAsync(result.assets[0].uri);
        } catch (saveError) {
          console.error('Error saving to media library:', saveError);
          // Continue even if saving fails
        }
      }
    } catch (error) {
      console.error('Error using camera:', error);
      Alert.alert('Error', 'Failed to use camera. Please try using gallery instead.');
    }
  };
  
  // Upload image to server
  const uploadImage = async () => {
    if (!profileImage) {
      return null;
    }
    
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: profileImage,
        name: 'profile-image.jpg',
        type: 'image/jpeg',
      });
      
      const response = await fetch(`${API_URL}auth/upload-avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const responseData = await response.json();
      if (response.ok) {
        setCloudinaryUrl(responseData.secure_url);
        setImageUploading(false);
        return responseData.secure_url;
      } else {
        throw new Error(responseData.message || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setImageUploading(false);
      Alert.alert('Error', 'Failed to upload profile image. You can try again later.');
      return null;
    }
  };
  
  const handleSignUp = async () => {
    if (validateForm()) {
      setIsLoading(true);
      try {
        // Upload image first if selected
        let userImageUrl = null;
        if (profileImage) {
          userImageUrl = await uploadImage();
        }

        // Step 1: Create user in Firebase
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email.trim().toLowerCase(),
          password
        );
        const firebaseUser = userCredential.user;

        // Step 2: Update Firebase profile
        await updateProfile(firebaseUser, {
          displayName: name,
          photoURL: userImageUrl || null
        });

        // Step 3: Get Firebase token
        const token = await firebaseUser.getIdToken(true);

        // Step 4: Create user data object
        const userData = {
          username: name,
          email: email.toLowerCase().trim(),
          password: password, // MongoDB needs this
          firebaseUid: firebaseUser.uid,
          userImage: userImageUrl
        };

        // Step 5: Register with MongoDB backend
        console.log('Sending registration data to backend:', {
          ...userData,
          password: '[HIDDEN]'
        });

        const backendResponse = await axios.post(
          `${API_URL}/auth/signup`,  // Note the forward slash after API_URL
          userData,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Backend registration successful:', backendResponse.data);

        setIsLoading(false);
        Alert.alert(
          "Success",
          "Account created successfully!",
          [{ text: "OK", onPress: () => navigation.navigate('signin') }]
        );

      } catch (error) {
        setIsLoading(false);
        console.error('Registration error:', error.response?.data || error.message);
        Alert.alert(
          "Error",
          error.response?.data?.message || error.message || "Failed to create account"
        );
      }
    }
  };

  // Existing Google Auth code
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: 'YOUR_WEB_CLIENT_ID',
    androidClientId: 'YOUR_ANDROID_CLIENT_ID',
    iosClientId: 'YOUR_IOS_CLIENT_ID',
  });

  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      handleGoogleCredential(id_token);
    }
  }, [response]);

  const handleGoogleCredential = async (idToken) => {
    setIsLoading(true);
    
    try {
      // Create a Google credential with the token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with credential
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      // Get Firebase ID token
      const token = await user.getIdToken();
      
      // Save token to SecureStore
      await SecureStore.setItemAsync("jwt", token);
      
      console.log("Google sign up successful:", user.uid);
      setIsLoading(false);
      
      Alert.alert(
        "Success", 
        "Account created successfully with Google!",
        [{ 
          text: "OK", 
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        }]
      );
    } catch (error) {
      setIsLoading(false);
      console.error("Google sign up error:", error);
      Alert.alert("Error", "Failed to sign up with Google. Please try again.");
    }
  };
  
  // Handle Google sign up
  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      await promptAsync();
    } catch (error) {
      setIsLoading(false);
      console.error("Google sign up error:", error);
      Alert.alert("Error", "Failed to start Google sign up.");
    }
  };

  // Main signup view
  return (
    <LinearGradient
      colors={['#FF8C42', '#F9A826', '#FFF1D0']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Full-screen loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <FoodLoadingIndicator text="Creating your account..." size="large" />
          </View>
        )}

        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/logo.png')} 
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>Create Account</Text>
          <Text style={styles.signUpText}>Fresh burgers, pasta & sandwiches await</Text>
          
          {/* Profile Image Selection */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={() => profileImage ? setProfileImage(null) : pickImage()}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <FontAwesome5 name="user" size={40} color="#FF8C42" />
                </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity 
                style={styles.imageButton} 
                onPress={pickImage}
                disabled={isLoading || imageUploading}
              >
                <FontAwesome5 name="image" size={16} color="white" />
                <Text style={styles.imageButtonText}>Gallery</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.imageButton} 
                onPress={openCamera}
                disabled={isLoading || imageUploading}
              >
                <FontAwesome5 name="camera" size={16} color="white" />
                <Text style={styles.imageButtonText}>Camera</Text>
              </TouchableOpacity>
            </View>
            
            {imageUploading && (
              <View style={styles.imageUploadingContainer}>
                <FoodLoadingIndicator text="Uploading image..." size="small" />
              </View>
            )}
          </View>

          {/* Name Input */}
          <View style={[styles.inputContainer, errors.name ? styles.inputError : null]}>
            <FontAwesome name="user" size={20} color="#FF8C42" style={styles.inputIcon}/>
            <TextInput 
              style={styles.TextInput} 
              placeholder="Full Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

          {/* Email Input */}
          <View style={[styles.inputContainer, errors.email ? styles.inputError : null]}>
            <FontAwesome name="envelope" size={20} color="#FF8C42" style={styles.inputIcon}/>
            <TextInput 
              style={styles.TextInput} 
              placeholder="Email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          {/* Password Input */}
          <View style={[styles.inputContainer, errors.password ? styles.inputError : null]}>
            <Fontisto name="locked" size={20} color="#FF8C42" style={styles.inputIcon}/>
            <TextInput 
              style={styles.TextInput} 
              placeholder="Password" 
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#999"
            />
          </View>
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          {/* Confirm Password Input */}
          <View style={[styles.inputContainer, errors.confirmPassword ? styles.inputError : null]}>
            <Fontisto name="locked" size={20} color="#FF8C42" style={styles.inputIcon}/>
            <TextInput 
              style={styles.TextInput} 
              placeholder="Confirm Password" 
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor="#999"
            />
          </View>
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          {/* Sign Up Button */}
          <TouchableOpacity 
            style={styles.signUpButtonContainer}
            onPress={handleSignUp}
            disabled={isLoading || imageUploading}
          >
            <LinearGradient
              colors={isLoading ? ['#c0c0c0', '#a0a0a0'] : ['#FF8C42', '#F9A826']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              <Text style={styles.signUpButtonText}>
                {isLoading ? "Creating Account..." : "Sign up"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Or divider */}
          <View style={styles.orContainer}>
            <View style={styles.divider} />
            <Text style={styles.orText}>Or</Text>
            <View style={styles.divider} />
          </View>

          {/* Google Sign Up Button */}
          <TouchableOpacity 
            style={styles.googleButton}
            onPress={handleGoogleSignUp}
            disabled={isLoading || imageUploading}
          >
            <Image 
              source={require('../../assets/google-icon.png')} 
              style={{width: 20, height: 20, marginRight: 10}} 
            />
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </TouchableOpacity>

          {/* Already have an account section */}
          <View style={styles.accountContainer}>
            <Text style={styles.accountText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.reset({
              index: 0,
              routes: [{ name: 'Signin' }],
            })}>
              <Text style={styles.signInLink}>Sign in</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.backToHomeContainer}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.backToHomeText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default Signup;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  logo: {
    width: 100,
    height: 100,
  },
  formContainer: {
    paddingHorizontal: 25,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 2,
  },
  signUpText: {
    textAlign: "center",
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
    opacity: 1,
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  // Profile image styles
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: 'white',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 5,
  },
  imageButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C42',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 5,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  imageButtonText: {
    color: 'white',
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  // Form input styles
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
  signUpButtonContainer: {
    height: 55,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 15,
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
  signUpButtonText: {
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
    marginVertical: 15,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  orText: {
    marginHorizontal: 10,
    color: '#333',
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
    color: '#333',
    fontSize: 15,
    fontWeight: '500',
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  signInLink: {
    color: '#333',
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
  // Loading animation styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  backToHomeContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
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