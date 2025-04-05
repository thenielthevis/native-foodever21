import * as SQLite from 'expo-sqlite';

let db = null;

export const initDatabase = async () => {
  try {
    if (!db) {
      console.log('Opening database...');
      db = await SQLite.openDatabaseAsync('cartdb.db');
      
      // Check if table exists
      const tableInfo = await db.getFirstAsync(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='cart_items'"
      );
      
      if (!tableInfo) {
        console.log('Creating cart_items table...');
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            product_name TEXT NOT NULL,
            product_price REAL NOT NULL,
            product_image TEXT,
            quantity INTEGER DEFAULT 1,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Cart items table created successfully');
      }
    }
    return db;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Ensure db is initialized before any operation
const ensureDatabase = async () => {
  if (!db) {
    db = await initDatabase();
  }
  return db;
};

export const getCartItemCount = async (userId) => {
  await ensureDatabase();

  try {
    const result = await db.getFirstAsync(
      'SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?',
      [userId]
    );
    return result?.total || 0;
  } catch (error) {
    console.error('Error getting cart item count:', error);
    return 0;
  }
};

export const saveCartItem = async (userId, product, quantity) => {
  await ensureDatabase();

  try {
    // Check if product exists for this user
    const existingItem = await db.getFirstAsync(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product._id]
    );

    if (existingItem) {
      await db.runAsync(
        'UPDATE cart_items SET quantity = quantity + ? WHERE user_id = ? AND product_id = ?',
        [quantity, userId, product._id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO cart_items (
          user_id,
          product_id, 
          product_name, 
          product_price, 
          product_image, 
          quantity
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
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

export const getCartItems = async (userId) => {
  await ensureDatabase();

  try {
    const items = await db.getAllAsync(
      'SELECT * FROM cart_items WHERE user_id = ? ORDER BY timestamp DESC',
      [userId]
    );
    console.log('Current Cart Items:');
    items.forEach(item => {
      console.log(`Product: ${item.product_name}, Quantity: ${item.quantity}`);
    });
    return items;
  } catch (error) {
    console.error('Error getting cart items:', error);
    throw error;
  }
};

export const clearCartItems = async (userId) => {
  await ensureDatabase();

  try {
    await db.runAsync('DELETE FROM cart_items WHERE user_id = ?', [userId]);
  } catch (error) {
    console.error('Error clearing cart items:', error);
    throw error;
  }
};

export const updateCartItemQuantity = async (userId, productId, quantity) => {
  await ensureDatabase();

  try {
    await db.runAsync(
      'UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?',
      [quantity, userId, productId]
    );
  } catch (error) {
    console.error('Error updating cart item quantity:', error);
    throw error;
  }
};

export const deleteCartItem = async (userId, productId) => {
  await ensureDatabase();

  try {
    await db.runAsync('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [userId, productId]);
  } catch (error) {
    console.error('Error deleting cart item:', error);
    throw error;
  }
};

export const getCartTotalCount = async (userId) => {
  try {
    await ensureDatabase();
    const result = await db.getFirstAsync(
      'SELECT SUM(quantity) as total FROM cart_items WHERE user_id = ?',
      [userId]
    );
    return result?.total || 0;
  } catch (error) {
    console.error('Error getting cart total count:', error);
    return 0;
  }
};
