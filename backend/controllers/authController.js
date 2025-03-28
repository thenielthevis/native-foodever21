const upload = require('../utils/multer');
const { admin, db } = require('../utils/firebaseAdminConfig');
const User = require('../models/userModel');
const cloudinary = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
  const { username, email, password, firebaseUid, role, status, userImage, cloudinary_id } = req.body;

  try {
    console.log('Signup request received for:', email, firebaseUid);
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { firebaseUid }] 
    });

    if (existingUser) {
      // User already exists, return success instead of error
      console.log('User already exists, returning existing user data');
      return res.status(200).json({
        message: 'User already exists in the system',
        uid: existingUser.firebaseUid,
        user: {
          _id: existingUser._id,
          email: existingUser.email,
          username: existingUser.username,
          role: existingUser.role,
          status: existingUser.status
        }
      });
    }

    // Rest of your existing code...
    console.log('Creating new user in MongoDB and Firestore');
    
    // Make sure password is defined before hashing
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      // Create a secure random password if none provided
      const randomPassword = Math.random().toString(36).slice(-8);
      hashedPassword = await bcrypt.hash(randomPassword, 10);
    }

    // Create user in MongoDB
    const newUser = new User({
      username: username || 'User',
      email,
      password: hashedPassword, // Use the hashed password
      firebaseUid,
      role: role || 'user',
      status: status || 'active',
      userImage, // Add the userImage URL
      cloudinary_id // Add the cloudinary_id for future reference
    });

    await newUser.save();
    
    // Also create a record in Firestore if used
    if (db) {
      await db.collection('users').doc(firebaseUid).set({
        username: username || 'User',
        email,
        status: 'active',
        avatarURL: userImage || null // Store the image URL in Firestore as well
      });
    }
    
    res.status(201).json({ 
      message: 'User registered successfully in Firebase and MongoDB.',
      uid: firebaseUid,
      user: {
        _id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

exports.updateUser = async (req, res) => {
  const { email, password, username, firebaseUid, userImage } = req.body;
  
  try {
    console.log('Update user request - received data:', req.body);
    console.log('Extracted firebaseUid from request body:', firebaseUid);
    
    // Use firebaseUid from request body
    if (!firebaseUid || typeof firebaseUid !== 'string' || firebaseUid.length === 0 || firebaseUid.length > 128) {
      return res.status(400).json({ 
        message: 'The uid must be a non-empty string with at most 128 characters.' 
      });
    }
    
    console.log('Updating user with Firebase UID:', firebaseUid);
      
    // Validation
    const updates = {};
    const errors = [];
    
    // Check if at least one field is provided
    if (!email && !password && !username && !userImage) {
      return res.status(400).json({ message: 'At least one field (email, password, username, or userImage) is required' });
    }
    
    // Username validation and update
    if (username) {
      if (username.length < 3) {
        errors.push('Username must be at least 3 characters long');
      } else {
        updates.displayName = username;
      }
    }
    
    // Email validation and update
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      } else {
        updates.email = email;
      }
    }
    
    // Password validation and update
    if (password) {
      if (password.length < 6) {
        errors.push('Password must be at least 6 characters long');
      } else {
        updates.password = password;
      }
    }
    
    // Add photoURL to updates if userImage is provided
    if (userImage) {
      updates.photoURL = userImage;
    }
    
    // If there are validation errors, return them
    if (errors.length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }
    
    console.log('Updating Firebase user with UID:', firebaseUid);
    console.log('Updates to apply:', Object.keys(updates));
    
    // Update user details in Firebase Authentication
    const userRecord = await admin.auth().updateUser(firebaseUid, updates);
    
    // Also update in MongoDB
    const mongoUser = await User.findOne({ firebaseUid: firebaseUid });
    if (mongoUser) {
      if (email) mongoUser.email = email;
      if (username) mongoUser.username = username;
      if (userImage) mongoUser.userImage = userImage;
      await mongoUser.save();
      console.log('Updated MongoDB user');
    } else {
      console.log('MongoDB user not found for UID:', firebaseUid);
    }
    
    // Update in Firestore if needed
    if (db) {
      const firestoreUpdates = {};
      if (email) firestoreUpdates.email = email;
      if (username) firestoreUpdates.username = username;
      if (userImage) firestoreUpdates.avatarURL = userImage;
      
      if (Object.keys(firestoreUpdates).length > 0) {
        await db.collection('users').doc(firebaseUid).update(firestoreUpdates);
        console.log('Updated Firestore user');
      }
    }
    
    // Respond with success message and updated user details
    res.status(200).json({ 
      message: 'User updated successfully', 
      user: userRecord 
    });
  } catch (error) {
    console.error('Error updating user:', error);
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

// Update the getCurrentUser method:

exports.getCurrentUser = async (req, res) => {
  try {
    // The user is already attached to req.user by the protect middleware
    const user = req.user;
    
    console.log('GET /me - User from protect middleware:', user);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Fetch additional Firestore data if needed
    let firestoreData = {};
    try {
      const userDoc = await db.collection('users').doc(user.firebaseUid).get();
      if (userDoc.exists) {
        firestoreData = userDoc.data();
      }
    } catch (firestoreError) {
      console.error('Error fetching Firestore data:', firestoreError);
      // Continue without Firestore data if it fails
    }
    
    // Return combined user data
    res.status(200).json({
      message: 'User retrieved successfully',
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        status: user.status,
        userImage: user.userImage || firestoreData.avatarURL,
        // Include other fields as needed
      }
    });
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({ message: 'Failed to fetch user details' });
  }
};

exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: 'FCM token is required' });
    }

    // Get the user from the request (set by the protect middleware)
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update the user's FCM token with timestamp
    user.fcmToken = fcmToken;
    user.fcmTokenStatus = 'active';
    user.fcmTokenUpdatedAt = new Date();
    
    await user.save();

    res.status(200).json({ 
      message: 'FCM token saved successfully',
      tokenStatus: 'active'
    });
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

      // Update the FCM token with timestamp and status
      await user.updateFcmToken(fcmToken);

      return res.status(200).json({ 
          message: 'FCM token updated successfully',
          tokenStatus: 'active',
          updatedAt: user.fcmTokenUpdatedAt
      });
  } catch (error) {
      console.error('Error updating FCM token:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};

exports.removeFcmToken = async (req, res) => {
  try {
      const user = req.user;

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      // Even if token is null, we should update status to inactive
      user.fcmTokenStatus = 'inactive';
      await user.save();

      return res.status(200).json({ 
          message: 'FCM token invalidated successfully' 
      });
  } catch (error) {
      console.error('Error invalidating FCM token:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};

// Add a function to clean up stale tokens (could be run periodically)
exports.cleanStaleTokens = async (req, res) => {
  try {
      // Only allow admins to perform this operation
      if (req.user.role !== 'admin') {
          return res.status(403).json({ message: 'Not authorized to perform this action' });
      }
      
      const staleDate = new Date();
      staleDate.setMonth(staleDate.getMonth() - 1); // Tokens older than 1 month
      
      // Find users with active tokens that haven't been updated for a month
      const result = await User.updateMany(
          { 
              fcmTokenStatus: 'active',
              fcmTokenUpdatedAt: { $lt: staleDate }
          },
          {
              $set: { fcmTokenStatus: 'inactive' }
          }
      );
      
      return res.status(200).json({ 
          message: 'Stale tokens cleaned successfully',
          tokensInvalidated: result.nModified
      });
  } catch (error) {
      console.error('Error cleaning stale tokens:', error);
      return res.status(500).json({ message: 'Internal server error' });
  }
};
