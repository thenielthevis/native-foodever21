const express = require('express');
const { getOrdersData, getAllOrders, getAllStatuses, updateOrderStatus } = require('../controllers/fetchOrder');
const router = express.Router();
const protect = require('../middleware/protect');
// const adminProtect = require('../middleware/adminprotect');
// const userProtect = require('../middleware/userprotect');

router.get('/orders/status', adminProtect, getOrdersData);
router.get('/orders', adminProtect, getAllOrders);
router.get('/orders/statuses', adminProtect, getAllStatuses);
router.put('/orders/statuses/:orderId', updateOrderStatus);


module.exports = router;