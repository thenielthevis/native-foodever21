const upload = require('../utils/multer');
const { admin, db } = require('../utils/firebaseAdminConfig');
const User = require('../models/userModel');
const cloudinary = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
  const { username, email, password, firebaseUid, role, status, userImage, cloudinary_id } = req.body;

  try {
      // Hash the password before saving to MongoDB
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user document
      const newUser = new User({
          username,
          email,
          password: hashedPassword, // Save the hashed password
          firebaseUid,
          role: role || 'user',
          status: status || 'active',
          userImage,
          cloudinary_id,
      });

      await newUser.save();
      res.status(201).json({ message: 'User registered successfully in MongoDB.' });
  } catch (error) {
      console.error('Error saving user to MongoDB:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Check if email exists in Firebase Authentication
exports.checkEmail = async (req, res) => {
  const { email } = req.params;

  try {
    // Check if user exists in Firebase Authentication
    const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    return res.status(200).json({ exists: true, uid: userRecord.uid });
  } catch (error) {
    // If the user doesn't exist in Firebase, return false
    if (error.code === 'auth/user-not-found') {
      return res.status(200).json({ exists: false });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Delete a user by email from Firebase Authentication
exports.deleteUser = async (req, res) => {
  const { email } = req.params;

  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email.trim().toLowerCase());
    
    // Delete the user from Firebase Authentication
    await admin.auth().deleteUser(userRecord.uid);

    return res.status(200).json({ message: `User with email ${email} deleted successfully` });
  } catch (error) {
    // Handle errors (user not found or other issues)
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Authenticate the user using Firebase Authentication (get user details from Firebase)
    const userRecord = await admin.auth().getUserByEmail(email);

    // Fetch the user's information from Firestore using the Firebase UID
    const userDoc = await db.collection('users').doc(userRecord.uid).get();

    // Check if the user document exists
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found in Firestore' });
    }

    const user = userDoc.data();

    // Send the user information along with a success message
    res.status(200).json({
      message: 'User logged in successfully',
      user: {
        username: user.username,
        email: user.email,
        status: user.status,  // Assuming status is a field in your user document
        avatarURL: user.avatarURL,  // Assuming avatarURL is a field in your user document
      },
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Login failed' });
  }
};

// Controller function to handle user update
exports.updateUser = async (req, res) => {
  const { email, password, username } = req.body;
  const userId = req.user.uid; // Assuming user ID is available in req.user
  try {
    // Update user details in Firebase Authentication
    const userRecord = await admin.auth().updateUser(userId, {
      email,
      password,
      displayName: username,
    });
    // Respond with success message and updated user details
    res.status(200).json({ message: 'User updated successfully', user: userRecord });
  } catch (error) {
    // Respond with error message if user update fails
    res.status(400).json({ message: error.message });
  }
};

// Controller function to handle password reset
exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    // Generate a password reset link for the given email
    const link = await admin.auth().generatePasswordResetLink(email);
    // Send the link to the user's email address
    // You can use a service like SendGrid, Mailgun, etc. to send the email
    res.status(200).json({ message: 'Password reset email sent. Please check your inbox.', link });
  } catch (error) {
    // Respond with error message if password reset fails
    res.status(400).json({ message: error.message });
  }
};

exports.uploadAvatar = [
  upload.single('image'),
  async (req, res) => {
    const imageFile = req.file;

    if (!imageFile) {
      return res.status(400).json({ message: 'Image file is required.' });
    }

    try {
      // Upload image to Cloudinary
      const uploadResponse = await cloudinary.uploader.upload(imageFile.path, { folder: 'user_images' });
      const imageUrl = uploadResponse.secure_url;

      res.status(201).json({ message: 'Image uploaded successfully', secure_url: imageUrl });
    } catch (error) {
      console.error("Error during image upload:", error.message);
      res.status(400).json({ message: error.message });
    } 
  }
];

exports.getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // Fetch user details from Firestore (Firebase)
    const userDoc = await db.collection('users').doc(firebaseUid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found in Firestore" });
    }

    // Fetch user details from MongoDB using Firebase UID
    const mongoUser = await User.findOne({ firebaseUid });

    if (!mongoUser) {
      return res.status(404).json({ message: "User not found in MongoDB" });
    }

    // Merge Firestore and MongoDB data
    const user = {
      _id: mongoUser._id, // Include MongoDB ID
      username: mongoUser.username || userDoc.data().username,
      email: mongoUser.email || userDoc.data().email,
      status: mongoUser.status || userDoc.data().status,
      avatarURL: mongoUser.userImage || userDoc.data().avatarURL,
      role: mongoUser.role || "guest",
    };

    res.status(200).json({
      message: "User retrieved successfully",
      user,
    });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
};

exports.saveFcmToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ message: 'User ID and FCM token are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.fcmToken = fcmToken;
    await user.save();

    res.status(200).json({ message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    res.status(500).json({ message: 'Failed to save FCM token' });
  }
};

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken; // Attach the decoded user to the request
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error.message);
    return res.status(403).json({ message: 'Failed to verify token', error: error.message });
  }
};

