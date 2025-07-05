const axios = require('axios');
const crypto = require('crypto');
const BaseNotificationService = require('./BaseNotificationService');

/**
 * DingTalk (钉钉) notification service
 */
class DingTalkService extends BaseNotificationService {
  constructor(config = {}) {
    super(config);
    this.type = 'dingtalk';
  }

  /**
   * Send notification to DingTalk
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
      const { url, payload } = this.buildRequest(formatted, config);

      this.log('sending', { webhook_url: config.webhook_url });

      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.errcode === 0) {
        this.log('sent successfully', { 
          response: response.data,
          message_title: formatted.title
        });
        return {
          success: true,
          response: response.data,
          message: '钉钉通知发送成功'
        };
      } else {
        throw new Error(`钉钉API返回错误: ${response.data?.errmsg || '未知错误'}`);
      }
    } catch (error) {
      this.logError('send', error, { message: message.title });
      throw error;
    }
  }

  /**
   * Build DingTalk request URL and payload
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - Request URL and payload
   */
  buildRequest(formatted, config) {
    let url = config.webhook_url;
    
    // Add signature if secret is provided
    if (config.secret) {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp, config.secret);
      
      const urlObj = new URL(url);
      urlObj.searchParams.set('timestamp', timestamp);
      urlObj.searchParams.set('sign', signature);
      url = urlObj.toString();
    }

    const payload = this.buildPayload(formatted, config);

    return { url, payload };
  }

  /**
   * Build DingTalk message payload
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - DingTalk payload
   */
  buildPayload(formatted, config) {
    const emoji = this.getStatusEmoji(formatted.original.trigger_type);
    
    // Use markdown format for rich text
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: `${emoji} ${formatted.title}`,
        text: `## ${emoji} ${formatted.title}\n\n${formatted.content}`
      }
    };

    return payload;
  }

  /**
   * Generate signature for DingTalk webhook
   * @param {number} timestamp - Timestamp
   * @param {string} secret - Secret key
   * @returns {string} - Generated signature
   */
  generateSignature(timestamp, secret) {
    const stringToSign = timestamp + '\n' + secret;
    return crypto
      .createHmac('sha256', secret)
      .update(stringToSign, 'utf8')
      .digest('base64');
  }

  /**
   * Validate DingTalk configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.webhook_url) {
      errors.push('Webhook URL是必需的');
    } else if (!this.isValidUrl(config.webhook_url)) {
      errors.push('Webhook URL格式无效');
    } else if (!config.webhook_url.includes('oapi.dingtalk.com')) {
      errors.push('Webhook URL必须是钉钉官方域名');
    }

    // Validate secret if provided
    if (config.secret && typeof config.secret !== 'string') {
      errors.push('加签密钥必须是字符串类型');
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
      return url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * Format message specifically for DingTalk
   * @param {object} message - Original message
   * @returns {object} - Formatted message
   */
  formatMessage(message) {
    const formatted = super.formatMessage(message);
    
    // Add DingTalk specific formatting
    const {
      trigger_type,
      task_name,
      task_type,
      status,
      duration,
      error_details,
      bytes_transferred,
      files_transferred
    } = message;

    let content = formatted.content;

    // Add additional details for DingTalk with markdown formatting
    if (trigger_type === 'backup_success' && (bytes_transferred || files_transferred)) {
      content += '\n\n**传输统计:**';
      if (files_transferred) {
        content += `\n- 文件数量: ${files_transferred}`;
      }
      if (bytes_transferred) {
        content += `\n- 传输大小: ${this.formatBytes(bytes_transferred)}`;
      }
    }

    // Add task details section
    if (task_name && task_type) {
      content += '\n\n**任务详情:**';
      content += `\n- 任务名称: ${task_name}`;
      content += `\n- 任务类型: ${this.getTaskTypeDisplay(task_type)}`;
    }

    return {
      ...formatted,
      content
    };
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
   * Test DingTalk webhook connection
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testConnection(config) {
    try {
      const testMessage = {
        title: '钉钉通知测试',
        content: '这是一条测试通知消息，用于验证钉钉Webhook配置是否正确。\n\n如果您收到此消息，说明配置成功！',
        trigger_type: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await this.send(testMessage, config);
      return {
        success: true,
        message: '钉钉通知测试成功',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: '钉钉通知测试失败',
        error: error.message
      };
    }
  }
}

module.exports = DingTalkService;
