const protect = require('./protect');
const createError = require('../utils/appError');

// Middleware to allow only users with a "user" role
const userProtect = (req, res, next) => {
  protect(req, res, (error) => {
    if (error) {
      return next(error);
    }

    if (req.user.role !== 'user') {
      console.error('User role is not "user"');
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to access this resource.' });
    }

    next(); // Allow the request to proceed
  });
};

module.exports = userProtect;