exports.getUserData = async (req, res) => {
  const { uid } = req.user;

  try {
      // Fetch from Firestore
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
          console.error('Firestore: No such document for UID:', uid);
          return res.status(404).json({ message: 'User not found in Firestore.' });
      }
      const firestoreData = userDoc.data();
      console.log('Fetched Firestore data:', firestoreData);

      // Fetch from MongoDB
      const mongoUser = await User.findOne({ firebaseUid: uid });
      if (!mongoUser) {
          console.error('MongoDB: No user found for UID:', uid);
          return res.status(404).json({ message: 'User not found in MongoDB.' });
      }
      console.log('Fetched MongoDB data:', mongoUser);

      // Combine the data
      const userData = {
          ...firestoreData,
          ...mongoUser.toObject(),
      };

      res.status(200).json({ user: userData });
  } catch (error) {
      console.error('Error fetching user data:', error.message);
      res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.addToOrderList = async (req, res) => {
  try {
    const { userId, product_id, quantity } = req.body;

    if (!userId || !product_id || !quantity) {
      return res.status(400).json({ message: 'User ID, product ID, and quantity are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the product is already in the order list
    const existingItem = user.orderlist.find(
      item => item.product_id.toString() === product_id.toString()
    );

    if (existingItem) {
      // Update quantity if item exists
      existingItem.quantity += quantity;
    } else {
      // Add new item to the order list
      user.orderlist.push({ product_id, quantity });
    }

    await user.save();
    res.status(200).json({ message: 'Item added to order list successfully.', orderlist: user.orderlist });
  } catch (error) {
    console.error('Error adding to order list:', error);
    res.status(500).json({ message: 'Failed to add item to order list.' });
  }
};

// Add this function to get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json({ users });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Fetch from MongoDB
    const mongoUsers = await User.find();
    
    // Fetch from Firestore
    const firestoreSnapshot = await db.collection('users').get();
    const firestoreUsers = firestoreSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Combine the data
    const allUsers = [...mongoUsers.map(user => user.toObject()), ...firestoreUsers];
    
    res.status(200).json({ message: 'Users fetched successfully.', users: allUsers });
  } catch (error) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({ message: 'Failed to fetch users.', error: error.message });
  }
};

exports.updateFcmToken = async (req, res) => { 
  const { fcmToken } = req.body;  // Get FCM token from request body

  if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
  }

  try {
      // The user is authenticated by the 'protect' middleware
      const user = req.user;  // User data is attached by 'protect' middleware

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Update the FCM token in the user model
      user.fcmToken = fcmToken;
      await user.save();

      return res.status(200).json({ message: 'FCM token updated successfully' });
  } catch (error) {
      console.error('Error updating FCM token:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};
