const Order = require('../models/Order');
const User = require('../models/userModel');
const OrderList = require('../models/Orderlist');

// Place a new order
exports.placeOrder = async (req, res) => {
  try {
    const { userId, products, paymentMethod } = req.body;

    console.log('Placing order with data:', {
      userId,
      productsCount: products?.length,
      paymentMethod
    });

    if (!userId || !products || !Array.isArray(products) || !paymentMethod) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid order data. Required: userId, products array, and paymentMethod' 
      });
    }

    const user = await User.findOne({ firebaseUid: userId });
    if (!user) {
      console.error('User not found for firebaseUid:', userId);
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const order = new Order({
      userId: user._id,
      products: products.map(p => ({
        productId: p.productId,
        quantity: p.quantity
      })),
      paymentMethod,
      status: 'shipping',
    });

    const savedOrder = await order.save();
    console.log('Order saved successfully:', savedOrder._id);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order',
      error: error.message
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
    console.log('Deleting products:', { userId, productIds });

    if (!userId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid request data' 
      });
    }

    const user = await User.findOne({ firebaseUid: userId });
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    const result = await OrderList.deleteMany({
      user_id: user._id,
      product_id: { $in: productIds }
    });

    console.log('Delete result:', result);

    res.status(200).json({ 
      success: true,
      message: 'Ordered products removed successfully',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error removing ordered products:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to remove products from cart' 
    });
  }
};