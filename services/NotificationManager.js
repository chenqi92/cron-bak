const NotificationModule = require('../models/NotificationModule');
const UserNotificationPreference = require('../models/UserNotificationPreference');
const { runQuery } = require('../config/database');
const logger = require('../config/logger');

// Import notification services
const WeChatWorkService = require('./notifications/WeChatWorkService');
const DingTalkService = require('./notifications/DingTalkService');
const WebhookService = require('./notifications/WebhookService');
const SynologyChatService = require('./notifications/SynologyChatService');

/**
 * Notification Manager - Central service for handling all notifications
 */
class NotificationManager {
  constructor() {
    this.services = new Map();
    this.initializeServices();
  }

  /**
   * Initialize notification services
   */
  initializeServices() {
    this.services.set('wechat_work', new WeChatWorkService());
    this.services.set('dingtalk', new DingTalkService());
    this.services.set('webhook', new WebhookService());
    this.services.set('synology_chat', new SynologyChatService());
  }

  /**
   * Send notification to user's configured channels
   * @param {number} userId - User ID
   * @param {string} triggerType - Trigger type (backup_start, backup_success, backup_failure)
   * @param {object} message - Message data
   * @returns {Promise<object[]>} - Array of send results
   */
  async sendNotification(userId, triggerType, message) {
    try {
      // Get user's notification preferences
      const preferences = await UserNotificationPreference.findByUserId(userId);
      
      // Filter preferences for enabled modules and matching triggers
      const activePreferences = preferences.filter(pref => 
        pref.is_enabled && 
        pref.module_enabled && 
        pref.hasTrigger(triggerType)
      );

      if (activePreferences.length === 0) {
        logger.info('No active notification preferences found', { userId, triggerType });
        return [];
      }

      const results = [];

      // Send notification through each active channel
      for (const preference of activePreferences) {
        try {
          const result = await this.sendToChannel(preference, message);
          results.push({
            module_id: preference.module_id,
            module_name: preference.module_name,
            success: result.success,
            message: result.message,
            error: result.error
          });

          // Log notification attempt
          await this.logNotification(
            userId,
            preference.module_id,
            message.task_id,
            triggerType,
            result.success ? 'sent' : 'failed',
            result.message,
            result.error
          );
        } catch (error) {
          logger.error('Error sending notification through channel:', error);
          results.push({
            module_id: preference.module_id,
            module_name: preference.module_name,
            success: false,
            error: error.message
          });

          // Log failed notification
          await this.logNotification(
            userId,
            preference.module_id,
            message.task_id,
            triggerType,
            'failed',
            null,
            error.message
          );
        }
      }

      return results;
    } catch (error) {
      logger.error('Error in sendNotification:', error);
      throw error;
    }
  }

  /**
   * Send notification through specific channel
   * @param {UserNotificationPreference} preference - User preference
   * @param {object} message - Message data
   * @returns {Promise<object>} - Send result
   */
  async sendToChannel(preference, message) {
    const service = this.services.get(preference.module_type);
    if (!service) {
      throw new Error(`Notification service not found: ${preference.module_type}`);
    }

    // Get module global config
    const module = await NotificationModule.findById(preference.module_id);
    const globalConfig = module ? module.getGlobalConfig() : {};

    // Get user-specific config
    const userConfig = preference.getConfig() || {};

    // Merge configurations (user config overrides global config)
    const config = { ...globalConfig, ...userConfig };

    // Send notification
    return await service.send(message, config);
  }

  /**
   * Test notification configuration
   * @param {string} moduleType - Module type
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testNotification(moduleType, config) {
    const service = this.services.get(moduleType);
    if (!service) {
      throw new Error(`Notification service not found: ${moduleType}`);
    }

    return await service.testConnection(config);
  }

  /**
   * Get available notification modules
   * @returns {Promise<NotificationModule[]>} - Array of modules
   */
  async getAvailableModules() {
    return await NotificationModule.findAll();
  }

  /**
   * Get enabled notification modules
   * @returns {Promise<NotificationModule[]>} - Array of enabled modules
   */
  async getEnabledModules() {
    return await NotificationModule.findEnabled();
  }

  /**
   * Enable/disable notification module (super admin only)
   * @param {number} moduleId - Module ID
   * @param {boolean} enabled - Whether to enable the module
   * @returns {Promise<void>}
   */
  async setModuleEnabled(moduleId, enabled) {
    const module = await NotificationModule.findById(moduleId);
    if (!module) {
      throw new Error('Notification module not found');
    }

    await module.updateEnabled(enabled);
    logger.info('Notification module status updated', { moduleId, enabled });
  }

  /**
   * Update module global configuration (super admin only)
   * @param {number} moduleId - Module ID
   * @param {object} config - Global configuration
   * @returns {Promise<void>}
   */
  async updateModuleGlobalConfig(moduleId, config) {
    const module = await NotificationModule.findById(moduleId);
    if (!module) {
      throw new Error('Notification module not found');
    }

    // Validate configuration
    const service = this.services.get(module.type);
    if (service) {
      const validation = service.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }
    }

    await module.updateGlobalConfig(config);
    logger.info('Notification module global config updated', { moduleId });
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   * @returns {Promise<UserNotificationPreference[]>} - User preferences
   */
  async getUserPreferences(userId) {
    return await UserNotificationPreference.findByUserId(userId);
  }

  /**
   * Update user notification preference
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @param {object} data - Preference data
   * @returns {Promise<UserNotificationPreference>} - Updated preference
   */
  async updateUserPreference(userId, moduleId, data) {
    // Validate module is enabled
    const module = await NotificationModule.findById(moduleId);
    if (!module || !module.is_enabled) {
      throw new Error('Notification module is not available');
    }

    // Validate user configuration if provided
    if (data.config) {
      const service = this.services.get(module.type);
      if (service) {
        const validation = service.validateConfig(data.config);
        if (!validation.valid) {
          throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
        }
      }
    }

    return await UserNotificationPreference.createOrUpdate(userId, moduleId, data);
  }

  /**
   * Log notification attempt
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @param {number} taskId - Task ID
   * @param {string} triggerType - Trigger type
   * @param {string} status - Status (sent, failed, pending)
   * @param {string} message - Success message
   * @param {string} errorDetails - Error details
   * @returns {Promise<void>}
   */
  async logNotification(userId, moduleId, taskId, triggerType, status, message, errorDetails) {
    try {
      await runQuery(`
        INSERT INTO notification_logs (user_id, module_id, task_id, trigger_type, status, message, error_details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [userId, moduleId, taskId, triggerType, status, message, errorDetails]);
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }

  /**
   * Get notification logs for user
   * @param {number} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<object[]>} - Notification logs
   */
  async getNotificationLogs(userId, options = {}) {
    const { limit = 50, offset = 0, status, module_id } = options;
    
    let query = `
      SELECT nl.*, nm.display_name as module_name, bt.name as task_name
      FROM notification_logs nl
      LEFT JOIN notification_modules nm ON nl.module_id = nm.id
      LEFT JOIN backup_tasks bt ON nl.task_id = bt.id
      WHERE nl.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND nl.status = ?';
      params.push(status);
    }

    if (module_id) {
      query += ' AND nl.module_id = ?';
      params.push(module_id);
    }

    query += ' ORDER BY nl.sent_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    try {
      const { allQuery } = require('../config/database');
      return await allQuery(query, params);
    } catch (error) {
      logger.error('Error getting notification logs:', error);
      throw error;
    }
  }
}

// Create singleton instance
const notificationManager = new NotificationManager();

module.exports = notificationManager;
