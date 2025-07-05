const { runQuery, getQuery, allQuery } = require('../config/database');
const { encryptCredentials, decryptCredentials } = require('../config/encryption');
const logger = require('../config/logger');

class BackupTask {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.name = data.name;
    this.type = data.type;
    this.schedule = data.schedule;
    this.source_config = data.source_config;
    this.destination_config = data.destination_config;
    this.options = data.options;
    this.is_active = data.is_active;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
    this.last_run = data.last_run;
    this.next_run = data.next_run;
  }

  /**
   * Check if user owns this task
   * @param {number} userId - User ID to check
   * @returns {boolean} - True if user owns this task
   */
  belongsToUser(userId) {
    return this.user_id === userId;
  }

  /**
   * Create a new backup task
   * @param {object} taskData - Task configuration
   * @param {number} userId - User ID who owns this task
   * @returns {Promise<BackupTask>} - Created task
   */
  static async create(taskData, userId) {
    try {
      const {
        name,
        type,
        schedule,
        sourceConfig,
        destinationConfig,
        options = {}
      } = taskData;

      if (!userId) {
        throw new Error('User ID is required');
      }

      // Encrypt sensitive configuration data
      const encryptedSourceConfig = encryptCredentials(sourceConfig);
      const encryptedDestinationConfig = encryptCredentials(destinationConfig);
      const optionsJson = JSON.stringify(options);

      const result = await runQuery(`
        INSERT INTO backup_tasks (
          user_id, name, type, schedule, source_config, destination_config, options
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        name,
        type,
        schedule,
        encryptedSourceConfig,
        encryptedDestinationConfig,
        optionsJson
      ]);

      logger.info('Backup task created', {
        taskId: result.id,
        userId,
        name,
        type,
        schedule
      });

      return await BackupTask.findById(result.id);
    } catch (error) {
      logger.error('Error creating backup task:', error);
      throw error;
    }
  }

  /**
   * Find task by ID
   * @param {number} id - Task ID
   * @returns {Promise<BackupTask|null>} - Task or null if not found
   */
  static async findById(id) {
    try {
      const row = await getQuery('SELECT * FROM backup_tasks WHERE id = ?', [id]);
      return row ? new BackupTask(row) : null;
    } catch (error) {
      logger.error('Error finding backup task by ID:', error);
      throw error;
    }
  }

  /**
   * Get all backup tasks for a user
   * @param {number} userId - User ID
   * @param {boolean} activeOnly - Return only active tasks
   * @returns {Promise<BackupTask[]>} - Array of tasks
   */
  static async findAll(userId, activeOnly = false) {
    try {
      const sql = activeOnly
        ? 'SELECT * FROM backup_tasks WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
        : 'SELECT * FROM backup_tasks WHERE user_id = ? ORDER BY created_at DESC';

      const rows = await allQuery(sql, [userId]);
      return rows.map(row => new BackupTask(row));
    } catch (error) {
      logger.error('Error finding all backup tasks:', error);
      throw error;
    }
  }

  /**
   * Get tasks by type for a user
   * @param {number} userId - User ID
   * @param {string} type - Task type
   * @param {boolean} activeOnly - Return only active tasks
   * @returns {Promise<BackupTask[]>} - Array of tasks
   */
  static async findByType(userId, type, activeOnly = false) {
    try {
      const sql = activeOnly
        ? 'SELECT * FROM backup_tasks WHERE user_id = ? AND type = ? AND is_active = 1 ORDER BY created_at DESC'
        : 'SELECT * FROM backup_tasks WHERE user_id = ? AND type = ? ORDER BY created_at DESC';

      const rows = await allQuery(sql, [userId, type]);
      return rows.map(row => new BackupTask(row));
    } catch (error) {
      logger.error('Error finding backup tasks by type:', error);
      throw error;
    }
  }

  /**
   * Get backup task count for a user
   * @param {number} userId - User ID
   * @param {object} options - Query options
   * @returns {Promise<number>} - Task count
   */
  static async getCount(userId, options = {}) {
    try {
      const { type = null, active = null } = options;

      let query = 'SELECT COUNT(*) as count FROM backup_tasks WHERE user_id = ?';
      const params = [userId];

      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }

      if (active !== null) {
        query += ' AND is_active = ?';
        params.push(active ? 1 : 0);
      }

      const result = await getQuery(query, params);
      return result ? result.count : 0;
    } catch (error) {
      logger.error('Error getting backup task count:', error);
      throw error;
    }
  }

  /**
   * Get all backup tasks across all users (for system operations)
   * @param {boolean} activeOnly - Return only active tasks
   * @returns {Promise<BackupTask[]>} - Array of tasks
   */
  static async findAllSystem(activeOnly = false) {
    try {
      const sql = activeOnly
        ? 'SELECT * FROM backup_tasks WHERE is_active = 1 ORDER BY created_at DESC'
        : 'SELECT * FROM backup_tasks ORDER BY created_at DESC';

      const rows = await allQuery(sql);
      return rows.map(row => new BackupTask(row));
    } catch (error) {
      logger.error('Error finding all system backup tasks:', error);
      throw error;
    }
  }

  /**
   * Get decrypted source configuration
   * @returns {object} - Decrypted source configuration
   */
  getSourceConfig() {
    try {
      return decryptCredentials(this.source_config);
    } catch (error) {
      logger.error('Error decrypting source config:', error);
      throw new Error('Failed to decrypt source configuration');
    }
  }

  /**
   * Get decrypted destination configuration
   * @returns {object} - Decrypted destination configuration
   */
  getDestinationConfig() {
    try {
      return decryptCredentials(this.destination_config);
    } catch (error) {
      logger.error('Error decrypting destination config:', error);
      throw new Error('Failed to decrypt destination configuration');
    }
  }

  /**
   * Get parsed options
   * @returns {object} - Parsed options object
   */
  getOptions() {
    try {
      return this.options ? JSON.parse(this.options) : {};
    } catch (error) {
      logger.error('Error parsing task options:', error);
      return {};
    }
  }

  /**
   * Update task configuration
   * @param {object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async update(updates) {
    try {
      const allowedFields = [
        'name', 'schedule', 'sourceConfig', 'destinationConfig', 'options', 'is_active'
      ];
      
      const updateFields = [];
      const updateValues = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          if (key === 'sourceConfig') {
            updateFields.push('source_config = ?');
            updateValues.push(encryptCredentials(value));
          } else if (key === 'destinationConfig') {
            updateFields.push('destination_config = ?');
            updateValues.push(encryptCredentials(value));
          } else if (key === 'options') {
            updateFields.push('options = ?');
            updateValues.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = ?`);
            updateValues.push(value);
          }
        }
      }

      if (updateFields.length === 0) {
        return;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(this.id);

      const sql = `UPDATE backup_tasks SET ${updateFields.join(', ')} WHERE id = ?`;
      await runQuery(sql, updateValues);

      // Update instance properties
      Object.assign(this, updates);
      this.updated_at = new Date().toISOString();

      logger.info('Backup task updated', { 
        taskId: this.id, 
        name: this.name,
        updatedFields: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Error updating backup task:', error);
      throw error;
    }
  }

  /**
   * Update last run timestamp
   * @param {Date} timestamp - Run timestamp
   * @returns {Promise<void>}
   */
  async updateLastRun(timestamp = new Date()) {
    try {
      await runQuery(
        'UPDATE backup_tasks SET last_run = ? WHERE id = ?',
        [timestamp.toISOString(), this.id]
      );
      this.last_run = timestamp.toISOString();
    } catch (error) {
      logger.error('Error updating last run:', error);
      throw error;
    }
  }

  /**
   * Update next run timestamp
   * @param {Date} timestamp - Next run timestamp
   * @returns {Promise<void>}
   */
  async updateNextRun(timestamp) {
    try {
      await runQuery(
        'UPDATE backup_tasks SET next_run = ? WHERE id = ?',
        [timestamp.toISOString(), this.id]
      );
      this.next_run = timestamp.toISOString();
    } catch (error) {
      logger.error('Error updating next run:', error);
      throw error;
    }
  }

  /**
   * Delete task
   * @returns {Promise<void>}
   */
  async delete() {
    try {
      await runQuery('DELETE FROM backup_tasks WHERE id = ?', [this.id]);
      logger.info('Backup task deleted', { taskId: this.id, name: this.name });
    } catch (error) {
      logger.error('Error deleting backup task:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON (with decrypted configs for API responses)
   * @param {boolean} includeCredentials - Include decrypted credentials
   * @returns {object} - Task data
   */
  toJSON(includeCredentials = false) {
    const data = {
      id: this.id,
      name: this.name,
      type: this.type,
      schedule: this.schedule,
      options: this.getOptions(),
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      last_run: this.last_run,
      next_run: this.next_run
    };

    if (includeCredentials) {
      data.sourceConfig = this.getSourceConfig();
      data.destinationConfig = this.getDestinationConfig();
    }

    return data;
  }
}

module.exports = BackupTask;
