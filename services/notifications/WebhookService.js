const axios = require('axios');
const BaseNotificationService = require('./BaseNotificationService');

/**
 * Generic Webhook notification service
 */
class WebhookService extends BaseNotificationService {
  constructor(config = {}) {
    super(config);
    this.type = 'webhook';
  }

  /**
   * Send notification via webhook
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
      const requestConfig = this.buildRequest(formatted, config);

      this.log('sending', { url: config.url, method: config.method });

      const response = await axios(requestConfig);

      this.log('sent successfully', { 
        status: response.status,
        statusText: response.statusText,
        message_title: formatted.title
      });

      return {
        success: true,
        response: {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        },
        message: 'Webhook通知发送成功'
      };
    } catch (error) {
      this.logError('send', error, { message: message.title });
      
      // Provide more detailed error information
      if (error.response) {
        throw new Error(`Webhook请求失败: ${error.response.status} ${error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Webhook请求超时或网络错误');
      } else {
        throw error;
      }
    }
  }

  /**
   * Build webhook request configuration
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - Axios request configuration
   */
  buildRequest(formatted, config) {
    const payload = this.buildPayload(formatted, config);
    
    const requestConfig = {
      method: config.method || 'POST',
      url: config.url,
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CronBak-NotificationService/1.0',
        ...config.headers
      },
      timeout: config.timeout || 10000
    };

    // Add authentication if configured
    if (config.auth_type && config.auth_config) {
      this.addAuthentication(requestConfig, config);
    }

    return requestConfig;
  }

  /**
   * Add authentication to request
   * @param {object} requestConfig - Request configuration
   * @param {object} config - User configuration
   */
  addAuthentication(requestConfig, config) {
    const { auth_type, auth_config } = config;

    switch (auth_type) {
      case 'basic':
        if (auth_config.username && auth_config.password) {
          requestConfig.auth = {
            username: auth_config.username,
            password: auth_config.password
          };
        }
        break;
      
      case 'bearer':
        if (auth_config.token) {
          requestConfig.headers.Authorization = `Bearer ${auth_config.token}`;
        }
        break;
      
      case 'api_key':
        if (auth_config.key && auth_config.value) {
          if (auth_config.location === 'header') {
            requestConfig.headers[auth_config.key] = auth_config.value;
          } else if (auth_config.location === 'query') {
            const url = new URL(requestConfig.url);
            url.searchParams.set(auth_config.key, auth_config.value);
            requestConfig.url = url.toString();
          }
        }
        break;
    }
  }

  /**
   * Build webhook payload
   * @param {object} formatted - Formatted message
   * @param {object} config - Configuration
   * @returns {object} - Webhook payload
   */
  buildPayload(formatted, config) {
    const { original } = formatted;
    
    // Standard payload format
    const payload = {
      notification: {
        title: formatted.title,
        content: formatted.content,
        timestamp: new Date().toISOString(),
        service: 'cron-bak'
      },
      trigger: {
        type: original.trigger_type,
        task_id: original.task_id,
        task_name: original.task_name,
        task_type: original.task_type
      },
      details: {
        status: original.status,
        duration: original.duration,
        bytes_transferred: original.bytes_transferred,
        files_transferred: original.files_transferred,
        error_details: original.error_details
      }
    };

    // Allow custom payload format if specified
    if (config.payload_format === 'custom' && config.custom_template) {
      return this.applyCustomTemplate(config.custom_template, { formatted, original });
    }

    return payload;
  }

  /**
   * Apply custom template to payload
   * @param {string} template - Custom template
   * @param {object} data - Data to apply to template
   * @returns {object} - Custom payload
   */
  applyCustomTemplate(template, data) {
    try {
      // Simple template replacement
      let customPayload = template;
      
      // Replace variables in template
      customPayload = customPayload.replace(/\{\{title\}\}/g, data.formatted.title);
      customPayload = customPayload.replace(/\{\{content\}\}/g, data.formatted.content);
      customPayload = customPayload.replace(/\{\{trigger_type\}\}/g, data.original.trigger_type);
      customPayload = customPayload.replace(/\{\{task_name\}\}/g, data.original.task_name || '');
      customPayload = customPayload.replace(/\{\{task_type\}\}/g, data.original.task_type || '');
      customPayload = customPayload.replace(/\{\{status\}\}/g, data.original.status || '');
      customPayload = customPayload.replace(/\{\{timestamp\}\}/g, new Date().toISOString());

      return JSON.parse(customPayload);
    } catch (error) {
      this.logError('custom_template', error);
      // Fallback to standard payload
      return this.buildPayload(data.formatted, {});
    }
  }

  /**
   * Validate webhook configuration
   * @param {object} config - Configuration to validate
   * @returns {object} - Validation result
   */
  validateConfig(config) {
    const errors = [];

    if (!config.url) {
      errors.push('Webhook URL是必需的');
    } else if (!this.isValidUrl(config.url)) {
      errors.push('Webhook URL格式无效');
    }

    if (config.method && !['GET', 'POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
      errors.push('HTTP方法必须是GET、POST、PUT或PATCH');
    }

    if (config.auth_type && !['basic', 'bearer', 'api_key'].includes(config.auth_type)) {
      errors.push('认证类型必须是basic、bearer或api_key');
    }

    if (config.auth_type === 'basic' && config.auth_config) {
      if (!config.auth_config.username || !config.auth_config.password) {
        errors.push('Basic认证需要用户名和密码');
      }
    }

    if (config.auth_type === 'bearer' && config.auth_config) {
      if (!config.auth_config.token) {
        errors.push('Bearer认证需要访问令牌');
      }
    }

    if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
      errors.push('超时时间必须是大于1000的数字（毫秒）');
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
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Test webhook connection
   * @param {object} config - Configuration to test
   * @returns {Promise<object>} - Test result
   */
  async testConnection(config) {
    try {
      const testMessage = {
        title: 'Webhook通知测试',
        content: '这是一条测试通知消息，用于验证Webhook配置是否正确。\n\n如果您收到此消息，说明配置成功！',
        trigger_type: 'test',
        timestamp: new Date().toISOString()
      };

      const result = await this.send(testMessage, config);
      return {
        success: true,
        message: 'Webhook通知测试成功',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Webhook通知测试失败',
        error: error.message
      };
    }
  }
}

module.exports = WebhookService;
