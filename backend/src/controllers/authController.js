const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/** Generate a signed JWT for a user */
const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });

/**
 * POST /api/auth/register
 * Creates a new user account.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with that email already exists',
        errorCode: 'EMAIL_TAKEN',
      });
    }

    const user = await User.create({ name, email, password });

    const token = signToken(user._id);

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 * Authenticates a user and returns a JWT.
 * Uses a generic error message to avoid revealing whether the email exists.
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Must explicitly select password since it's excluded by default
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    const isValid = user && (await user.comparePassword(password));

    if (!isValid) {
      logger.warn(`Failed login attempt for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        errorCode: 'INVALID_CREDENTIALS',
      });
    }

    const token = signToken(user._id);

    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          createdAt: req.user.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
