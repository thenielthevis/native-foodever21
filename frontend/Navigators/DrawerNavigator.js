import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import Home from '../Screens/Home/Home';
import UserProfile from '../Screens/User/UserProfile';
import CartScreen from '../Screens/Cart/CartScreen';
import CustomDrawerContent from '../Screens/Shared/StyledComponents/CustomDrawerContent';
import { COLORS, SHADOWS } from '../constants/theme';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  const [hasUserData, setHasUserData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkUserData = async () => {
      try {
        const userData = await SecureStore.getItemAsync('userData');
        setHasUserData(!!userData);
      } catch (error) {
        console.log('Error checking user data:', error);
        setHasUserData(false);
      } finally {
        setIsInitialized(true);
      }
    };
    
    checkUserData();
  }, []);

  if (!isInitialized) {
    return null; // or a loading spinner
  }

  return (
    <Drawer.Navigator
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
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
          drawerLabel: 'My Cart',
          title: 'My Cart',
          headerShown: true, // Show the header for the CartScreen
        }}
      />
      
      <Drawer.Screen
        name="OrderHistory"
        component={Home}
        options={{
          drawerIcon: ({color, size}) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
          drawerLabel: 'Order History',
        }}
      />

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