const logger = require('../utils/logger');

/**
 * Centralized error-handling middleware.
 * Must be registered AFTER all routes in app.js.
 *
 * Produces a consistent error response shape:
 * { success: false, message: "...", errorCode: "..." }
 *
 * Never exposes stack traces, DB internals, or secrets.
 */
const errorHandler = (err, req, res, next) => {
  // Log the full error internally (never sent to client)
  logger.error(`${err.name}: ${err.message}`);

  // Default to 500
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join(', ');
  }

  // Mongoose duplicate key (e.g., duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    errorCode = 'DUPLICATE_KEY';
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    message = `A record with that ${field} already exists`;
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    errorCode = 'INVALID_ID';
    message = 'Invalid resource ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  }

  // In production, don't expose internal 500 details
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred';
    errorCode = 'INTERNAL_ERROR';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
  });
};

/**
 * 404 handler — placed after routes, before errorHandler.
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.errorCode = 'ROUTE_NOT_FOUND';
  next(err);
};

module.exports = { errorHandler, notFound };
