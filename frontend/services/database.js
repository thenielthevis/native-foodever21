// import * as SQLite from 'expo-sqlite';

// const db = SQLite.openDatabase('foodever.db');

// export const initDatabase = () => {
//   return new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         `CREATE TABLE IF NOT EXISTS cart_items (
//           id INTEGER PRIMARY KEY AUTOINCREMENT,
//           order_id TEXT,
//           product_id TEXT,
//           quantity INTEGER,
//           product_data TEXT,
//           user_id TEXT
//         );`,
//         [],
//         () => resolve(),
//         (_, error) => reject(error)
//       );
//     });
//   });
// };

// export const saveCartItem = (orderItem, userId) => {
//   return new Promise((resolve, reject) => {
//     const productData = JSON.stringify(orderItem.product);
    
//     db.transaction(tx => {
//       tx.executeSql(
//         `INSERT OR REPLACE INTO cart_items (order_id, product_id, quantity, product_data, user_id) 
//          VALUES (?, ?, ?, ?, ?);`,
//         [orderItem.order_id, orderItem.product.id, orderItem.quantity, productData, userId],
//         (_, result) => resolve(result),
//         (_, error) => reject(error)
//       );
//     });
//   });
// };

// export const getCartItems = (userId) => {
//   return new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         'SELECT * FROM cart_items WHERE user_id = ?;',
//         [userId],
//         (_, { rows: { _array } }) => {
//           const items = _array.map(item => ({
//             order_id: item.order_id,
//             product: JSON.parse(item.product_data),
//             quantity: item.quantity
//           }));
//           resolve(items);
//         },
//         (_, error) => reject(error)
//       );
//     });
//   });
// };

// export const clearCart = (userId) => {
//   return new Promise((resolve, reject) => {
//     db.transaction(tx => {
//       tx.executeSql(
//         'DELETE FROM cart_items WHERE user_id = ?;',
//         [userId],
//         (_, result) => resolve(result),
//         (_, error) => reject(error)
//       );
//     });
//   });
// };
