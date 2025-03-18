const Order = require('../models/Order');
const User = require('../models/userModel');
const OrderList = require('../models/Orderlist');

// Place a new order
exports.placeOrder = async (req, res) => {
  try {
    const { userId, products, paymentMethod } = req.body;

    const user = await User.findOne({ firebaseUid: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create the order
    const order = new Order({
      userId: user._id,
      products,
      paymentMethod,
      status: 'shipping',
    });

    await order.save();

    res.status(201).json({
      message: 'Order placed successfully',
      order,
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      message: 'Failed to place order',
      error: error.message,
    });
  }
};

// Get user order history
exports.getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;

    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).populate('products.productId', 'name price image');

    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: 'No orders found for this user.' });
    }

    res.status(200).json({ message: 'User order history retrieved successfully.', orders });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Failed to fetch user orders.', error: error.message });
  }
};

exports.deleteOrderedProducts = async (req, res) => {
  try {
    const { userId, productIds } = req.body;

    // Validate inputs
    if (!userId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'Invalid request data. Ensure userId and productIds are provided.' });
    }

    // Resolve MongoDB _id from Firebase UID
    const user = await User.findOne({ firebaseUid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Perform delete operation using resolved user._id
    const result = await OrderList.deleteMany({
      user_id: user._id,
      product_id: { $in: productIds },
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No matching products found to delete.' });
    }

    res.status(200).json({ message: 'Ordered products removed successfully.' });
  } catch (error) {
    console.error('Error removing ordered products:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};