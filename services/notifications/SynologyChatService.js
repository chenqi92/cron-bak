const axios = require('axios');
const BaseNotificationService = require('./BaseNotificationService');

/**
 * Synology Chat notification service
 */
class SynologyChatService extends BaseNotificationService {
  constructor(config = {}) {
    super(config);
    this.type = 'synology_chat';
  }

  /**
   * Send notification to Synology Chat
   * @param {object} message - Message object
   * @param {object} userConfig - User-specific configuration
   * @returns {Promise<object>} - Result object
   */
  async send(message, userConfig = {}) {
    try {
      const config = { ...this.config, ...userConfig };
      const validation = this.validateConfig(config);
      
      if (!validation.valid) {
        throw new Error(`配置验证失败: ${validation.errors.join(', ')}`);
      }

      const formatted = this.formatMessage(message);
      const payload = this.buildPayload(formatted, config);

      this.log('sending', { webhook_url: config.webhook_url });

      const response = await axios.post(config.webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // Synology Chat typically returns 200 for successful requests
      if (response.status === 200) {
        this.log('sent successfully', { 
          status: response.status,
          message_title: formatted.title
        });
        return {
          success: true,
          response: response.data,
          message: 'Synology Chat通知发送成功'
        };
      } else {
        throw new Error(`Synology Chat API返回错误: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logError('send', error, { message: message.title });
      throw error;
    }
  }

  /**
   * Build Synology Chat message payload
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - Synology Chat payload
   */
  buildPayload(formatted, config) {
    const emoji = this.getStatusEmoji(formatted.original.trigger_type);
    const color = this.getStatusColor(formatted.original.trigger_type);

    // Synology Chat supports rich formatting
    const payload = {
      text: `${emoji} ${formatted.title}`,
      attachments: [
        {
          color: color,
          fields: [
            {
              title: '详细信息',
              value: formatted.content,
              short: false
            }
          ],
          footer: 'CronBak备份服务',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    };

    // Add additional fields based on message type
    const { original } = formatted;
    if (original.task_name) {
      payload.attachments[0].fields.unshift({
        title: '任务名称',
        value: original.task_name,
        short: true
      });
    }

    if (original.task_type) {
      payload.attachments[0].fields.unshift({
        title: '任务类型',
        value: this.getTaskTypeDisplay(original.task_type),
        short: true
      });
    }

    if (original.trigger_type === 'backup_success' && original.duration) {
      payload.attachments[0].fields.push({
        title: '执行时间',
        value: this.formatDuration(original.duration),
        short: true
      });
    }

    if (original.bytes_transferred) {
      payload.attachments[0].fields.push({
        title: '传输大小',
        value: this.formatBytes(original.bytes_transferred),
        short: true
      });
    }

    if (original.files_transferred) {
      payload.attachments[0].fields.push({
        title: '文件数量',
        value: original.files_transferred.toString(),
        short: true
      });
    }

    return payload;
  }

  /**
   * Get display name for task type
   * @param {string} taskType - Task type
   * @returns {string} - Display name
   */
  getTaskTypeDisplay(taskType) {
    const types = {
      'mysql_to_mysql': 'MySQL到MySQL',
      'mysql_to_smb': 'MySQL到SMB',
      'minio_to_minio': 'MinIO到MinIO'
    };
    return types[taskType] || taskType;
  }

  /**
   * Format bytes to human readable string
   * @param {number} bytes - Bytes
   * @returns {string} - Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Validate Synology Chat configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.webhook_url) {
      errors.push('Webhook URL是必需的');
    } else if (!this.isValidUrl(config.webhook_url)) {
      errors.push('Webhook URL格式无效');
    }

    // Validate token if provided
    if (config.token && typeof config.token !== 'string') {
      errors.push('访问令牌必须是字符串类型');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if URL is valid
   * @param {string} url - URL to validate
   * @returns {boolean} - True if valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Format message specifically for Synology Chat
   * @param {object} message - Original message
   * @returns {object} - Formatted message
   */
  formatMessage(message) {
    const formatted = super.formatMessage(message);
    
    // Synology Chat supports rich formatting, so we can be more concise in the main content
    const {
      trigger_type,
      task_name,
      error_details
    } = message;

    let content = '';

    switch (trigger_type) {
      case 'backup_start':
        content = '备份任务开始执行';
        break;
      case 'backup_success':
        content = '备份任务执行成功';
        break;
      case 'backup_failure':
        content = '备份任务执行失败';
        if (error_details) {
          content += `\n\n错误信息: ${error_details}`;
        }
        break;
      case 'test':
        content = '这是一条测试通知消息，用于验证Synology Chat配置是否正确。\n\n如果您收到此消息，说明配置成功！';
        break;
      default:
        content = formatted.content;
    }

    return {
      ...formatted,
      content
    };
  }

  /**
   * Test Synology Chat webhook connection
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testConnection(config) {
    try {
      const testMessage = {
        title: 'Synology Chat通知测试',
        content: '这是一条测试通知消息，用于验证Synology Chat Webhook配置是否正确。',
        trigger_type: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await this.send(testMessage, config);
      return {
        success: true,
        message: 'Synology Chat通知测试成功',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Synology Chat通知测试失败',
        error: error.message
      };
    }
  }
}

module.exports = SynologyChatService;
