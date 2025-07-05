const logger = require('../../config/logger');

/**
 * Base class for notification services
 */
class BaseNotificationService {
  constructor(config = {}) {
    this.config = config;
    this.type = 'base';
  }

  /**
   * Send notification
   * @param {object} message - Message object
   * @param {object} userConfig - User-specific configuration
   * @returns {Promise<object>} - Result object with success status
   */
  async send(message, userConfig = {}) {
    throw new Error('send method must be implemented by subclass');
  }

  /**
   * Validate configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result
   */
  validateConfig(config) {
    return { valid: true, errors: [] };
  }

  /**
   * Test connection/configuration
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testConnection(config) {
    try {
      const testMessage = {
        title: '测试通知',
        content: '这是一条测试通知消息，用于验证配置是否正确。',
        trigger_type: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await this.send(testMessage, config);
      return {
        success: true,
        message: '测试通知发送成功',
        details: result
      };
    } catch (error) {
      logger.error(`${this.type} notification test failed:`, error);
      return {
        success: false,
        message: '测试通知发送失败',
        error: error.message
      };
    }
  }

  /**
   * Format message for specific notification type
   * @param {object} message - Original message
   * @returns {object} - Formatted message
   */
  formatMessage(message) {
    const {
      title,
      content,
      trigger_type,
      task_name,
      task_type,
      status,
      duration,
      error_details,
      timestamp
    } = message;

    // Default formatting
    let formattedTitle = title || '备份服务通知';
    let formattedContent = content;

    if (!formattedContent) {
      switch (trigger_type) {
        case 'backup_start':
          formattedContent = `备份任务 "${task_name}" (${task_type}) 开始执行`;
          break;
        case 'backup_success':
          formattedContent = `备份任务 "${task_name}" (${task_type}) 执行成功`;
          if (duration) {
            formattedContent += `\n执行时间: ${this.formatDuration(duration)}`;
          }
          break;
        case 'backup_failure':
          formattedContent = `备份任务 "${task_name}" (${task_type}) 执行失败`;
          if (error_details) {
            formattedContent += `\n错误信息: ${error_details}`;
          }
          break;
        default:
          formattedContent = content || '备份服务通知';
      }
    }

    if (timestamp) {
      formattedContent += `\n时间: ${new Date(timestamp).toLocaleString('zh-CN')}`;
    }

    return {
      title: formattedTitle,
      content: formattedContent,
      original: message
    };
  }

  /**
   * Format duration in milliseconds to human readable string
   * @param {number} duration - Duration in milliseconds
   * @returns {string} - Formatted duration
   */
  formatDuration(duration) {
    if (!duration || duration < 0) return '未知';

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟${seconds % 60}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  /**
   * Get status emoji for different trigger types
   * @param {string} triggerType - Trigger type
   * @param {string} status - Status
   * @returns {string} - Emoji
   */
  getStatusEmoji(triggerType, status) {
    switch (triggerType) {
      case 'backup_start':
        return '🚀';
      case 'backup_success':
        return '✅';
      case 'backup_failure':
        return '❌';
      case 'test':
        return '🧪';
      default:
        return '📢';
    }
  }

  /**
   * Get color for different trigger types (for rich notifications)
   * @param {string} triggerType - Trigger type
   * @param {string} status - Status
   * @returns {string} - Color code
   */
  getStatusColor(triggerType, status) {
    switch (triggerType) {
      case 'backup_start':
        return '#1890ff'; // Blue
      case 'backup_success':
        return '#52c41a'; // Green
      case 'backup_failure':
        return '#ff4d4f'; // Red
      case 'test':
        return '#722ed1'; // Purple
      default:
        return '#666666'; // Gray
    }
  }

  /**
   * Log notification attempt
   * @param {string} action - Action being performed
   * @param {object} details - Additional details
   */
  log(action, details = {}) {
    logger.info(`${this.type} notification ${action}`, {
      service: this.type,
      action,
      ...details
    });
  }

  /**
   * Log notification error
   * @param {string} action - Action being performed
   * @param {Error} error - Error object
   * @param {object} details - Additional details
   */
  logError(action, error, details = {}) {
    logger.error(`${this.type} notification ${action} failed:`, {
      service: this.type,
      action,
      error: error.message,
      stack: error.stack,
      ...details
    });
  }
}

module.exports = BaseNotificationService;
