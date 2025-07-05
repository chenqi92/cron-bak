const express = require('express');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const notificationManager = require('../services/NotificationManager');
const logger = require('../config/logger');

const router = express.Router();

// Apply authentication to all notification routes
router.use(requireAuth);

/**
 * GET /api/notifications/modules
 * Get available notification modules (for regular users, only enabled modules)
 */
router.get('/modules', async (req, res) => {
  try {
    let modules;
    
    if (req.user.isSuperAdmin()) {
      // Super admins can see all modules
      modules = await notificationManager.getAvailableModules();
    } else {
      // Regular users can only see enabled modules
      modules = await notificationManager.getEnabledModules();
    }

    res.json({
      success: true,
      data: modules.map(module => module.toJSON())
    });
  } catch (error) {
    logger.error('Error getting notification modules:', error);
    res.status(500).json({
      error: 'Failed to get notification modules',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/modules/:id/enabled
 * Enable/disable notification module (super admin only)
 */
router.put('/modules/:id/enabled', requireSuperAdmin, validate(schemas.updateModuleEnabled), async (req, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        error: 'enabled field must be a boolean'
      });
    }

    await notificationManager.setModuleEnabled(moduleId, enabled);

    res.json({
      success: true,
      message: `Notification module ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    logger.error('Error updating notification module status:', error);
    res.status(500).json({
      error: 'Failed to update notification module status',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/modules/:id/config
 * Update module global configuration (super admin only)
 */
router.put('/modules/:id/config', requireSuperAdmin, validate(schemas.updateModuleConfig), async (req, res) => {
  try {
    const moduleId = parseInt(req.params.id);
    const { config } = req.body;

    await notificationManager.updateModuleGlobalConfig(moduleId, config);

    res.json({
      success: true,
      message: 'Module global configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating module global config:', error);
    res.status(500).json({
      error: 'Failed to update module global configuration',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get user notification preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const preferences = await notificationManager.getUserPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences.map(pref => pref.toJSON())
    });
  } catch (error) {
    logger.error('Error getting user notification preferences:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences',
      message: error.message
    });
  }
});

/**
 * PUT /api/notifications/preferences/:moduleId
 * Update user notification preference for specific module
 */
router.put('/preferences/:moduleId', validate(schemas.updateNotificationPreference), async (req, res) => {
  try {
    const moduleId = parseInt(req.params.moduleId);
    const { is_enabled, config, triggers } = req.body;

    const data = {};
    if (typeof is_enabled === 'boolean') {
      data.is_enabled = is_enabled;
    }
    if (config !== undefined) {
      data.config = config;
    }
    if (Array.isArray(triggers)) {
      data.triggers = triggers;
    }

    const preference = await notificationManager.updateUserPreference(
      req.user.id,
      moduleId,
      data
    );

    res.json({
      success: true,
      data: preference.toJSON(),
      message: 'Notification preference updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user notification preference:', error);
    res.status(500).json({
      error: 'Failed to update notification preference',
      message: error.message
    });
  }
});

/**
 * POST /api/notifications/test/:moduleType
 * Test notification configuration
 */
router.post('/test/:moduleType', validate(schemas.testNotification), async (req, res) => {
  try {
    const moduleType = req.params.moduleType;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({
        error: 'Configuration is required for testing'
      });
    }

    const result = await notificationManager.testNotification(moduleType, config);

    res.json({
      success: result.success,
      message: result.message,
      details: result.details,
      error: result.error
    });
  } catch (error) {
    logger.error('Error testing notification:', error);
    res.status(500).json({
      error: 'Failed to test notification',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/logs
 * Get notification logs for current user
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, module_id } = req.query;
    const offset = (page - 1) * limit;

    const options = {
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    if (status) {
      options.status = status;
    }
    if (module_id) {
      options.module_id = parseInt(module_id);
    }

    const logs = await notificationManager.getNotificationLogs(req.user.id, options);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length
      }
    });
  } catch (error) {
    logger.error('Error getting notification logs:', error);
    res.status(500).json({
      error: 'Failed to get notification logs',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/logs/all
 * Get all notification logs (super admin only)
 */
router.get('/logs/all', requireSuperAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, module_id, user_id } = req.query;
    const offset = (page - 1) * limit;

    // Build query for all users
    let query = `
      SELECT nl.*, nm.display_name as module_name, bt.name as task_name, u.username
      FROM notification_logs nl
      LEFT JOIN notification_modules nm ON nl.module_id = nm.id
      LEFT JOIN backup_tasks bt ON nl.task_id = bt.id
      LEFT JOIN users u ON nl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND nl.status = ?';
      params.push(status);
    }

    if (module_id) {
      query += ' AND nl.module_id = ?';
      params.push(parseInt(module_id));
    }

    if (user_id) {
      query += ' AND nl.user_id = ?';
      params.push(parseInt(user_id));
    }

    query += ' ORDER BY nl.sent_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const { allQuery } = require('../config/database');
    const logs = await allQuery(query, params);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.length
      }
    });
  } catch (error) {
    logger.error('Error getting all notification logs:', error);
    res.status(500).json({
      error: 'Failed to get notification logs',
      message: error.message
    });
  }
});

/**
 * GET /api/notifications/triggers
 * Get available trigger types
 */
router.get('/triggers', (req, res) => {
  const triggers = [
    {
      type: 'backup_start',
      name: '备份开始',
      description: '备份任务开始执行时发送通知'
    },
    {
      type: 'backup_success',
      name: '备份成功',
      description: '备份任务成功完成时发送通知'
    },
    {
      type: 'backup_failure',
      name: '备份失败',
      description: '备份任务执行失败时发送通知'
    }
  ];

  res.json({
    success: true,
    data: triggers
  });
});

module.exports = router;
