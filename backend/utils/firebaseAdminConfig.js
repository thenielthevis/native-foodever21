const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Ensure this path is correct

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "foodever21-7618e", // Replace with your actual project ID
  databaseURL: 'https://foodever21-7618e-default-rtdb.asia-southeast1.firebasedatabase.app', // Replace with your actual database URL
});

const db = admin.firestore();

module.exports = { admin, db };