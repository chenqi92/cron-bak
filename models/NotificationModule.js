const { runQuery, getQuery, allQuery } = require('../config/database');
const { encryptCredentials, decryptCredentials } = require('../config/encryption');
const logger = require('../config/logger');

class NotificationModule {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.display_name = data.display_name;
    this.description = data.description;
    this.is_enabled = data.is_enabled;
    this.global_config = data.global_config;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Get all notification modules
   * @returns {Promise<NotificationModule[]>} - Array of notification modules
   */
  static async findAll() {
    try {
      const rows = await allQuery('SELECT * FROM notification_modules ORDER BY display_name');
      return rows.map(row => new NotificationModule(row));
    } catch (error) {
      logger.error('Error finding all notification modules:', error);
      throw error;
    }
  }

  /**
   * Get enabled notification modules
   * @returns {Promise<NotificationModule[]>} - Array of enabled notification modules
   */
  static async findEnabled() {
    try {
      const rows = await allQuery('SELECT * FROM notification_modules WHERE is_enabled = 1 ORDER BY display_name');
      return rows.map(row => new NotificationModule(row));
    } catch (error) {
      logger.error('Error finding enabled notification modules:', error);
      throw error;
    }
  }

  /**
   * Find notification module by ID
   * @param {number} id - Module ID
   * @returns {Promise<NotificationModule|null>} - Module or null if not found
   */
  static async findById(id) {
    try {
      const row = await getQuery('SELECT * FROM notification_modules WHERE id = ?', [id]);
      return row ? new NotificationModule(row) : null;
    } catch (error) {
      logger.error('Error finding notification module by ID:', error);
      throw error;
    }
  }

  /**
   * Find notification module by name
   * @param {string} name - Module name
   * @returns {Promise<NotificationModule|null>} - Module or null if not found
   */
  static async findByName(name) {
    try {
      const row = await getQuery('SELECT * FROM notification_modules WHERE name = ?', [name]);
      return row ? new NotificationModule(row) : null;
    } catch (error) {
      logger.error('Error finding notification module by name:', error);
      throw error;
    }
  }

  /**
   * Update module enabled status
   * @param {boolean} isEnabled - Whether module is enabled
   * @returns {Promise<void>}
   */
  async updateEnabled(isEnabled) {
    try {
      await runQuery(
        'UPDATE notification_modules SET is_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [isEnabled, this.id]
      );
      
      this.is_enabled = isEnabled;
      logger.info('Notification module enabled status updated', { 
        moduleId: this.id, 
        name: this.name, 
        isEnabled 
      });
    } catch (error) {
      logger.error('Error updating notification module enabled status:', error);
      throw error;
    }
  }

  /**
   * Update module global configuration
   * @param {object} config - Global configuration object
   * @returns {Promise<void>}
   */
  async updateGlobalConfig(config) {
    try {
      const encryptedConfig = config ? encryptCredentials(config) : null;
      
      await runQuery(
        'UPDATE notification_modules SET global_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [encryptedConfig, this.id]
      );
      
      this.global_config = encryptedConfig;
      logger.info('Notification module global config updated', { 
        moduleId: this.id, 
        name: this.name 
      });
    } catch (error) {
      logger.error('Error updating notification module global config:', error);
      throw error;
    }
  }

  /**
   * Get decrypted global configuration
   * @returns {object|null} - Decrypted configuration object or null
   */
  getGlobalConfig() {
    try {
      return this.global_config ? decryptCredentials(this.global_config) : null;
    } catch (error) {
      logger.error('Error decrypting global config:', error);
      return null;
    }
  }

  /**
   * Get configuration schema for this module type
   * @returns {object} - Configuration schema
   */
  getConfigSchema() {
    const schemas = {
      wechat_work: {
        webhook_url: { type: 'string', required: true, label: 'Webhook URL' },
        secret: { type: 'string', required: false, label: '密钥 (可选)' }
      },
      dingtalk: {
        webhook_url: { type: 'string', required: true, label: 'Webhook URL' },
        secret: { type: 'string', required: false, label: '加签密钥 (可选)' }
      },
      webhook: {
        url: { type: 'string', required: true, label: 'Webhook URL' },
        method: { type: 'select', required: true, label: 'HTTP方法', options: ['POST', 'PUT'] },
        headers: { type: 'object', required: false, label: '自定义请求头' },
        auth_type: { type: 'select', required: false, label: '认证类型', options: ['none', 'basic', 'bearer'] },
        auth_config: { type: 'object', required: false, label: '认证配置' }
      },
      synology_chat: {
        webhook_url: { type: 'string', required: true, label: 'Webhook URL' },
        token: { type: 'string', required: false, label: '访问令牌 (可选)' }
      }
    };

    return schemas[this.type] || {};
  }

  /**
   * Convert to JSON
   * @returns {object} - Module data
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      display_name: this.display_name,
      description: this.description,
      is_enabled: this.is_enabled,
      has_global_config: !!this.global_config,
      config_schema: this.getConfigSchema(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = NotificationModule;
