import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchOrderCount } from '../../../Redux/Actions/cartActions';
import * as SecureStore from 'expo-secure-store';
import { getUnreadCount } from '../../../services/notificationsDB';

const BottomNav = ({ navigation, activeRoute }) => {
  const dispatch = useDispatch();
  const cartCount = useSelector(state => state.cart?.cartCount || 0);
  const [userRole, setUserRole] = useState('user'); // Change to use local state
  const [notificationCount, setNotificationCount] = useState(0);

  // Add function to get user data from SecureStore
  const getUserData = async () => {
    try {
      const userData = await SecureStore.getItemAsync("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        console.log('User role from storage:', parsedData.role);
        setUserRole(parsedData.role || 'user');
      }
    } catch (error) {
      console.error('Error getting user data:', error);
      setUserRole('user'); // Default to user role if there's an error
    }
  };

  const handleCartPress = async () => {
    // const token = await SecureStore.getItemAsync("jwt");
    // if (!token) {
    //   navigation.navigate('Signin');
    //   return;
    // }
    // // Navigate directly to CartScreen through the DrawerNavigator
    navigation.navigate('CartScreen');
  };

  useEffect(() => {
    getUserData();
    const initializeCart = async () => {
      try {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          const { firebaseUid } = JSON.parse(userData);
          await dispatch(fetchOrderCount());
        }
      } catch (error) {
        console.error('Error initializing cart count:', error);
      }
    };

    initializeCart();
    const interval = setInterval(initializeCart, 5000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Add this effect to fetch notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          const { firebaseUid } = JSON.parse(userData);
          const count = await getUnreadCount(firebaseUid);
          setNotificationCount(count);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tab} onPress={() => navigation.navigate('Home')}>
        <View style={styles.tabContent}>
          <Ionicons
            name={activeRoute === 'Home' ? 'home' : 'home-outline'}
            size={24}
            color={activeRoute === 'Home' ? '#ff9900' : '#666'}
          />
          <Text style={[
            styles.tabLabel,
            activeRoute === 'Home' && styles.activeTabLabel
          ]}>Home</Text>
        </View>
      </TouchableOpacity>
     
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate('Notifications')}
      >
        <View style={styles.tabContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={activeRoute === 'Notifications' ? 'notifications' : 'notifications-outline'}
              size={24}
              color={activeRoute === 'Notifications' ? '#ff9900' : '#666'}
            />
            {notificationCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabLabel,
            activeRoute === 'Notifications' && styles.activeTabLabel
          ]}>Notifications</Text>
        </View>
      </TouchableOpacity>
     
      <TouchableOpacity
        style={styles.tab}
        onPress={handleCartPress}
      >
        <View style={styles.tabContent}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={activeRoute === 'Cart' ? 'cart' : 'cart-outline'}
              size={24}
              color={activeRoute === 'Cart' ? '#ff9900' : '#666'}
            />
            {cartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartCount}</Text>
              </View>
            )}
          </View>
          <Text style={[
            styles.tabLabel,
            activeRoute === 'Cart' && styles.activeTabLabel
          ]}>Cart</Text>
        </View>
      </TouchableOpacity>
     
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.navigate('UserProfile')}
      >
        <View style={styles.tabContent}>
          <Ionicons
            name={activeRoute === 'Profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeRoute === 'Profile' ? '#ff9900' : '#666'}
          />
          <Text style={[
            styles.tabLabel,
            activeRoute === 'Profile' && styles.activeTabLabel
          ]}>Profile</Text>
        </View>
      </TouchableOpacity>
     
      {userRole === 'admin' && (
        <TouchableOpacity
          style={styles.tab}
          onPress={() => navigation.navigate('AdminHome')}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name={activeRoute === 'AdminHome' ? 'settings' : 'settings-outline'}
              size={24}
              color={activeRoute === 'AdminHome' ? '#ff9900' : '#666'}
            />
            <Text style={[
              styles.tabLabel,
              activeRoute === 'AdminHome' && styles.activeTabLabel
            ]}>Admin</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#ff9900',
    fontWeight: '500',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default BottomNav;