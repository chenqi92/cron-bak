const axios = require('axios');
const crypto = require('crypto');
const BaseNotificationService = require('./BaseNotificationService');

/**
 * WeChat Work (企业微信) notification service
 */
class WeChatWorkService extends BaseNotificationService {
  constructor(config = {}) {
    super(config);
    this.type = 'wechat_work';
  }

  /**
   * Send notification to WeChat Work
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

      if (response.data && response.data.errcode === 0) {
        this.log('sent successfully', { 
          response: response.data,
          message_title: formatted.title
        });
        return {
          success: true,
          response: response.data,
          message: '企业微信通知发送成功'
        };
      } else {
        throw new Error(`企业微信API返回错误: ${response.data?.errmsg || '未知错误'}`);
      }
    } catch (error) {
      this.logError('send', error, { message: message.title });
      throw error;
    }
  }

  /**
   * Build WeChat Work message payload
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - WeChat Work payload
   */
  buildPayload(formatted, config) {
    const emoji = this.getStatusEmoji(formatted.original.trigger_type);
    const color = this.getStatusColor(formatted.original.trigger_type);

    // Use markdown format for rich text
    const payload = {
      msgtype: 'markdown',
      markdown: {
        content: `${emoji} **${formatted.title}**\n\n${formatted.content}`
      }
    };

    return payload;
  }

  /**
   * Validate WeChat Work configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.webhook_url) {
      errors.push('Webhook URL是必需的');
    } else if (!this.isValidUrl(config.webhook_url)) {
      errors.push('Webhook URL格式无效');
    } else if (!config.webhook_url.includes('qyapi.weixin.qq.com')) {
      errors.push('Webhook URL必须是企业微信官方域名');
    }

    // Validate secret if provided
    if (config.secret && typeof config.secret !== 'string') {
      errors.push('密钥必须是字符串类型');
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
   * Generate signature for secure webhook (if secret is provided)
   * @param {string} timestamp - Timestamp
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
   * Format message specifically for WeChat Work
   * @param {object} message - Original message
   * @returns {object} - Formatted message
   */
  formatMessage(message) {
    const formatted = super.formatMessage(message);
    
    // Add WeChat Work specific formatting
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

    // Add additional details for WeChat Work
    if (trigger_type === 'backup_success' && (bytes_transferred || files_transferred)) {
      content += '\n\n**传输统计:**';
      if (files_transferred) {
        content += `\n- 文件数量: ${files_transferred}`;
      }
      if (bytes_transferred) {
        content += `\n- 传输大小: ${this.formatBytes(bytes_transferred)}`;
      }
    }

    return {
      ...formatted,
      content
    };
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
   * Test WeChat Work webhook connection
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testConnection(config) {
    try {
      const testMessage = {
        title: '🧪 企业微信通知测试',
        content: '这是一条测试通知消息，用于验证企业微信Webhook配置是否正确。\n\n如果您收到此消息，说明配置成功！',
        trigger_type: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await this.send(testMessage, config);
      return {
        success: true,
        message: '企业微信通知测试成功',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: '企业微信通知测试失败',
        error: error.message
      };
    }
  }
}

module.exports = WeChatWorkService;
