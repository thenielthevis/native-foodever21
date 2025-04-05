const Order = require('../models/Order');
const User = require('../models/userModel');

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
    console.log('Request headers authorization:', req.headers.authorization?.substring(0, 20) + '...');
    
    // Extract Firebase UID - it looks like it's already being extracted properly
    const firebaseUid = req.user?.uid || req.user?.firebaseUid || req.user?.user_id;
    
    console.log('Firebase UID from request:', firebaseUid);
    
    if (!firebaseUid) {
      console.log('No Firebase UID found in request');
      return res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        orders: [] 
      });
    }

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      console.log(`No user found in database for Firebase UID: ${firebaseUid}`);
      return res.status(200).json({ 
        success: true,
        message: 'No user found',
        orders: [] 
      });
    }

    console.log(`Found user in database: ${user.username || user.email} (ID: ${user._id})`);
    
    // Check if the user has any orders
    const orderCount = await Order.countDocuments({ userId: user._id });
    console.log(`User has ${orderCount} orders in database`);
    
    const orders = await Order.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .populate('products.productId', 'name price image');

    console.log(`Found ${orders.length} orders for user`);

    const formattedOrders = orders.map(order => ({
      _id: order._id,
      products: order.products,
      status: order.status,
      createdAt: order.createdAt,
      paymentMethod: order.paymentMethod,
      orderNumber: `ORD-${order._id.toString().slice(-6)}`,
      totalPrice: order.products.reduce((total, prod) => {
        return total + ((prod.productId?.price || 0) * prod.quantity);
      }, 0)
    }));

    res.status(200).json({ 
      success: true,
      message: orders.length > 0 ? 'Orders retrieved successfully.' : 'No orders found for this user.',
      orders: formattedOrders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching orders',
      orders: [],
      error: error.message 
    });
  }
};

exports.deleteOrderedProducts = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
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

    res.status(200).json({ 
      success: true,
      message: 'Operation completed successfully'
    });
  } catch (error) {
    console.error('Error in operation:', error);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error' 
    });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'username email')
      .populate('products.productId')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: `ORD-${order._id.toString().slice(-4)}`,
      customer: order.userId.username,
      date: order.createdAt,
      amount: order.products.reduce((total, item) => 
        total + (item.productId.price * item.quantity), 0),
      status: order.status,
      items: order.products.map(item => ({
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.price
      }))
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate('userId', 'username email')
     .populate('products.productId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json({
      id: order._id,
      orderNumber: `ORD-${order._id.toString().slice(-4)}`,
      customer: order.userId.username,
      date: order.createdAt,
      amount: order.products.reduce((total, item) => 
        total + (item.productId.price * item.quantity), 0),
      status: order.status,
      items: order.products.map(item => ({
        name: item.productId.name,
        quantity: item.quantity,
        price: item.productId.price
      }))
    });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ message: 'Error updating order' });
  }
};