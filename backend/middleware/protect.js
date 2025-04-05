const jwt = require('jsonwebtoken'); 
const User = require('../models/userModel'); 
const { admin, db } = require('../utils/firebaseAdminConfig'); 
const createError = require('../utils/appError');
const bcrypt = require('bcryptjs');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth Header:', authHeader); // Debug line

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Authorization header missing or invalid:', authHeader);
      return res.status(401).json({
        success: false,
        message: 'Please login to access this resource'
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.error('Token is missing from auth header');
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing'
      });
    }

    console.log('Verifying token:', token.substring(0, 10) + '...');
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('Token verified successfully for UID:', decodedToken.uid);
      req.user = { uid: decodedToken.uid };
      next();
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Protect middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = protect;