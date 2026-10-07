const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints.
 * Prevents brute-force attacks on login.
 */
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 20,
      message: {
        success: false,
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * Rate limiter for manual health check endpoint.
 * Prevents abuse of the check-now feature.
 * Maximum 10 manual checks per minute per IP.
 */
const checkNowLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 60 * 1000,
      max: 10,
      message: {
        success: false,
        message: 'Too many health check requests. Maximum 10 per minute.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

/**
 * General API rate limiter.
 * Applied globally to all API routes.
 */
const generalLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      message: {
        success: false,
        message: 'Too many requests. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });

module.exports = { authLimiter, checkNowLimiter, generalLimiter };
