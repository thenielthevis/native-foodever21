const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Log which project ID we're using to help with debugging
console.log('Initializing Firebase Admin with project ID:', serviceAccount.project_id);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // No need to hardcode these values - they're included in the serviceAccount
  // projectId: serviceAccount.project_id,
  // databaseURL is only needed if you're using Realtime Database
  databaseURL: `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`,
});

const db = admin.firestore();

module.exports = { admin, db };