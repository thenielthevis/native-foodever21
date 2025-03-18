const jwt = require('jsonwebtoken'); 
const User = require('../models/userModel'); 
const { admin } = require('../utils/firebaseAdminConfig'); 
const createError = require('../utils/appError');

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

    console.log('Encoded Token:', token); // Debug: Log the token

    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    console.log('Decoded Token UID:', decodedToken.uid); // Debug: Log decoded token UID

    // Fetch the user from MongoDB using firebaseUid
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    if (!user) {
      console.error('No user found with the given UID in MongoDB');
      return next(new createError('The user belonging to this token no longer exists.', 401));
    }

    console.log('Authenticated User:', user); // Debug: Log user details

    // Attach the user object to the request
    req.user = user;

    next(); // Continue to the next middleware
  } catch (error) {
    console.error('Error in protect middleware:', error);
    return next(new createError('You are not logged in! Please log in to get access.', 401));
  }
};

module.exports = protect;
