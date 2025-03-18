const protect = require('./protect');
const createError = require('../utils/appError');

// Middleware to allow only users with an "admin" role
const adminProtect = (req, res, next) => {
  protect(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.user.role !== 'admin') {
      console.error('User role is not "admin"');
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to perform this action.' });
    }

    next(); // Allow the request to proceed
  });
};

module.exports = adminProtect;
