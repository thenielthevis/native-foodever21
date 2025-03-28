const jwt = require('jsonwebtoken'); 
const User = require('../models/userModel'); 
const { admin, db } = require('../utils/firebaseAdminConfig'); 
const createError = require('../utils/appError');
const bcrypt = require('bcryptjs');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if the Authorization header exists and starts with 'Bearer'
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization header missing or invalid');
      return next(new createError('You are not logged in! Please log in to get access.', 401));
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Token is missing');
      return next(new createError('You are not logged in! Please log in to get access.', 401));
    }

    console.log('Verifying token:', token.substring(0, 10) + '...'); // Debug: Log partial token for security

    // Verify the token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Token verified successfully for UID:', decodedToken.uid);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return next(new createError('Invalid or expired token. Please log in again.', 401));
    }

    // Always attach the Firebase user info to the request
    req.firebaseUser = decodedToken;

    // Fetch the user from MongoDB using firebaseUid
    let user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      console.log('User not found in MongoDB. Attempting to create from Firebase data...');
      
      try {
        // Get user details from Firebase Authentication
        const firebaseUser = await admin.auth().getUser(decodedToken.uid);
        console.log('Found user in Firebase:', firebaseUser.uid);
        
        // Generate a secure random password for MongoDB (user will authenticate with Firebase)
        const randomPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        
        // Create a new user in MongoDB
        user = new User({
          username: firebaseUser.displayName || 'User',
          email: firebaseUser.email,
          firebaseUid: firebaseUser.uid,
          password: hashedPassword,
          role: 'user',
          status: 'active'
        });
        
        // Save the new user to MongoDB
        await user.save();
        console.log('Successfully created user in MongoDB:', user._id);
        
        // Also create/update the user in Firestore if needed
        const firestoreUserDoc = await db.collection('users').doc(firebaseUser.uid).get();
        
        if (!firestoreUserDoc.exists) {
          console.log('Creating user in Firestore as well');
          await db.collection('users').doc(firebaseUser.uid).set({
            username: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            status: 'active',
            avatarURL: null
          });
        }
      } catch (createError) {
        console.error('Failed to create user in MongoDB:', createError);
        // Instead of failing, continue with basic Firebase user data
        req.user = {
          firebaseUid: decodedToken.uid,
          email: decodedToken.email,
          username: decodedToken.name || 'User'
        };
        console.log('Proceeding with Firebase user data only');
        return next();
      }
    }

    console.log('User authenticated:', user.email); // Debug: Log authenticated user

    // Attach the user object to the request
    req.user = user;

    next(); // Continue to the next middleware
  } catch (error) {
    console.error('Unexpected error in protect middleware:', error);
    return next(new createError('Authentication failed. Please try again.', 401));
  }
};

module.exports = protect;