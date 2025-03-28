import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Import the UserProvider
import { UserProvider } from './Context/Store/AuthGlobal';
import Home from './Screens/Home/Home';
import Signin from './Screens/User/Signin';
import Signup from './Screens/User/Signup';
import UserProfile from './Screens/User/UserProfile';
// Add this import for EditProfile component
import EditProfile from './Screens/User/EditProfile';

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
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <Stack.Navigator initialRouteName="signin">
            <Stack.Screen 
              name="Home" 
              component={Home}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="signin" 
              component={Signin}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="signup" 
              component={Signup}
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="profile"
              component={UserProfile}
              options={{ headerShown: false }}
            />

            {/* Fix: Changed comment syntax to proper JSX comment */}
            <Stack.Screen 
              name="EditProfile" 
              component={EditProfile} 
              options={{ headerShown: false }} 
            />
          </Stack.Navigator>
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
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