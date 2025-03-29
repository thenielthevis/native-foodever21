const upload = require('../utils/multer');
const { admin, db } = require('../utils/firebaseAdminConfig');
const User = require('../models/userModel');
const cloudinary = require('../utils/cloudinary');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
  try {
    console.log('Signup request received:', {
      ...req.body,
      password: '[HIDDEN]'
    });
    
    const { username, email, password, firebaseUid, userImage } = req.body;

    // Validate required fields
    if (!email || !firebaseUid) {
      return res.status(400).json({ 
        message: 'Email and Firebase UID are required' 
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() }, 
        { firebaseUid }
      ] 
    });

    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      return res.status(200).json({
        message: 'User already exists',
        user: existingUser
      });
    }

    // Create new user
    const newUser = new User({
      username: username || 'User',
      email: email.toLowerCase(),
      password: password,
      firebaseUid,
      role: 'user',
      status: 'active',
      userImage: userImage || null
    });

    const savedUser = await newUser.save();
    console.log('User saved successfully:', savedUser.email);

    res.status(201).json({
      message: 'User registered successfully',
      user: savedUser
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Failed to create user',
      error: error.message
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
  const { email, uid } = req.body;

  try {
    console.log('Login request received for:', email);
    
    let user = await User.findOne({ firebaseUid: uid });
    
    if (!user) {
      console.log('Creating new user in MongoDB for:', email);
      user = await User.create({
        email,
        firebaseUid: uid,
        username: email.split('@')[0],
        role: 'user',
        status: 'active'
      });
    }

    console.log('User found/created:', {
      id: user._id,
      email: user.email,
      username: user.username
    });

    // Send complete user data in response
    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      user: {
        _id: user._id.toString(), // Convert ObjectId to string
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        status: user.status || 'active',
        firebaseUid: user.firebaseUid,
        avatarURL: user.userImage || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ 
      success: false,
      message: 'Login failed', 
      error: error.message 
    });
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
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const firebaseUid = decodedToken.uid;

        // Get user data from both MongoDB and Firestore
        const [mongoUser, firestoreDoc] = await Promise.all([
            User.findOne({ firebaseUid }),
            db.collection('users').doc(firebaseUid).get()
        ]);

        // If user doesn't exist in MongoDB, create them
        let user = mongoUser;
        if (!user) {
            const firebaseUser = await admin.auth().getUser(firebaseUid);
            
            user = new User({
                username: firebaseUser.displayName || 'User',
                email: firebaseUser.email,
                password: 'firebase-auth',
                firebaseUid: firebaseUser.uid,
                role: 'user',
                status: 'active',
                userImage: firebaseUser.photoURL || null,
                mobileNumber: firestoreDoc.exists ? firestoreDoc.data().mobileNumber : null,
                address: firestoreDoc.exists ? firestoreDoc.data().address : null
            });

            await user.save();
            console.log('Created new user in MongoDB:', user.email);
        }

        // Get Firestore data if it exists
        const firestoreData = firestoreDoc.exists ? firestoreDoc.data() : {};

        // Combine MongoDB and Firestore data, with MongoDB taking precedence
        const combinedUserData = {
            _id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            userImage: user.userImage,
            firebaseUid: user.firebaseUid,
            mobileNumber: user.mobileNumber || firestoreData.mobileNumber,
            address: user.address || firestoreData.address,
            // Add any additional Firestore fields you want to include
            ...firestoreData,
            // MongoDB fields take precedence
            ...user.toObject()
        };

        console.log('Combined user data:', {
            id: combinedUserData._id,
            email: combinedUserData.email,
            hasMobile: !!combinedUserData.mobileNumber,
            hasAddress: !!combinedUserData.address
        });

        res.status(200).json({
            success: true,
            user: combinedUserData
        });

    } catch (error) {
        console.error('Error in getCurrentUser:', error);
        if (error.code === 'auth/id-token-expired') {
            return res.status(401).json({
                success: false,
                message: 'Token expired'
            });
        }
        res.status(500).json({
            success: false,
            message: error.message
        });
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
