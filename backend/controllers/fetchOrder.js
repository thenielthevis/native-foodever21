const Order = require('../models/Order');
const User = require('../models/userModel');
const { admin, db } = require('../utils/firebaseAdminConfig');


const getOrdersData = async (req, res) => {
  try {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const getAllOrders = async (req, res) => {
  try {
    // Check if request is authenticated
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized. Authentication required." });
    }
   
    // Optional: Check if user has admin role if you have roles in your app
    // if (req.user.role !== 'admin') {
    //   return res.status(403).json({ message: "Forbidden. Admin access required." });
    // }


    const { startDate, endDate } = req.query;


    if (startDate && isNaN(Date.parse(startDate))) {
      return res.status(400).json({ message: "Invalid startDate format" });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({ message: "Invalid endDate format" });
    }


    const query = {};
    if (startDate) {
      query.createdAt = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = new Date(endDate);
    }


    // Get all orders with populated data
    let orders = await Order.find(query)
      .populate('products.productId')
      .populate('userId');


    // If no orders found, return mock data for testing
    if (!orders || orders.length === 0) {
      console.log("No orders found, returning mock data");
      const mockOrders = [
        {
          _id: "mock1",
          userId: { username: "Demo User", _id: "user1" },
          products: [
            {
              productId: { name: "Burger", price: 9.99 },
              quantity: 2
            }
          ],
          status: "shipping",
          timestamp: new Date(),
          paymentMethod: "cash_on_delivery"
        },
        {
          _id: "mock2",
          userId: { username: "Test Customer", _id: "user2" },
          products: [
            {
              productId: { name: "Pizza", price: 12.99 },
              quantity: 1
            }
          ],
          status: "completed",
          timestamp: new Date(),
          paymentMethod: "credit_card"
        }
      ];
      return res.json(mockOrders);
    }


    // Return the orders array directly for admin orders screen
    return res.json(orders);
  } catch (error) {
    console.error("Error in getAllOrders:", error.stack);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const getAllStatuses = async (req, res) => {
    try {
      const statuses = await Order.aggregate([
        {
          $unwind: "$products"
        },
        {
          $lookup: {
            from: 'products',
            localField: 'products.productId',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $unwind: "$productDetails"
        },
        {
          $group: {
            _id: "$_id",
            status: { $first: "$status" },
            products: { $push: "$productDetails.name" }
          }
        },
        {
          $project: {
            orderId: "$_id",
            status: 1,
            products: 1,
            _id: 0
          }
        }
      ]);
      res.json(statuses);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };


  const updateOrderStatus = async (req, res) => {
    try {
      // Check if request is authenticated
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized. Authentication required." });
      }
     
      // Check if the order being updated is already completed or cancelled
      const { orderId } = req.params;
      const { status } = req.body;
     
      // First check if order exists and get current status
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
     
      // Prevent updates to completed or cancelled orders
      if (order.status === 'completed' || order.status === 'cancelled') {
        return res.status(400).json({
          message: 'Cannot update status: Order is already marked as completed or cancelled',
          currentStatus: order.status
        });
      }
 
      // Find and update the order status
      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status },
        { new: true }
      );
 
      if (!updatedOrder) {
        return res.status(404).json({ message: 'Order not found' });
      }
 
      // Get the user who placed the order (assuming the userId is stored in the order)
      const user = await User.findById(updatedOrder.userId); // Adjust this based on your Order schema
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
 
      // Send a push notification to the user
      const fcmToken = user.fcmToken;
      if (fcmToken) {
        const payload = {
          notification: {
            title: 'Order Status Updated',
            body: `Your order ${orderId} has been ${status}.`,
          },
          token: fcmToken,
          data: {
          userId: updatedOrder.userId.toString(),
          orderId: orderId.toString(),
          },
        };
 
        // Send notification via FCM
        await admin.messaging().send(payload);
        console.log('Notification sent successfully');
      } else {
        console.log('FCM token not found for the user');
      }
 
      // Respond with the updated order
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
 
module.exports = { getOrdersData, getAllOrders, getAllStatuses, updateOrderStatus };