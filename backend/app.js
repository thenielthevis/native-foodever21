const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { admin } = require('./utils/firebaseAdminConfig'); // Import admin instance

const products = require('./routes/product');
const authRoute = require('./routes/authRoute');
const orderListRoutes = require('./routes/orderlist');
const orderRoutes = require('./routes/order');
const orderRoute = require('./routes/orderRoute');

// Middleware
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.json({ limit: "50mb" }));
app.use(
  cors({
    origin: ['http://localhost:5000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Expires', 'Pragma'],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Firebase Cloud Messaging setup
const messaging = admin.messaging(); // Initialize messaging instance

// Example route to send a push notification
app.post('/api/v1/send-notification', async (req, res) => {
  const { token, title, body } = req.body; // Token sent from the client app
  const message = {
    notification: {
      title: title || 'Default Title',
      body: body || 'Default Body',
    },
    token: token, // FCM device token from the front-end
  };

  try {
    const response = await messaging.send(message); // Send the notification
    console.log('Notification sent successfully:', response);
    res.status(200).json({ success: true, response });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Routes
app.use('/api/v1', products);
app.use('/api/v1', orderListRoutes);
app.use('/api/v1', orderRoutes);
app.use('/api/auth', authRoute);
app.use('/api/v1', orderRoute);

module.exports = app;
