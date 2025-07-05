const express = require('express');
const User = require('../models/User');
const { generateToken } = require('../config/encryption');
const { validate, schemas } = require('../middleware/validation');
const { logRequest, requireAuth } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Apply request logging to all auth routes
router.use(logRequest);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validate(schemas.register), async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Register new user
    const user = await User.register(username, password, confirmPassword);

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username
    });

    // Set session
    req.session.userId = user.id;
    req.session.username = user.username;

    logger.authEvent('register_success', username, ip);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
      message: 'Registration successful'
    });
  } catch (error) {
    logger.error('Registration error:', error);
    const ip = req.ip || req.connection.remoteAddress;
    logger.authEvent('register_failed', req.body.username || 'unknown', ip, {
      reason: error.message
    });

    res.status(400).json({
      error: error.message || 'Registration failed'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Try to authenticate user from database first
    const user = await User.authenticate(username, password);

    if (user) {
      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        username: user.username
      });

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;

      logger.authEvent('login_success', username, ip);

      res.json({
        success: true,
        token,
        user: user.toJSON(),
        message: 'Login successful'
      });
    } else {
      // Fallback to admin credentials from environment variables
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (adminPassword && username === adminUsername && password === adminPassword) {
        // Create or get admin user
        let adminUser = await User.findByUsername(username);

        if (!adminUser) {
          // Create admin user if it doesn't exist
          adminUser = await User.create(username, password);
          // Set as super admin
          await adminUser.updateRole('super_admin');
          logger.info('Admin user created and set as super admin', { username });
        } else if (!adminUser.isSuperAdmin()) {
          // Ensure existing admin user is super admin
          await adminUser.updateRole('super_admin');
          logger.info('Admin user role updated to super admin', { username });
        }

        // Generate JWT token
        const token = generateToken({
          userId: adminUser.id,
          username: adminUser.username
        });

        // Set session
        req.session.userId = adminUser.id;
        req.session.username = adminUser.username;

        logger.authEvent('login_success', username, ip);

        res.json({
          success: true,
          token,
          user: adminUser.toJSON(),
          message: 'Login successful'
        });
      } else {
        logger.authEvent('login_failed', username, ip);
        res.status(401).json({
          error: 'Invalid username or password'
        });
      }
    }
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'An internal error occurred'
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user and invalidate session
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    
    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        logger.error('Session destruction error:', err);
      }
    });

    logger.authEvent('logout', req.user.username, ip);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON()
    });
  } catch (error) {
    logger.error('Get user info error:', error);
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', requireAuth, validate(schemas.changePassword), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // Verify current password against environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (currentPassword !== adminPassword) {
      logger.authEvent('password_change_failed', req.user.username, ip, {
        reason: 'invalid_current_password'
      });
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    // Update user password in database
    await req.user.updatePassword(newPassword);

    logger.authEvent('password_changed', req.user.username, ip);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      error: 'Failed to change password'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', requireAuth, async (req, res) => {
  try {
    // Generate new token
    const token = generateToken({
      userId: req.user.id,
      username: req.user.username
    });

    res.json({
      success: true,
      token,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Failed to refresh token'
    });
  }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', async (req, res) => {
  try {
    // Check if admin credentials are configured
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    const isConfigured = !!(adminUsername && adminPassword);
    
    // Check if user is authenticated
    let isAuthenticated = false;
    let user = null;

    if (req.session && req.session.userId) {
      try {
        user = await User.findById(req.session.userId);
        isAuthenticated = !!(user && user.is_active);
      } catch (error) {
        // Ignore authentication errors for status check
      }
    }

    res.json({
      success: true,
      isConfigured,
      isAuthenticated,
      user: user ? user.toJSON() : null,
      adminUsername: isConfigured ? adminUsername : null
    });
  } catch (error) {
    logger.error('Auth status error:', error);
    res.status(500).json({
      error: 'Failed to check authentication status'
    });
  }
});

module.exports = router;
