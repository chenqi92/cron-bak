const { runQuery, getQuery, allQuery } = require('../config/database');
const { encryptCredentials, decryptCredentials } = require('../config/encryption');
const logger = require('../config/logger');

class UserNotificationPreference {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.module_id = data.module_id;
    this.is_enabled = data.is_enabled;
    this.config = data.config;
    this.triggers = data.triggers;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   * @returns {Promise<UserNotificationPreference[]>} - Array of user preferences
   */
  static async findByUserId(userId) {
    try {
      const rows = await allQuery(`
        SELECT unp.*, nm.name, nm.type, nm.display_name, nm.description, nm.is_enabled as module_enabled
        FROM user_notification_preferences unp
        JOIN notification_modules nm ON unp.module_id = nm.id
        WHERE unp.user_id = ?
        ORDER BY nm.display_name
      `, [userId]);
      
      return rows.map(row => {
        const preference = new UserNotificationPreference(row);
        preference.module_name = row.name;
        preference.module_type = row.type;
        preference.module_display_name = row.display_name;
        preference.module_description = row.description;
        preference.module_enabled = row.module_enabled;
        return preference;
      });
    } catch (error) {
      logger.error('Error finding user notification preferences:', error);
      throw error;
    }
  }

  /**
   * Get user preference for specific module
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @returns {Promise<UserNotificationPreference|null>} - Preference or null if not found
   */
  static async findByUserAndModule(userId, moduleId) {
    try {
      const row = await getQuery(
        'SELECT * FROM user_notification_preferences WHERE user_id = ? AND module_id = ?',
        [userId, moduleId]
      );
      return row ? new UserNotificationPreference(row) : null;
    } catch (error) {
      logger.error('Error finding user notification preference:', error);
      throw error;
    }
  }

  /**
   * Create or update user notification preference
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @param {object} data - Preference data
   * @returns {Promise<UserNotificationPreference>} - Created or updated preference
   */
  static async createOrUpdate(userId, moduleId, data) {
    try {
      const existing = await UserNotificationPreference.findByUserAndModule(userId, moduleId);
      
      if (existing) {
        await existing.update(data);
        return existing;
      } else {
        return await UserNotificationPreference.create(userId, moduleId, data);
      }
    } catch (error) {
      logger.error('Error creating or updating user notification preference:', error);
      throw error;
    }
  }

  /**
   * Create new user notification preference
   * @param {number} userId - User ID
   * @param {number} moduleId - Module ID
   * @param {object} data - Preference data
   * @returns {Promise<UserNotificationPreference>} - Created preference
   */
  static async create(userId, moduleId, data) {
    try {
      const {
        is_enabled = false,
        config = null,
        triggers = ['backup_start', 'backup_success', 'backup_failure']
      } = data;

      const encryptedConfig = config ? encryptCredentials(config) : null;
      const triggersJson = JSON.stringify(triggers);

      const result = await runQuery(`
        INSERT INTO user_notification_preferences (user_id, module_id, is_enabled, config, triggers)
        VALUES (?, ?, ?, ?, ?)
      `, [userId, moduleId, is_enabled, encryptedConfig, triggersJson]);

      logger.info('User notification preference created', {
        userId,
        moduleId,
        preferenceId: result.id
      });

      return await UserNotificationPreference.findByUserAndModule(userId, moduleId);
    } catch (error) {
      logger.error('Error creating user notification preference:', error);
      throw error;
    }
  }

  /**
   * Update user notification preference
   * @param {object} data - Updated preference data
   * @returns {Promise<void>}
   */
  async update(data) {
    try {
      const updates = [];
      const values = [];

      if (data.hasOwnProperty('is_enabled')) {
        updates.push('is_enabled = ?');
        values.push(data.is_enabled);
      }

      if (data.hasOwnProperty('config')) {
        updates.push('config = ?');
        values.push(data.config ? encryptCredentials(data.config) : null);
      }

      if (data.hasOwnProperty('triggers')) {
        updates.push('triggers = ?');
        values.push(JSON.stringify(data.triggers));
      }

      if (updates.length === 0) {
        return;
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(this.id);

      await runQuery(
        `UPDATE user_notification_preferences SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      // Update instance properties
      if (data.hasOwnProperty('is_enabled')) {
        this.is_enabled = data.is_enabled;
      }
      if (data.hasOwnProperty('config')) {
        this.config = data.config ? encryptCredentials(data.config) : null;
      }
      if (data.hasOwnProperty('triggers')) {
        this.triggers = JSON.stringify(data.triggers);
      }

      logger.info('User notification preference updated', {
        preferenceId: this.id,
        userId: this.user_id,
        moduleId: this.module_id
      });
    } catch (error) {
      logger.error('Error updating user notification preference:', error);
      throw error;
    }
  }

  /**
   * Get decrypted configuration
   * @returns {object|null} - Decrypted configuration object or null
   */
  getConfig() {
    try {
      return this.config ? decryptCredentials(this.config) : null;
    } catch (error) {
      logger.error('Error decrypting user notification config:', error);
      return null;
    }
  }

  /**
   * Get triggers array
   * @returns {string[]} - Array of trigger types
   */
  getTriggers() {
    try {
      return this.triggers ? JSON.parse(this.triggers) : [];
    } catch (error) {
      logger.error('Error parsing triggers:', error);
      return [];
    }
  }

  /**
   * Check if trigger is enabled
   * @param {string} triggerType - Trigger type to check
   * @returns {boolean} - True if trigger is enabled
   */
  hasTrigger(triggerType) {
    const triggers = this.getTriggers();
    return triggers.includes(triggerType);
  }

  /**
   * Convert to JSON
   * @returns {object} - Preference data
   */
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      module_id: this.module_id,
      module_name: this.module_name,
      module_type: this.module_type,
      module_display_name: this.module_display_name,
      module_description: this.module_description,
      module_enabled: this.module_enabled,
      is_enabled: this.is_enabled,
      has_config: !!this.config,
      triggers: this.getTriggers(),
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

module.exports = UserNotificationPreference;
