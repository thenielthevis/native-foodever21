import * as SQLite from 'expo-sqlite';

let db = null;

export const initDatabase = async () => {
  try {
    if (!db) {
      console.log('Opening database...');
      db = await SQLite.openDatabaseAsync('cartdb.db');
      
      // Create table using execAsync
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS cart_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          product_price REAL NOT NULL,
          product_image TEXT,
          quantity INTEGER DEFAULT 1,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('Database initialized successfully');
      return db;
    }
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const saveCartItem = async (product, quantity) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    // First check if product exists
    const existingItem = await db.getFirstAsync(
      'SELECT * FROM cart_items WHERE product_id = ?',
      [product._id]
    );

    if (existingItem) {
      // Update existing item
      await db.runAsync(
        'UPDATE cart_items SET quantity = quantity + ? WHERE product_id = ?',
        [quantity, product._id]
      );
    } else {
      // Insert new item
      await db.runAsync(
        `INSERT INTO cart_items (
          product_id, 
          product_name, 
          product_price, 
          product_image, 
          quantity
        ) VALUES (?, ?, ?, ?, ?)`,

        [
          product._id,
          product.name,
          product.discountedPrice || product.price,
          product.images?.[0]?.url || '',
          quantity
        ]
      );
    }
  } catch (error) {
    console.error('Error saving cart item:', error);
    throw error;
  }
};

export const getCartItems = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    return await db.getAllAsync('SELECT * FROM cart_items ORDER BY timestamp DESC');
  } catch (error) {
    console.error('Error getting cart items:', error);
    throw error;
  }
};

export const clearCartItems = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    await db.runAsync('DELETE FROM cart_items');
  } catch (error) {
    console.error('Error clearing cart items:', error);
    throw error;
  }
};

export const updateCartItemQuantity = async (productId, quantity) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    await db.runAsync(
      'UPDATE cart_items SET quantity = ? WHERE product_id = ?',
      [quantity, productId]
    );
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw error;
  }
};

export const deleteCartItem = async (productId) => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    await db.runAsync('DELETE FROM cart_items WHERE product_id = ?', [productId]);
  } catch (error) {
    console.error('Error deleting cart item:', error);
    throw error;
  }
};

export const getCartItemCount = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await db.getFirstAsync('SELECT SUM(quantity) as total FROM cart_items');
    return result?.total || 0;
  } catch (error) {
    console.error('Error getting cart item count:', error);
    throw error;
  }
};

export const getCartTotalCount = async () => {
  if (!db) {
    throw new Error('Database not initialized');
  }

  try {
    const result = await db.getFirstAsync(
      'SELECT SUM(quantity) as total FROM cart_items'
    );
    return result?.total || 0;
  } catch (error) {
    console.error('Error getting cart total count:', error);
    throw error;
  }
};
