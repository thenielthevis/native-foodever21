import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from "../../firebaseConfig";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../Shared/StyledComponents/BottomNav';
import { getUserProfile, logoutUser } from "../../Redux/Actions/Auth.actions";
import { useDispatch, useSelector } from 'react-redux'; // Add this
import * as SecureStore from 'expo-secure-store';
import { SET_CART_COUNT } from '../../Redux/Constants/cartConstants';
import { clearCartData } from '../../Redux/Actions/cartActions';
import TokenExpired from '../Modals/TokenExpired';
import { API_URL } from '@env';

// Color palette
const COLORS = {
  primary: '#FF8C42',
  secondary: '#F9A826',
  background: '#FFF1D0',
  white: '#FFFFFF',
  text: {
    dark: '#333333',
    medium: '#666666',
    light: '#999999'
  },
  error: '#FF5252'
};


const UserProfile = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [backendUser, setBackendUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTokenExpiredModal, setShowTokenExpiredModal] = useState(false);
  const dispatch = useDispatch();


  const fetchUserData = async () => {
    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync("jwt");
      const userDataStr = await SecureStore.getItemAsync("userData");
       
      if (!token || !userDataStr) {
        throw new Error('No authentication data found');
      }
  
      const userData = JSON.parse(userDataStr);
      console.log("Stored user data:", userData);
       
      // Set basic user info from stored data
      const photoURL = userData.userImage || userData.photoURL || 'https://via.placeholder.com/150';
      setUser({
        uid: userData.firebaseUid,
        displayName: userData.username,
        email: userData.email,
        photoURL: photoURL,
        createdAt: new Date().toISOString(),
      });
       
      // Fetch additional data from backend
      const userProfile = await getUserProfile();
      console.log("Backend user profile:", userProfile);
      if (userProfile) {
        // Update user state if backend has more recent image
        if (userProfile.userImage) {
          setUser(prev => ({
            ...prev,
            photoURL: userProfile.userImage
          }));
        }
        setBackendUser(userProfile);
        // Update user photoURL if backend has a different one
        if (userProfile.userImage && userProfile.userImage !== user?.photoURL) {
          setUser(prev => ({ ...prev, photoURL: userProfile.userImage }));
        }
      }
    } catch (error) {
      console.log('Error type:', error?.response?.status);
      if (error?.response?.status === 401) {
        setShowTokenExpiredModal(true);
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Signin' }],
        });
      }
    } finally {
      setLoading(false);
    }
  };


  // Use useFocusEffect for better performance
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      return () => {}; // cleanup if needed
    }, [])
  );


  const handleSignOut = async () => {
    try {
      // First remove FCM token
      const response = await fetch(`${API_URL}/auth/remove-fcm-token`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await SecureStore.getItemAsync('jwt')}`
        }
      });

      if (!response.ok) {
        console.warn('Failed to remove FCM token:', await response.text());
      }

      // Clear Redux state
      dispatch(clearCartData());
      dispatch({ type: SET_CART_COUNT, payload: 0 });
      
      // Clear storage
      await Promise.all([
        SecureStore.deleteItemAsync("jwt"),
        SecureStore.deleteItemAsync("userData"),
        SecureStore.deleteItemAsync("fcmToken") // Also clear stored FCM token if you have one
      ]);
      
      // Logout from auth
      await auth.signOut();
      await logoutUser(dispatch);
      
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signin' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };


  const handleEditProfile = () => {
    navigation.navigate('EditProfile', {
      user: user,
      backendUser: backendUser
    });
  };

  const handleTokenExpiredClose = () => {
    setShowTokenExpiredModal(false);
  };

  const handleTokenExpiredLogin = () => {
    setShowTokenExpiredModal(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Signin' }],
    });
  };


  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary, COLORS.background]}
        style={styles.centeredContainer}
      >
        <StatusBar backgroundColor="white" barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.white} />
      </LinearGradient>
    );
  }


  if (!user) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary, COLORS.background]}
        style={styles.centeredContainer}
      >
        <StatusBar backgroundColor="white" barStyle="dark-content" />
        <Text style={styles.errorText}>
          You are not signed in. Please sign in to view your profile.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Signin')}
        >
          <Text style={styles.actionButtonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }


  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      <TokenExpired
        visible={showTokenExpiredModal}
        onClose={handleTokenExpiredClose}
        onLogin={handleTokenExpiredLogin}
      />
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary, COLORS.background]}
        style={[styles.gradientBackground, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome name="arrow-left" size={22} color={COLORS.text.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.iconButton} />
        </View>


        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <Image
              source={{ 
                uri: user.photoURL,
                headers: { 'Cache-Control': 'no-cache' }  // Add cache control
              }}
              style={styles.profileImage}
              onError={(e) => {
                console.log('Image loading error:', e.nativeEvent.error);
                // Fallback to default image if loading fails
                setUser(prev => ({
                  ...prev,
                  photoURL: 'https://via.placeholder.com/150'
                }));
              }}
            />
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
           
            {backendUser?.mobileNumber && (
              <View style={styles.infoRow}>
                <FontAwesome name="phone" size={16} color={COLORS.primary} />
                <Text style={styles.infoText}>{backendUser.mobileNumber}</Text>
              </View>
            )}
           
            {backendUser?.address && (
              <View style={styles.infoRow}>
                <FontAwesome name="map-marker" size={16} color={COLORS.primary} />
                <Text style={styles.infoText}>{backendUser.address}</Text>
              </View>
            )}
           
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEditProfile}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <FontAwesome name="edit" size={16} color={COLORS.white} style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <LinearGradient
              colors={[COLORS.error, '#FF7676']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <FontAwesome name="sign-out" size={16} color={COLORS.white} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Sign Out</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>


        {/* Bottom Navigation */}
        <BottomNav navigation={navigation} activeRoute="Profile" />
      </LinearGradient>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.dark,
  },
  iconButton: {
    padding: 8,
    width: 40,
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  placeholderImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text.dark,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: COLORS.text.medium,
    marginBottom: 24,
  },
  primaryButton: {
    width: '80%',
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  signOutButton: {
    width: '60%',
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    marginTop: 12,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: COLORS.text.dark,
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 16,
    borderRadius: 8,
  },
  actionButton: {
    backgroundColor: COLORS.text.dark,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 15,
    color: COLORS.text.medium,
    marginLeft: 10,
    flexShrink: 1,
  },
});


export default UserProfile;