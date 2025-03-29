import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import store from './Redux/Store/cartStore';
import { UserProvider } from './Redux/Store/AuthGlobal';
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

// Add these imports for push notifications
import { useState, useEffect } from 'react';
import { registerForPushNotificationsAsync, setupNotifications } from './utils/pushNotifications';
import { auth } from './firebaseConfig'; 

const Stack = createNativeStackNavigator();

export default function App() {
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
    <Provider store={store}>
      <UserProvider>
        <SafeAreaProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator 
              initialRouteName="Home"
              screenOptions={{
                headerShown: false
              }}
            >
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="ProductDetails" component={ProductDetails} />
              <Stack.Screen name="Search" component={Search} />
              <Stack.Screen name="signin" component={Signin} />
              <Stack.Screen name="signup" component={Signup} />
              <Stack.Screen name="profile" component={UserProfile} />
              <Stack.Screen name="EditProfile" component={EditProfile} />
              <Stack.Screen 
                name="Cart" 
                component={CartScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen 
                name="Confirm" 
                component={Confirm}
                options={{ 
                  headerShown: true,
                  title: 'Confirm Order'
                }}
              />
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
      </UserProvider>
    </Provider>
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