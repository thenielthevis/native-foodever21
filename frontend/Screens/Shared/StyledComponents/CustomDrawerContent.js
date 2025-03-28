// Components/CustomDrawerContent.js
import React from 'react';
import {
  View,
  Text,
  ImageBackground,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { auth } from '../firebaseConfig';

const CustomDrawerContent = props => {
  const user = auth.currentUser;
  const displayName = user?.displayName || 'Guest User';
  const email = user?.email || 'No email available';
  const photoURL = user?.photoURL;

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      props.navigation.navigate('signin');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.drawerScrollView}>
        <ImageBackground
          source={require('../assets/Home/bg-img2.jpg')}
          style={styles.bgImage}>
          <Image
            source={photoURL ? { uri: photoURL } : require('../assets/Home/logo.png')}
            style={styles.userAvatar}
          />
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{email}</Text>
          <View style={styles.userInfoDivider} />
        </ImageBackground>

        <View style={styles.drawerItemsContainer}>
          <DrawerItemList {...props} />
        </View>
      </DrawerContentScrollView>

      <View style={styles.bottomDrawerSection}>
        <TouchableOpacity 
          style={styles.signOutButton} 
          onPress={handleSignOut}
        >
          <View style={styles.signOutContainer}>
            <Ionicons name="exit-outline" size={22} color="#ff5252" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.versionText}>App Version 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  drawerScrollView: {
    backgroundColor: '#f8f8f8',
  },
  bgImage: {
    padding: 20,
    paddingTop: 30,
    backgroundColor: '#ff9900',
  },
  userAvatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    color: '#fff',
    fontSize: 14,
  },
  userInfoDivider: {
    marginTop: 15,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.5)',
  },
  drawerItemsContainer: {
    flex: 1,
    paddingTop: 10,
  },
  bottomDrawerSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  signOutButton: {
    paddingVertical: 15,
  },
  signOutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    marginLeft: 5,
    color: '#ff5252',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
  },
});

export default CustomDrawerContent;