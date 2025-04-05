const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const { placeOrder, getUserOrders, deleteOrderedProducts, getAllOrders, updateOrder, getOrderById } = require('../controllers/order');

router.post('/place-order', protect, placeOrder);
router.get('/user-orders/:userId', protect, getUserOrders);
router.delete('/delete-ordered-products', protect, deleteOrderedProducts);

// Admin routes
router.get('/admin/orders', protect, getAllOrders);
router.put('/admin/orders/:orderId/status', protect, updateOrder);
router.get('/admin/orders/:orderId', protect, getOrderById);

module.exports = router;
