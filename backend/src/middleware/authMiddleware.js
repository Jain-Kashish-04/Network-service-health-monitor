const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Verifies the JWT Bearer token from the Authorization header.
 * Attaches the authenticated user to req.user.
 * Returns 401 for missing or invalid tokens.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
      errorCode: 'NO_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch fresh user data (ensures the user still exists)
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is no longer valid. User not found.',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.warn(`Authentication failure: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      errorCode: 'INVALID_TOKEN',
    });
  }
};

/**
 * Restricts access to admin users only.
 * Must be used after the protect middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin privileges required.',
    errorCode: 'FORBIDDEN',
  });
};

module.exports = { protect, adminOnly };
