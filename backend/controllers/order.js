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
      .populate({
        path: 'userId',
        select: 'username email firebaseUid'
      })
      .populate('products.productId', 'name price image')
      .sort({ createdAt: -1 });

    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: `ORD-${order._id.toString().slice(-4)}`,
      customer: order.userId?.username || 'Unknown',
      customerEmail: order.userId?.email,
      date: order.createdAt,
      amount: order.products.reduce((total, item) => 
        total + ((item.productId?.price || 0) * item.quantity), 0),
      status: order.status,
      items: order.products.map(item => ({
        name: item.productId?.name || 'Unknown Product',
        quantity: item.quantity,
        price: item.productId?.price || 0
      }))
    }));

    res.json(formattedOrders);
  } catch (error) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching orders',
      error: error.message 
    });
  }
};

exports.updateOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ 
        success: false,
        message: 'Order ID and status are required' 
      });
    }

    // Validate status value
    const validStatuses = ['shipping', 'completed', 'cancelled'];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Fetch and populate the complete order data
    const updatedOrder = await Order.findById(orderId)
      .populate('userId', 'username email firebaseUid')
      .populate({
        path: 'products.productId',
        select: 'name price image'
      });

    if (!updatedOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    updatedOrder.status = status.toLowerCase();
    await updatedOrder.save();

    // Format the response with complete order details
    const formattedOrder = {
      id: updatedOrder._id,
      userId: updatedOrder.userId.firebaseUid,
      orderNumber: `ORD-${updatedOrder._id.toString().slice(-4)}`,
      customer: updatedOrder.userId.username,
      date: updatedOrder.createdAt,
      status: updatedOrder.status,
      paymentMethod: updatedOrder.paymentMethod,
      products: updatedOrder.products.map(item => ({
        productId: {
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.image
        },
        quantity: item.quantity
      })),
      amount: updatedOrder.products.reduce((total, item) => 
        total + (item.productId.price * item.quantity), 0
      )
    };

    res.json({
      success: true,
      order: formattedOrder
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message
    });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'username email firebaseUid')
      .populate('products.productId');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Format the order data
    const formattedOrder = {
      id: order._id,
      userId: order.userId.firebaseUid,
      orderNumber: `ORD-${order._id.toString().slice(-4)}`,
      customer: order.userId.username,
      date: order.createdAt,
      status: order.status,
      paymentMethod: order.paymentMethod,
      products: order.products.map(item => ({
        productId: {
          name: item.productId.name,
          price: item.productId.price,
          image: item.productId.image
        },
        quantity: item.quantity
      })),
      amount: order.products.reduce((total, item) => 
        total + (item.productId.price * item.quantity), 0
      )
    };

    res.json(formattedOrder);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching order details'
    });
  }
};