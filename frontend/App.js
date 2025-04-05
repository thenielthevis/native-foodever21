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
import NotificationsScreen from './Screens/Notifications/NotificationsScreen'; // Add this import
import NotificationDetails from './Screens/Notifications/NotificationDetails';

// Add these imports for push notifications
import { useState, useEffect, useRef } from 'react';
import { registerForPushNotificationsAsync, setupNotifications } from './utils/pushNotifications';
import { auth } from './firebaseConfig'; 
// Import DrawerNavigator
import DrawerNavigator from './Navigators/DrawerNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { initNotificationsDB } from './services/notificationsDB';

const Stack = createNativeStackNavigator();

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const navigationRef = useRef(null);
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

  useEffect(() => {
    const setupApp = async () => {
      await initNotificationsDB();

      const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
        console.log('Notification response:', response);
        
        const { notification } = response;
        const notificationData = notification.request.content.data;
        console.log('Notification data:', notificationData);

        // Create a properly structured notification object
        const notificationObj = {
          id: null,
          title: notification.request.content.title,
          body: notification.request.content.body,
          data: notificationData,
          created_at: notification.date
        };

        if (notificationData.type === 'PRODUCT_DISCOUNT') {
          console.log('Navigating to product notification:', notificationObj);
          navigationRef.current?.navigate('NotificationDetails', {
            notification: {
              ...notificationObj,
              data: {
                ...notificationObj.data,
                screen: 'NotificationDetails'
              }
            }
          });
        } else if (notificationData.type === 'ORDER_STATUS_UPDATE') {
          console.log('Navigating to order notification:', notificationObj);
          navigationRef.current?.navigate('NotificationDetails', {
            notification: {
              ...notificationObj,
              data: {
                ...notificationObj.data,
                screen: 'NotificationDetails'
              }
            }
          });
        }
      });

      return () => subscription.remove();
    };

    setupApp();
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
              <Stack.Screen 
                name="Notifications" 
                component={NotificationsScreen}
                options={{
                  headerShown: false
                }}
              />
              <Stack.Screen 
                name="NotificationDetails" 
                component={NotificationDetails}
                options={{
                  headerShown: false
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