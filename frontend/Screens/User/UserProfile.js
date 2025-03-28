import React, { useState, useEffect, useCallback } from 'react';
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
import { useUser } from '../../Redux/Store/AuthGlobal';
import { useFocusEffect } from '@react-navigation/native';

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
  const { dispatch } = useUser();

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Get the current user from Firebase
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Set Firebase user data
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.displayName || 'User',
          email: currentUser.email,
          photoURL: currentUser.photoURL || 'https://via.placeholder.com/150',
          createdAt: currentUser.metadata.creationTime,
        });
        
        // Fetch additional data from backend
        const userData = await getUserProfile();
        if (!userData.error) {
          setBackendUser(userData);
        }
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
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
      await logoutUser(dispatch);
      navigation.reset({
        index: 0,
        routes: [{ name: 'signin' }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { 
      user: user,
      backendUser: backendUser
    });
  };

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary, COLORS.background]}
        style={styles.centeredContainer}
      >
        <StatusBar barStyle="light-content" />
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
        <StatusBar barStyle="light-content" />
        <Text style={styles.errorText}>
          You are not signed in. Please sign in to view your profile.
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('signin')}
        >
          <Text style={styles.actionButtonText}>Go to Sign In</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
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
              source={{ uri: user.photoURL }} 
              style={styles.profileImage} 
            />
            <Text style={styles.displayName}>{user.displayName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
});

export default UserProfile;