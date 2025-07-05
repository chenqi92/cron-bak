const { runQuery, getQuery, allQuery } = require('../config/database');
const logger = require('../config/logger');

class BackupLog {
  constructor(data) {
    this.id = data.id;
    this.task_id = data.task_id;
    this.status = data.status;
    this.started_at = data.started_at;
    this.completed_at = data.completed_at;
    this.duration = data.duration;
    this.message = data.message;
    this.error_details = data.error_details;
    this.bytes_transferred = data.bytes_transferred;
    this.files_transferred = data.files_transferred;
  }

  /**
   * Create a new backup log entry
   * @param {object} logData - Log data
   * @returns {Promise<BackupLog>} - Created log entry
   */
  static async create(logData) {
    try {
      const {
        taskId,
        status = 'running',
        message = '',
        errorDetails = null,
        bytesTransferred = 0,
        filesTransferred = 0
      } = logData;

      const result = await runQuery(`
        INSERT INTO backup_logs (
          task_id, status, message, error_details, bytes_transferred, files_transferred
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        taskId,
        status,
        message,
        errorDetails,
        bytesTransferred,
        filesTransferred
      ]);

      return await BackupLog.findById(result.id);
    } catch (error) {
      logger.error('Error creating backup log:', error);
      throw error;
    }
  }

  /**
   * Find log by ID
   * @param {number} id - Log ID
   * @returns {Promise<BackupLog|null>} - Log or null if not found
   */
  static async findById(id) {
    try {
      const row = await getQuery('SELECT * FROM backup_logs WHERE id = ?', [id]);
      return row ? new BackupLog(row) : null;
    } catch (error) {
      logger.error('Error finding backup log by ID:', error);
      throw error;
    }
  }

  /**
   * Get logs for a specific task
   * @param {number} taskId - Task ID
   * @param {number} limit - Maximum number of logs to return
   * @returns {Promise<BackupLog[]>} - Array of logs
   */
  static async findByTaskId(taskId, limit = 50) {
    try {
      const rows = await allQuery(`
        SELECT * FROM backup_logs 
        WHERE task_id = ? 
        ORDER BY started_at DESC 
        LIMIT ?
      `, [taskId, limit]);
      
      return rows.map(row => new BackupLog(row));
    } catch (error) {
      logger.error('Error finding backup logs by task ID:', error);
      throw error;
    }
  }

  /**
   * Get recent logs across all tasks for a user
   * @param {number} limit - Maximum number of logs to return
   * @param {number} userId - User ID (optional, if null returns all)
   * @param {string} status - Filter by status (optional)
   * @returns {Promise<BackupLog[]>} - Array of logs
   */
  static async findRecent(limit = 100, userId = null, status = null) {
    try {
      let sql = `
        SELECT bl.*, bt.name as task_name, bt.type as task_type
        FROM backup_logs bl
        JOIN backup_tasks bt ON bl.task_id = bt.id
      `;
      const params = [];
      const conditions = [];

      if (userId) {
        conditions.push('bt.user_id = ?');
        params.push(userId);
      }

      if (status) {
        conditions.push('bl.status = ?');
        params.push(status);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }

      sql += ' ORDER BY bl.started_at DESC LIMIT ?';
      params.push(limit);

      const rows = await allQuery(sql, params);
      return rows.map(row => {
        const log = new BackupLog(row);
        log.task_name = row.task_name;
        log.task_type = row.task_type;
        return log;
      });
    } catch (error) {
      logger.error('Error finding recent backup logs:', error);
      throw error;
    }
  }

  /**
   * Get backup statistics
   * @param {number} days - Number of days to look back
   * @param {number} userId - User ID (optional, if null returns all)
   * @returns {Promise<object>} - Statistics object
   */
  static async getStatistics(days = 30, userId = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let sql = `
        SELECT
          COUNT(*) as total_backups,
          SUM(CASE WHEN bl.status = 'success' THEN 1 ELSE 0 END) as successful_backups,
          SUM(CASE WHEN bl.status = 'failed' THEN 1 ELSE 0 END) as failed_backups,
          SUM(CASE WHEN bl.status = 'running' THEN 1 ELSE 0 END) as running_backups,
          AVG(bl.duration) as avg_duration,
          SUM(bl.bytes_transferred) as total_bytes_transferred,
          SUM(bl.files_transferred) as total_files_transferred
        FROM backup_logs bl
      `;

      const params = [cutoffDate.toISOString()];

      if (userId) {
        sql += `
          JOIN backup_tasks bt ON bl.task_id = bt.id
          WHERE bl.started_at >= ? AND bt.user_id = ?
        `;
        params.push(userId);
      } else {
        sql += ' WHERE bl.started_at >= ?';
      }

      const stats = await getQuery(sql, params);

      return {
        totalBackups: stats.total_backups || 0,
        successfulBackups: stats.successful_backups || 0,
        failedBackups: stats.failed_backups || 0,
        runningBackups: stats.running_backups || 0,
        successRate: stats.total_backups > 0
          ? ((stats.successful_backups / stats.total_backups) * 100).toFixed(2)
          : 0,
        avgDuration: stats.avg_duration || 0,
        totalBytesTransferred: stats.total_bytes_transferred || 0,
        totalFilesTransferred: stats.total_files_transferred || 0,
        period: `${days} days`
      };
    } catch (error) {
      logger.error('Error getting backup statistics:', error);
      throw error;
    }
  }

  /**
   * Update log entry
   * @param {object} updates - Updates to apply
   * @returns {Promise<void>}
   */
  async update(updates) {
    try {
      const allowedFields = [
        'status', 'completed_at', 'duration', 'message', 
        'error_details', 'bytes_transferred', 'files_transferred'
      ];
      
      const updateFields = [];
      const updateValues = [];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }

      if (updateFields.length === 0) {
        return;
      }

      updateValues.push(this.id);
      const sql = `UPDATE backup_logs SET ${updateFields.join(', ')} WHERE id = ?`;
      await runQuery(sql, updateValues);

      // Update instance properties
      Object.assign(this, updates);
    } catch (error) {
      logger.error('Error updating backup log:', error);
      throw error;
    }
  }

  /**
   * Mark log as completed
   * @param {string} status - Final status ('success' or 'failed')
   * @param {string} message - Completion message
   * @param {string} errorDetails - Error details (if failed)
   * @param {number} bytesTransferred - Bytes transferred
   * @param {number} filesTransferred - Files transferred
   * @returns {Promise<void>}
   */
  async complete(status, message, errorDetails = null, bytesTransferred = 0, filesTransferred = 0) {
    try {
      const completedAt = new Date();
      const startedAt = new Date(this.started_at);
      const duration = completedAt.getTime() - startedAt.getTime();

      await this.update({
        status,
        completed_at: completedAt.toISOString(),
        duration,
        message,
        error_details: errorDetails,
        bytes_transferred: bytesTransferred,
        files_transferred: filesTransferred
      });
    } catch (error) {
      logger.error('Error completing backup log:', error);
      throw error;
    }
  }

  /**
   * Delete old logs
   * @param {number} retentionDays - Number of days to retain logs
   * @returns {Promise<number>} - Number of deleted logs
   */
  static async deleteOldLogs(retentionDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await runQuery(
        'DELETE FROM backup_logs WHERE started_at < ?',
        [cutoffDate.toISOString()]
      );

      logger.info('Old backup logs deleted', { 
        deletedCount: result.changes,
        retentionDays 
      });

      return result.changes;
    } catch (error) {
      logger.error('Error deleting old backup logs:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON
   * @returns {object} - Log data
   */
  toJSON() {
    return {
      id: this.id,
      task_id: this.task_id,
      task_name: this.task_name,
      task_type: this.task_type,
      status: this.status,
      started_at: this.started_at,
      completed_at: this.completed_at,
      duration: this.duration,
      message: this.message,
      error_details: this.error_details,
      bytes_transferred: this.bytes_transferred,
      files_transferred: this.files_transferred
    };
  }
}

module.exports = BackupLog;
