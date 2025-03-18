const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const adminProtect = require('../middleware/adminprotect');
const userProtect = require('../middleware/userprotect');
const sendOrderConfirmationEmail = require('../controllers/sendEmail');

const { placeOrder, getUserOrders, deleteOrderedProducts,
    updateOrderStatus,
 } = require('../controllers/order');

router.post('/place-order', protect, placeOrder);
router.get('/user-orders/:userId', protect, getUserOrders);
router.delete('/delete-ordered-products', protect, deleteOrderedProducts);

router.post('/send-order-confirmation', protect, async (req, res) => {
  const { email, orderDetails } = req.body;

  if (!email || !orderDetails || !orderDetails.products || orderDetails.products.length === 0) {
    return res.status(400).send({ error: 'Invalid data: Email and order details are required.' });
  }

  try {
    await sendOrderConfirmationEmail(email, orderDetails);
    console.log('Email sent successfully');
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('Error in /send-order-confirmation route:', error);

    if (process.env.NODE_ENV === 'development') {
      return res.status(500).send({ error: error.stack || error.message });
    } else {
      return res.status(500).send({ error: 'Failed to send order confirmation email.' });
    }
  }
});

module.exports = router;
