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

    const orders = await Order.find(query)
      .populate('products.productId')
      .populate('userId');

    const ordersByMonth = orders.reduce((acc, order) => {
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!acc[month]) {
        acc[month] = { month, products: {} };
      }

      order.products.forEach(product => {
    
        if (!product.productId) {
          console.warn(`Product ID is null for order ${order._id}`);
          return;
        }

        const productId = product.productId._id.toString();
        if (!acc[month].products[productId]) {
          acc[month].products[productId] = { name: product.productId.name, quantity: 0 };
        }
        acc[month].products[productId].quantity += product.quantity;
      });

      return acc;
    }, {});

    // Format the grouped data into the required response structure
    const groupedOrders = Object.values(ordersByMonth).map(monthData => {
      const mostBoughtProduct = Object.values(monthData.products).reduce((max, product) => {
        return product.quantity > max.quantity ? product : max;
      }, { name: '', quantity: 0 });

      return {
        month: monthData.month,
        mostBoughtProduct: mostBoughtProduct.name,
        quantity: mostBoughtProduct.quantity,
      };
    });

    res.json(groupedOrders);
  } catch (error) {
    console.error("Error in getAllOrders:", error.stack); // Log full error details
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
      const { orderId } = req.params;
      const { status } = req.body;
  
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