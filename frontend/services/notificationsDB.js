import * as SQLite from 'expo-sqlite';

let db = null;

export const initNotificationsDB = async () => {
  try {
    if (!db) {
      console.log('Opening notifications database...');
      db = await SQLite.openDatabaseAsync('notifications.db');
      
      // First, check if we need to add the type column
      const tableInfo = await db.getAllAsync(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications';"
      );

      if (tableInfo.length > 0) {
        // Check if type column exists
        const hasTypeColumn = tableInfo[0].sql.toLowerCase().includes('type text');
        
        if (!hasTypeColumn) {
          console.log('Adding type column to notifications table...');
          try {
            // Add new column to existing table
            await db.execAsync(
              "ALTER TABLE notifications ADD COLUMN type TEXT DEFAULT 'ORDER_STATUS_UPDATE';"
            );
            console.log('Type column added successfully');
          } catch (alterError) {
            console.error('Error adding type column:', alterError);
            
            // If altering fails, recreate the table
            console.log('Recreating notifications table...');
            await db.execAsync('DROP TABLE IF EXISTS notifications;');
            await createNotificationsTable();
          }
        }
      } else {
        // Table doesn't exist, create it
        await createNotificationsTable();
      }
      
      return db;
    }
    return db;
  } catch (error) {
    console.error('Notifications DB initialization error:', error);
    throw error;
  }
};

const createNotificationsTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT DEFAULT 'ORDER_STATUS_UPDATE',
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Notifications table created successfully');
};

export const saveNotification = async (userId, title, body, data = {}, type = 'ORDER_STATUS_UPDATE') => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    console.log(`Saving ${type} notification to SQLite:`, {
      userId,
      title,
      body,
      data: JSON.stringify(data)
    });

    await db.runAsync(
      'INSERT INTO notifications (user_id, title, body, data, type) VALUES (?, ?, ?, ?, ?)',
      [userId, title, body, JSON.stringify(data), type]
    );
    
    // Log the saved notification
    const lastNotification = await db.getFirstAsync(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    console.log('Successfully saved notification:', lastNotification);
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
};

export const getNotifications = async (userId) => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    const notifications = await db.getAllAsync(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return notifications.map(n => ({
      ...n,
      data: JSON.parse(n.data || '{}')
    }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
};

export const getUnreadCount = async (userId) => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    const result = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0',
      [userId]
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

export const markAsRead = async (notificationId) => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    await db.runAsync(
      'UPDATE notifications SET read = 1 WHERE id = ?',
      [notificationId]
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const dropNotificationsDB = async () => {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
    }
    await SQLite.deleteAsync('notifications.db');
    console.log('Notifications database dropped successfully');
  } catch (error) {
    console.error('Error dropping notifications database:', error);
    throw error;
  }
};

export const clearAllNotifications = async (userId) => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    await db.runAsync(
      'DELETE FROM notifications WHERE user_id = ?',
      [userId]
    );
    console.log('All notifications cleared successfully');
  } catch (error) {
    console.error('Error clearing notifications:', error);
    throw error;
  }
};

// Add new methods for filtering notifications by type
export const getNotificationsByType = async (userId, type) => {
  if (!db) {
    db = await initNotificationsDB();
  }

  try {
    const notifications = await db.getAllAsync(
      'SELECT * FROM notifications WHERE user_id = ? AND type = ? ORDER BY created_at DESC',
      [userId, type]
    );
    return notifications.map(n => ({
      ...n,
      data: JSON.parse(n.data || '{}')
    }));
  } catch (error) {
    console.error(`Error getting ${type} notifications:`, error);
    throw error;
  }
};
