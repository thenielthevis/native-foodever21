const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const { placeOrder, getUserOrders, deleteOrderedProducts, getAllOrders, updateOrder } = require('../controllers/order');

router.post('/place-order', protect, placeOrder);
router.get('/user-orders/:userId', protect, getUserOrders);
router.delete('/delete-ordered-products', protect, deleteOrderedProducts);

// Admin routes
router.get('/admin/orders', protect, getAllOrders);
router.put('/admin/orders/:orderId/status', protect, updateOrder);

module.exports = router;
