// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: 'cassleyannesquivel@gmail.com', // Replace with your Gmail address
//     pass: 'lceo nqrj bwhv bxii' // Replace with your Gmail password or app-specific password
//   }
// });

// // Function to send order confirmation email
// const sendOrderConfirmationEmail = async (email, orderDetails) => {
//   // Destructure the order details (already passed from frontend)
//   const { subtotal, taxes, shippingFee, finalTotal, products, paymentMethod } = orderDetails;

//   // Format the product details (if applicable)
//   const productDetails = products
//     .map(product => `${product.productName} (ID: ${product.productId}) - Quantity: ${product.quantity} - ₱${product.total.toFixed(2)} (₱${product.price} x ${product.quantity})`)
//     .join('\n');

//   // Create the email content with the details provided
//   const emailContent = `
//     Thank you for your order!

//     Here are your order details:

//     Products:
//     ${productDetails}

//     Subtotal: ₱${subtotal.toFixed(2)}
//     Shipping: ₱${shippingFee.toFixed(2)}
//     Taxes: ₱${taxes.toFixed(2)}
//     Grand Total: ₱${finalTotal.toFixed(2)}

//     Payment Method: ${paymentMethod}
//   `;

//   const mailOptions = {
//     from: 'cassleyannesquivel@gmail.com', // Replace with your Gmail address
//     to: email,
//     subject: 'Order Confirmation',
//     text: emailContent,
//   };

//   try {
//     await transporter.sendMail(mailOptions);
//     console.log('Order confirmation email sent successfully');
//   } catch (error) {
//     console.error('Error sending order confirmation email:', error);
//     throw error; // Propagate the error to the caller
//   }
// };

// // Export the function
// module.exports = sendOrderConfirmationEmail;
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'cassleyannesquivel@gmail.com', // Replace with your Gmail address
    pass: 'lceo nqrj bwhv bxii' // Replace with your Gmail password or app-specific password
  }
});

// Function to send order confirmation email
const sendOrderConfirmationEmail = async (email, orderDetails) => {
  // Destructure the order details (already passed from frontend)
  const { subtotal, taxes, shippingFee, finalTotal, products, paymentMethod } = orderDetails;

  // Format the product details without the productId
  const productDetails = products
    .map(product => `${product.productName} - Quantity: ${product.quantity} - ₱${product.total.toFixed(2)} (₱${product.price} x ${product.quantity})`)
    .join('\n');

  // Create the email content with the details provided
  const emailContent = `
    Thank you for your order with FoodEver 21! We’re excited to get your order to you as soon as possible.

    Here are your order details:

    Products:
    ${productDetails}

    Subtotal: ₱${subtotal.toFixed(2)}
    Shipping: ₱${shippingFee.toFixed(2)}
    Taxes: ₱${taxes.toFixed(2)}
    Grand Total: ₱${finalTotal.toFixed(2)}

    Payment Method: ${paymentMethod}
    You can track your order or make changes to your details by logging into your account.

    If you have any questions, please don’t hesitate to contact us at support@foodever21.com.

    Thank you for choosing FoodEver 21!

    Best regards,  
    FoodEver 21 Team
  `;

  const mailOptions = {
    from: 'cassleyannesquivel@gmail.com', // Replace with your Gmail address
    to: email,
    subject: 'Order Confirmation',
    text: emailContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent successfully');
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error; // Propagate the error to the caller
  }
};

// Export the function
module.exports = sendOrderConfirmationEmail;
