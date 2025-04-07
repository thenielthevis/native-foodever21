import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushNotificationToken } from '../Redux/Actions/Auth.actions';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    // Set notification channel for Android
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      // Get the Expo push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });
      
      // Get both original and formatted tokens
      const originalToken = tokenData.data;
      console.log('Original Expo Push Token:', originalToken);

      // Extract just the token part without ExponentPushToken[]
      const formattedToken = originalToken.replace('ExponentPushToken[', '').replace(']', '');
      console.log('Formatted Token:', formattedToken);

      // Wait to ensure auth token is available
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the stored auth token
      const authToken = await SecureStore.getItemAsync('jwt');
      if (!authToken) {
        console.error('No authentication token found in storage');
        return null;
      }

      // Make API call with formatted token
      try {
        const response = await fetch(`${API_URL}/auth/update-fcm-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ 
            fcmToken: formattedToken, // Use formatted token here
            deviceType: Platform.OS,
            tokenType: 'expo'
          })
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(errorData || 'Failed to update FCM token on server');
        }

        console.log('FCM token successfully updated on server');
        return formattedToken; // Return formatted token
      } catch (error) {
        console.error('Token update error:', error);
        return null;
      }
    } catch (error) {
      console.error('Push notification setup error:', error);
      return null;
    }
  }

  return null;
}

// Add this function to handle token removal
export async function removePushNotificationToken() {
  try {
    const response = await fetch(`${API_URL}/auth/remove-fcm-token`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await SecureStore.getItemAsync('jwt')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove FCM token');
    }
    
    return true;
  } catch (error) {
    console.error('Error removing FCM token:', error);
    return false;
  }
}

// Setup notification listeners
export function setupNotifications(setNotification) {
  // When a notification is received while the app is foregrounded
  const notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      setNotification(notification);
    }
  );

  // When a user taps on a notification (works for both foreground and background)
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('Notification tapped:', response);
      // You can add navigation logic here
    }
  );

  // Return cleanup function
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}