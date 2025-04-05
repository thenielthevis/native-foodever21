import * as Notifications from 'expo-notifications';
import { saveNotification } from '../services/notificationsDB';
import axios from 'axios';
import { API_URL } from '@env';
import * as SecureStore from 'expo-secure-store';
import { getOrderById } from '../Redux/Actions/orderActions';

export const sendOrderStatusNotification = async (order, newStatus) => {
  try {
    console.log('Initial order data:', order);

    // Fetch complete order data if needed
    if (!order.products) {
      const orderDetails = await getOrderById(order.id);
      order = { ...order, ...orderDetails };
    }

    // Format order summary for notification
    const title = 'Order Status Updated';
    const body = `${order.orderNumber} status changed to ${newStatus.toUpperCase()}`;

    // Prepare notification data
    const notificationData = {
      type: 'ORDER_STATUS_UPDATE',
      orderId: order.id,
      status: newStatus,
      screen: 'NotificationDetails',
      orderNumber: order.orderNumber,
      products: order.products,
      customer: order.customer,
      orderDate: order.date || order.createdAt,
      paymentMethod: order.paymentMethod,
      userId: order.userId
    };

    // Save to local DB
    await saveNotification(order.userId, title, body, notificationData);

    // Send push notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: notificationData,
      },
      trigger: null,
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

// Helper function for basic notifications
const sendBasicNotification = async (userId, title, body, orderId, status) => {
  await saveNotification(userId, title, body, {
    type: 'ORDER_STATUS_UPDATE',
    orderId: orderId,
    status: status,
    screen: 'NotificationDetails'
  });

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        screen: 'NotificationDetails',
        orderId: orderId,
        type: 'ORDER_STATUS_UPDATE',
        status: status
      },
    },
    trigger: null,
  });
};

export const sendProductDiscountNotification = async (product) => {
  try {
    console.log('Starting product discount notification for:', product);

    if (!product.discount || product.discount <= 0) {
      console.log('No discount to notify for:', product.name);
      return;
    }

    const title = `${product.name} is on ${product.discount}% discount!`;
    const body = 'Order Now!!';
    
    // Calculate discounted price if not provided
    const discountedPrice = product.discountedPrice || 
      (product.price - (product.price * (product.discount / 100)));

    // Prepare notification data
    const notificationData = {
      type: 'PRODUCT_DISCOUNT',
      productId: product._id,
      productName: product.name,
      image: product.images?.[0]?.url || null,
      discount: product.discount,
      price: product.price,
      discountedPrice: discountedPrice,
      screen: 'NotificationDetails'  // Add this to ensure consistent navigation
    };

    // Get all users
    const users = await getAllUsers();
    console.log(`Sending notifications to ${users.length} users`);

    // Send notification to each user
    const successfulNotifications = [];
    const failedNotifications = [];

    for (const user of users) {
      try {
        console.log(`Processing notification for user:`, user);
        
        // Save to local database with specific type
        await saveNotification(
          user.firebaseUid, 
          title, 
          body, 
          notificationData, 
          'PRODUCT_DISCOUNT'
        );
        console.log(`Notification saved to database for user: ${user.firebaseUid}`);

        // Schedule push notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: notificationData,
            sound: true,
            badge: 1,
          },
          trigger: null,
        });
        console.log(`Push notification sent to user: ${user.firebaseUid}`);
        
        successfulNotifications.push(user.firebaseUid);
      } catch (error) {
        console.error(`Error sending notification to user ${user.firebaseUid}:`, error);
        failedNotifications.push({ userId: user.firebaseUid, error: error.message });
      }
    }

    console.log('Product discount notifications completed:', {
      successful: successfulNotifications.length,
      failed: failedNotifications.length
    });

    return {
      successful: successfulNotifications,
      failed: failedNotifications
    };
  } catch (error) {
    console.error('Error in sendProductDiscountNotification:', error);
    throw error;
  }
};

// Helper function to get all users
const getAllUsers = async () => {
  try {
    const token = await SecureStore.getItemAsync('jwt');
    const currentUserData = await SecureStore.getItemAsync('userData');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;

    console.log('Current user:', currentUser);

    if (!currentUser || !currentUser.firebaseUid) {
      console.log('No valid current user found');
      return [];
    }

    const response = await axios.get(`${API_URL}/auth/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // If we can't get other users, at least notify the current user
    if (!response.data.users || response.data.users.length === 0) {
      console.log('No users found in response, using current user');
      return [currentUser];
    }

    // Include current user in notifications
    const allUsers = response.data.users.map(user => ({
      ...user,
      firebaseUid: user.firebaseUid || user.uid || null
    }));

    // Add current user if not already included
    if (!allUsers.some(user => user.firebaseUid === currentUser.firebaseUid)) {
      allUsers.push(currentUser);
    }

    const validUsers = allUsers.filter(user => user.firebaseUid);
    console.log(`Found ${validUsers.length} users with valid firebaseUid`);

    return validUsers;
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fallback to current user
    const currentUserData = await SecureStore.getItemAsync('userData');
    const currentUser = currentUserData ? JSON.parse(currentUserData) : null;
    return currentUser?.firebaseUid ? [currentUser] : [];
  }
};
