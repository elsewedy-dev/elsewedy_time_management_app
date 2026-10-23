import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint
router.post('/login', [
  authLimiter,
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { username, password } = req.body;

    // Find user by username or email
    const user = await User.findByCredentials(username, password);

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Log successful login
    logger.info('User login successful', {
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toSafeObject(),
        token,
        refreshToken,
      },
    });

  } catch (error) {
    logger.warn('Login attempt failed', {
      username: req.body.username,
      error: error.message,
      ip: req.ip,
    });

    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Register endpoint (admin only)
router.post('/register', [
  body('username').isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('role').optional().isIn(['admin', 'hr_manager', 'finance', 'employee', 'supervisor']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const {
      username,
      email,
      password,
      firstName,
      lastName,
      role = 'employee',
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        $or: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this username or email already exists',
      });
    }

    // Create new user
    const user = await User.create({
      username,
      email,
      password,
      firstName,
      lastName,
      role,
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    logger.info('User registered successfully', {
      userId: user.id,
      username: user.username,
      role: user.role,
      createdBy: req.user?.id,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toSafeObject(),
        token,
        refreshToken,
      },
    });

  } catch (error) {
    logger.error('User registration failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Refresh token endpoint
router.post('/refresh', [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    // Get user
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    logger.error('Token refresh failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // In a real application, you might want to blacklist the token
  // For now, we'll just return success
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    // This would typically be protected by auth middleware
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Profile endpoint - implement with auth middleware',
    });
  } catch (error) {
    logger.error('Profile fetch failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Change password endpoint
router.post('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // This would typically be protected by auth middleware
    // For now, we'll return a placeholder
    res.json({
      success: true,
      message: 'Change password endpoint - implement with auth middleware',
    });
  } catch (error) {
    logger.error('Password change failed:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

export default router;
