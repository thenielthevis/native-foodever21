import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { getNotifications, initNotificationsDB, clearAllNotifications } from '../../services/notificationsDB';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Initialize database first
      await initNotificationsDB();
      console.log('Notifications database initialized');
      
      const userData = await SecureStore.getItemAsync('userData');
      if (!userData) {
        console.log('No user data found');
        return;
      }

      const { firebaseUid } = JSON.parse(userData);
      console.log('Loading notifications for user:', firebaseUid);
      
      // Get notifications from SQLite
      const userNotifications = await getNotifications(firebaseUid);
      console.log('Loaded notifications:', userNotifications.length);
      
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setIsInitializing(false);
    }
  };

  const handleClearNotifications = async () => {
    try {
      const userData = await SecureStore.getItemAsync('userData');
      if (!userData) return;

      const { firebaseUid } = JSON.parse(userData);

      Alert.alert(
        "Clear Notifications",
        "Are you sure you want to clear all notifications?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Clear",
            style: "destructive",
            onPress: async () => {
              setIsClearing(true);
              await clearAllNotifications(firebaseUid);
              await loadNotifications();
              setIsClearing(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error clearing notifications:', error);
      setIsClearing(false);
    }
  };

  // Update the useEffect to match CartScreen's pattern
  useEffect(() => {
    const initNotifications = async () => {
      try {
        setIsInitializing(true);
        await loadNotifications();
      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initNotifications();
    const unsubscribe = navigation.addListener('focus', loadNotifications);
    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Update the render logic to match CartScreen's pattern
  if (isInitializing || loading || isClearing) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  const renderNotification = ({ item }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.read && styles.unreadNotification]}
      onPress={() => {
        // Only navigate to notification details
        navigation.navigate('NotificationDetails', { notification: item });
      }}
    >
      <View style={styles.notificationIcon}>
        <Ionicons 
          name={item.data?.type === 'ORDER_STATUS_UPDATE' ? 'receipt-outline' : 'notifications-outline'}
          size={24} 
          color="#FF8C00" 
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody}>{item.body}</Text>
        <Text style={styles.notificationTime}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={handleClearNotifications}
          >
            <Ionicons name="trash-outline" size={24} color="#FF8C00" />
          </TouchableOpacity>
        )}
      </View>
      {notifications.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="notifications-off-outline" size={48} color="#999" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => `notification-${item.id}`}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF8C00']}
              tintColor="#FF8C00"
              progressBackgroundColor="#ffffff"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#FFF9EC',
  },
  notificationIcon: {
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  unreadDot: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF8C00',
  },
  clearButton: {
    padding: 8,
  },
});

export default NotificationsScreen;
