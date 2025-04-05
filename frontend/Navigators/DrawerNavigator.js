import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { View } from 'react-native';

import Home from '../Screens/Home/Home';
import UserProfile from '../Screens/User/UserProfile';
import CartScreen from '../Screens/Cart/CartScreen';
import CustomDrawerContent from '../Screens/Shared/StyledComponents/CustomDrawerContent';
import { COLORS, SHADOWS } from '../constants/theme';
import UserOrdersScreen from '../Screens/User/UserOrdersScreen';
import AdminNavigator from './AdminNavigator';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  const [hasUserData, setHasUserData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const checkUserData = async () => {
      try {
        const userData = await SecureStore.getItemAsync('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          setHasUserData(true);
          setUserRole(parsedData.role || 'user');
        }
      } catch (error) {
        console.log('Error checking user data:', error);
        setHasUserData(false);
      } finally {
        // Add a small delay to ensure smooth initialization
        setTimeout(() => {
          setIsInitialized(true);
        }, 100);
      }
    };
    
    checkUserData();
  }, []);

  // Return empty view while initializing instead of null
  if (!isInitialized) {
    return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
  }

  return (
    <Drawer.Navigator
      useLegacyImplementation={false}
      drawerContent={props => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerActiveBackgroundColor: COLORS.primary,
        drawerActiveTintColor: COLORS.white,
        drawerInactiveTintColor: COLORS.darkGray,
        drawerLabelStyle: {
          marginLeft: 8, // Increased spacing between icon and text
          fontSize: 16,
          fontWeight: '500',
        },
        drawerStyle: {
          width: 280,
          backgroundColor: COLORS.white,
          ...SHADOWS.medium,
        },
        drawerItemStyle: {
          borderRadius: 10,
          paddingVertical: 5, // Added vertical padding for better touch targets
          marginVertical: 3,
          marginHorizontal: 5,
        },
        drawerIconStyle: {
          width: 24, // Fixed width for icons
          height: 24, // Fixed height for icons
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        component={Home}
        options={{
          drawerIcon: ({color, size}) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          drawerLabel: 'Home',
          title: 'Home'
        }}
      />
      
      <Drawer.Screen
        name="CartScreen"
        component={CartScreen}
        options={{
          drawerIcon: ({color, size}) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
          drawerLabel: 'My Orderlist',
          title: 'My Orderlist',
          headerShown: true, // Show the header for the CartScreen
        }}
      />
      
      {hasUserData && (
        <Drawer.Screen
          name="UserOrdersScreen"
          component={UserOrdersScreen}
          options={{
            drawerIcon: ({color, size}) => (
              <MaterialIcons name="history" size={size} color={color} />
            ),
            drawerLabel: 'Order History',
            title: 'Order History',
          }}
        />
      )}

      {userRole === 'admin' && (
        <Drawer.Screen
          name="AdminHome"
          component={AdminNavigator}  // Changed from Home to AdminNavigator
          options={{
            drawerIcon: ({color, size}) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
            drawerLabel: 'Admin Dashboard',
            headerShown: false  // Add this to prevent double headers
          }}
        />
      )}

      {!hasUserData && (
        <Drawer.Screen
          name="Signin"
          component={UserProfile}
          options={{
            drawerIcon: ({color, size}) => (
              <Ionicons name="log-in-outline" size={size} color={color} />
            ),
            drawerLabel: 'Sign In / Sign Up',
          }}
        />
      )}
      
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;