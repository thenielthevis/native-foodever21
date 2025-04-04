import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './Redux/Store/store'; // Update this import
import Home from './Screens/Home/Home';
import ProductDetails from './Screens/Product/ProductDetails';
import Search from './Screens/Search/Search';
import Signin from './Screens/User/Signin';
import Signup from './Screens/User/Signup';
import UserProfile from './Screens/User/UserProfile';
import EditProfile from './Screens/User/EditProfile';
import CartScreen from './Screens/Cart/CartScreen';
import Payment from './Screens/Cart/Checkout/Payment';
import Confirm from './Screens/Cart/Checkout/Confirm';
import Checkout from './Screens/Cart/Checkout/Checkout';
import AdminHome from './Screens/Admin/AdminHome';  // Add this import
import AdminOrders from './Screens/Admin/AdminOrders';  // Add this import
import AdminUsers from './Screens/Admin/AdminUsers';  // Add this import
import AdminRevenue from './Screens/Admin/AdminRevenue';  // Add this import
import AdminProducts from './Screens/Admin/AdminProducts';  // Add this import

// Add these imports for push notifications
import { useState, useEffect, useRef } from 'react';
import { registerForPushNotificationsAsync, setupNotifications } from './utils/pushNotifications';
import { auth } from './firebaseConfig'; 
// Import DrawerNavigator
import DrawerNavigator from './Navigators/DrawerNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const Stack = createNativeStackNavigator();

export default function App() {
  const navigationRef = useRef(null);
  // Add state for notifications
  const [notification, setNotification] = useState(null);

  // Setup push notifications
  useEffect(() => {
    // Setup auth state listener to register for push notifications when user logs in
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (user) {
        console.log('User logged in, registering for push notifications');
        
        // Register for push notifications when user logs in
        try {
          const token = await registerForPushNotificationsAsync();
          console.log('Push notification registration complete', token ? 'success' : 'no token');
        } catch (error) {
          console.error('Failed to register for push notifications:', error);
        }
      } else {
        console.log('User logged out, no push notification registration needed');
      }
    });

    // Setup notification listeners regardless of auth state
    const notificationCleanup = setupNotifications(setNotification);

    // Cleanup on unmount
    return () => {
      unsubscribeAuth();
      notificationCleanup();
    };
  }, []);
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navigationRef}
            onReady={() => {
              console.log('Navigation container is ready');
            }}
          >
            <StatusBar style="auto" />
            <Stack.Navigator 
              screenOptions={{
                headerShown: false
              }}
              initialRouteName="DrawerHome"
            >
              <Stack.Screen 
                name="DrawerHome" 
                component={DrawerNavigator}
                options={{
                  animationEnabled: false // Disable animation for drawer screen
                }}
              />
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="ProductDetails" component={ProductDetails} />
              <Stack.Screen name="Search" component={Search} />
              <Stack.Screen name="Signin" component={Signin} />
              <Stack.Screen name="Signup" component={Signup} />
              <Stack.Screen name="UserProfile" component={UserProfile} />
              <Stack.Screen name="AdminHome" component={AdminHome} />
              <Stack.Screen name="AdminOrders" component={AdminOrders} />
              <Stack.Screen name="AdminUsers" component={AdminUsers} />
              <Stack.Screen name="AdminRevenue" component={AdminRevenue} />
              <Stack.Screen name="AdminProducts" component={AdminProducts} />
              <Stack.Screen name="CartScreen" component={CartScreen} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen name="Confirm" component={Confirm} />
              <Stack.Screen 
                name="Payment" 
                component={Payment}
                options={{ 
                  headerShown: true,
                  title: 'Payment'
                }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});