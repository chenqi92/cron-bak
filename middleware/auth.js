const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

/**
 * Middleware to authenticate JWT tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret');
    
    // Get user from database to ensure they still exist and are active
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    } else {
      logger.error('Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }
};

/**
 * Middleware to authenticate session-based requests
 */
const authenticateSession = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(req.session.userId);
    
    if (!user || !user.is_active) {
      req.session.destroy();
      return res.status(401).json({ error: 'Invalid session' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Session authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to check if user is authenticated (either token or session)
 */
const requireAuth = async (req, res, next) => {
  // Try token authentication first
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    return authenticateToken(req, res, next);
  }

  // Fall back to session authentication
  return authenticateSession(req, res, next);
};

/**
 * Middleware to optionally authenticate user
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret');
      const user = await User.findById(decoded.userId);
      
      if (user && user.is_active) {
        req.user = user;
      }
    } else if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      
      if (user && user.is_active) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    // Ignore authentication errors for optional auth
    next();
  }
};

/**
 * Middleware to log API requests
 */
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const ip = req.ip || req.connection.remoteAddress;
    
    logger.apiRequest(
      req.method,
      req.originalUrl,
      ip,
      duration,
      res.statusCode
    );
  });

  next();
};

/**
 * Middleware to check if user has admin privileges
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is admin or super admin
    if (!req.user.isAdmin()) {
      logger.warn('Unauthorized admin access attempt', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        error: 'Administrator privileges required',
        message: '需要管理员权限才能访问此功能'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    res.status(500).json({
      error: 'Authorization check failed'
    });
  }
};

/**
 * Middleware to check if user is super admin
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is super admin
    if (!req.user.isSuperAdmin()) {
      logger.warn('Unauthorized super admin access attempt', {
        userId: req.user.id,
        username: req.user.username,
        role: req.user.role,
        endpoint: req.originalUrl
      });

      return res.status(403).json({
        error: 'Super administrator privileges required',
        message: '需要超级管理员权限才能访问此功能'
      });
    }

    next();
  } catch (error) {
    logger.error('Super admin check error:', error);
    res.status(500).json({
      error: 'Authorization check failed'
    });
  }
};

/**
 * Middleware to validate API key for webhook/external access
 */
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  if (!apiKey || apiKey !== validApiKey) {
    logger.authEvent('api_key_invalid', 'unknown', req.ip);
    return res.status(401).json({ error: 'Invalid API key' });
  }

  logger.authEvent('api_key_valid', 'api_user', req.ip);
  next();
};

/**
 * Middleware to handle CORS preflight requests
 */
const handleCors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
};

module.exports = {
  authenticateToken,
  authenticateSession,
  requireAuth,
  optionalAuth,
  logRequest,
  requireAdmin,
  requireSuperAdmin,
  validateApiKey,
  handleCors
};
