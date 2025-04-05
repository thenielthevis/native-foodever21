import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { auth } from '../../../firebaseConfig';

import { COLORS, FONTS, SHADOWS } from '../../../constants/theme';

const CustomDrawerContent = props => {
  const [userData, setUserData] = useState(null);
  const [isDrawerReady, setIsDrawerReady] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userDataString = await SecureStore.getItemAsync('userData');
        if (userDataString) {
          const parsedData = JSON.parse(userDataString);
          setUserData(parsedData);
        }
      } catch (error) {
        console.log('Error fetching user data:', error);
      } finally {
        setIsDrawerReady(true);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out', 
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          onPress: async () => {
            try {
              await SecureStore.deleteItemAsync('userData');
              await SecureStore.deleteItemAsync('jwt');
              setUserData(null);
              props.navigation.navigate('Home');
            } catch (error) {
              console.log('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const handleSocialMedia = (platform) => {
    let url;
    switch(platform) {
      case 'facebook':
        url = 'https://www.facebook.com/foodever21';
        break;
      case 'instagram':
        url = 'https://www.instagram.com/foodever21';
        break;
      case 'twitter':
        url = 'https://www.twitter.com/foodever21';
        break;
      default:
        return;
    }
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const handleNavigation = (routeName) => {
    if (!props.navigation || !routeName) {
      console.log('Navigation or route name is missing');
      return;
    }

    try {
      if (props.navigation.getParent()) {
        props.navigation.getParent().navigate(routeName);
      } else {
        props.navigation.navigate(routeName);
      }
    } catch (error) {
      console.log('Navigation error:', error);
    }
  };

  if (!isDrawerReady) {
    return null; // or a loading spinner
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
          />
        </View>
        
        <View style={styles.brandTextContainer}>
          <Text style={styles.brandName}>FOODEVER 21</Text>
          <View style={styles.taglineContainer}>
            <View style={styles.taglineDot}></View>
            <Text style={styles.tagline}>Fresh • Delicious • Homemade</Text>
            <View style={styles.taglineDot}></View>
          </View>
        </View>
        
        {userData ? (
          <View style={styles.userContainer}>
            <View style={styles.userImageContainer}>
              <Image
                source={
                  userData.userImage && userData.userImage.trim() !== ''
                    ? { uri: userData.userImage }
                    : require('../../../assets/logo.png')
                }
                style={styles.userImg}
              />
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{userData.username || 'User'}</Text>
              <Text style={styles.userEmail}>{userData.email || ''}</Text>
              <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => handleNavigation('UserProfile')}
              >
                <Text style={styles.viewProfileText}>My Profile</Text>
                <Ionicons name="chevron-forward" size={12} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => handleNavigation('Signin')}
          >
            <Text style={styles.signInText}>Sign In / Sign Up</Text>
            <View style={styles.signInIconContainer}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.divider} />

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerContent}
        scrollEnabled={true}
      >
        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <View style={styles.footerContainer}>
        <View style={styles.socialSection}>
          <Text style={styles.socialTitleText}>Follow Us</Text>
          <View style={styles.socialMediaContainer}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('facebook')}>
              <Ionicons name="logo-facebook" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('instagram')}>
              <Ionicons name="logo-instagram" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => handleSocialMedia('twitter')}>
              <Ionicons name="logo-twitter" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {userData && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}>
            <View style={styles.signOutContent}>
              <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
              <Text style={styles.signOutText}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    paddingTop: 30,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    ...SHADOWS.light,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  logo: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  brandTextContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1,
    marginBottom: 5,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taglineDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.darkGray,
    opacity: 0.5,
    marginHorizontal: 5,
  },
  tagline: {
    color: COLORS.darkGray,
    fontSize: 12,
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  userContainer: {
    padding: 15,
    alignItems: 'center',
    width: '100%',
  },
  userImageContainer: {
    padding: 3,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'white',
    marginBottom: 10,
    ...SHADOWS.light,
  },
  userImg: {
    height: 60,
    width: 60,
    borderRadius: 30,
  },
  userDetails: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 12,
  },
  viewProfileButton: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  viewProfileText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  signInButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 10,
    width: '80%',
    ...SHADOWS.light
  },
  signInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  signInIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '90%',
    backgroundColor: '#f0f0f0',
    alignSelf: 'center',
    marginTop: 5,
    marginBottom: 5,
  },
  drawerContent: {
    paddingTop: 10,
  },
  drawerItemsContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  footerContainer: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  socialSection: {
    marginBottom: 15
  },
  socialTitleText: {
    color: COLORS.darkGray,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  socialMediaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  socialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    ...SHADOWS.light,
  },
  signOutButton: {
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default CustomDrawerContent;