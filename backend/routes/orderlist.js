const express = require('express');
const router = express.Router();
const protect = require('../middleware/protect');
const adminProtect = require('../middleware/adminprotect');
const userProtect = require('../middleware/userprotect');
const { addToOrderList,
    getUserId,
    getOrderListCount,
    getUserOrderList,
    deleteOrder,
    updateOrderQuantity
 } = require('../controllers/orderlist');

// Route to add an item to the order list
router.route('/add-to-orderlist')
    .post(protect, addToOrderList);
router.get('/get-user-id', getUserId);
router.get('/get-orderlist-count', protect, getOrderListCount);
router.get('/user-orderlist', protect, getUserOrderList);
router.delete('/delete-order/:orderId', protect, deleteOrder);
router.put('/update-order/:orderId', protect, updateOrderQuantity);

module.exports = router;
