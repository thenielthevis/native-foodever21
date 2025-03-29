const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const { placeOrder, getUserOrders, deleteOrderedProducts } = require('../controllers/order');

router.post('/place-order', protect, placeOrder);
router.get('/user-orders/:userId', protect, getUserOrders);
router.delete('/delete-ordered-products', protect, deleteOrderedProducts);

module.exports = router;
