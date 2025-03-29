const OrderList = require('../models/Orderlist');
const User = require('../models/userModel');
const Product = require('../models/Product'); 
const { admin, db } = require('../utils/firebaseAdminConfig');

exports.addToOrderList = async (req, res) => {
  try {
    const { product_id, user_id, quantity } = req.body;
    
    console.log('AddToOrderList - Request:', {
      product_id,
      user_id,
      quantity,
      headers: req.headers
    });

    if (!product_id || !user_id || !quantity) {
      console.log('AddToOrderList - Missing fields:', { product_id, user_id, quantity });
      return res.status(400).json({ message: 'Product ID, User ID, and Quantity are required.' });
    }

    // Verify user matches authenticated user
    const authenticatedUserId = req.user._id;
    if (authenticatedUserId.toString() !== user_id) {
      console.log('AddToOrderList - User mismatch:', {
        authenticated: authenticatedUserId,
        requested: user_id
      });
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Verify user existence and match with authenticated user
    const user = await User.findById(user_id);
    if (!user) {
      console.log("OrderList - User not found in MongoDB:", user_id);
      return res.status(404).json({ message: 'User not found.' });
    }

    console.log("OrderList - User verified:", {
      id: user._id,
      email: user.email,
      firebaseUid: user.firebaseUid
    });

    // Verify product existence
    const product = await Product.findById(product_id);
    if (!product) {
      console.log("Product not found for product_id:", product_id);
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Check if the product already exists in the user's order list
    const existingOrder = await OrderList.findOne({ product_id, user_id });

    if (existingOrder) {
      console.log("Existing order found. Updating quantity...");
      existingOrder.quantity += quantity;
      await existingOrder.save();

      // Populate product details for response
      await existingOrder.populate('product_id');
      
      const finalPrice = product.discountedPrice || product.price;
      
      return res.status(200).json({
        message: 'Order list updated successfully.',
        order: {
          ...existingOrder.toObject(),
          calculatedPrice: finalPrice * existingOrder.quantity
        }
      });
    }

    // Create a new order entry if it doesn't exist
    console.log("Creating a new order...");
    const newOrder = new OrderList({
      product_id,
      user_id,
      quantity,
    });

    await newOrder.save();
    await newOrder.populate('product_id');

    const finalPrice = product.discountedPrice || product.price;

    console.log("Order created successfully.");

    return res.status(201).json({
      message: 'Product added to order list successfully.',
      order: {
        ...newOrder.toObject(),
        calculatedPrice: finalPrice * quantity
      }
    });
  } catch (error) {
    console.error('AddToOrderList - Error:', error);
    res.status(500).json({ 
      message: 'Failed to add product to order list',
      error: error.message
    });
  }
};

exports.getUserId = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    console.log("Extracted Token:", token);

    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log("Decoded Token:", decodedToken);

    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ message: 'Email not found in token.' });
    }

    console.log("Extracted Email:", email);

    // Find the user in MongoDB by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Respond with the user's ID
    res.status(200).json({ user_id: user._id });
  } catch (error) {
    console.error('Error fetching user ID:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// Example route handler
exports.getOrderListCount = async (req, res) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('Getting count for user:', userId);

    // Get all orders and sum up quantities
    const orders = await OrderList.find({ user_id: userId });
    const totalItems = orders.reduce((sum, order) => sum + (order.quantity || 0), 0);
    
    console.log('Total items count (sum of quantities):', totalItems);
    
    res.status(200).json({ count: totalItems });
  } catch (error) {
    console.error('Error in getOrderListCount:', error);
    res.status(500).json({ message: 'Failed to get order count', error: error.message });
  }
};

exports.getUserOrderList = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    // Decode Firebase token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Find the user in MongoDB by Firebase UID
    const user = await User.findOne({ firebaseUid: userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Fetch all order list items for this user
    const orders = await OrderList.find({ user_id: user._id }).populate('product_id');

    if (orders.length === 0) {
      return res.status(200).json({ message: 'No items in the order list.', orders: [] });
    }

    // Map the orders with product and user details
    const formattedOrders = orders.map((order) => ({
      order_id: order._id,
      product: {
        id: order.product_id._id,
        name: order.product_id.name,
        description: order.product_id.description,
        price: order.product_id.price,
        discountedPrice: order.product_id.discountedPrice,
        image: order.product_id.images[0]?.url || '', // Assuming product has an `images` array
      },
      quantity: order.quantity,
      timestamp: order.timestamp,
    }));

    res.status(200).json({ orders: formattedOrders });
  } catch (error) {
    console.error('Error fetching user order list:', error);
    res.status(500).json({ message: 'Failed to fetch user order list.' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Find the user in MongoDB using Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Extract the `orderId` from the request params
    const { orderId } = req.params;

    // Find and delete the order that matches the user and order ID
    const deletedOrder = await OrderList.findOneAndDelete({
      _id: orderId, // Match the order ID
      user_id: user._id, // Match the MongoDB user ID
    });

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order deleted successfully.', order: deletedOrder });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Failed to delete order.', error });
  }
};

exports.updateOrderQuantity = async (req, res) => {
  try {
    const { orderId } = req.params; // Extract orderId from the route params
    const { quantity } = req.body; // Extract the new quantity from the request body

    // Check if quantity is valid
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: 'Quantity must be greater than 0.' });
    }

    // Find the order and update its quantity
    const updatedOrder = await OrderList.findByIdAndUpdate(
      orderId,
      { quantity },
      { new: true } // Return the updated document
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json({
      message: 'Order quantity updated successfully.',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order quantity:', error);
    res.status(500).json({ message: 'Failed to update order quantity.' });
  }
};