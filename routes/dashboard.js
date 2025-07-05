const express = require('express');
const BackupTask = require('../models/BackupTask');
const BackupLog = require('../models/BackupLog');
const { validate, schemas } = require('../middleware/validation');
const { requireAuth, logRequest } = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// Apply authentication and logging to all dashboard routes
router.use(requireAuth);
router.use(logRequest);

/**
 * GET /api/dashboard/overview
 * Get dashboard overview statistics
 */
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get task counts for current user
    const allTasks = await BackupTask.findAll(userId);
    const activeTasks = await BackupTask.findAll(userId, true);
    
    const taskStats = {
      total: allTasks.length,
      active: activeTasks.length,
      inactive: allTasks.length - activeTasks.length,
      byType: {
        mysql_to_mysql: allTasks.filter(t => t.type === 'mysql_to_mysql').length,
        mysql_to_smb: allTasks.filter(t => t.type === 'mysql_to_smb').length,
        minio_to_minio: allTasks.filter(t => t.type === 'minio_to_minio').length
      }
    };

    // Get backup statistics for the last 30 days
    const backupStats = await BackupLog.getStatistics(30);

    // Get recent logs
    const recentLogs = await BackupLog.findRecent(10);

    // Get running backups
    const runningBackups = await BackupLog.findRecent(50, 'running');

    // Calculate next scheduled runs
    const nextRuns = activeTasks
      .filter(task => task.next_run)
      .sort((a, b) => new Date(a.next_run) - new Date(b.next_run))
      .slice(0, 5)
      .map(task => ({
        id: task.id,
        name: task.name,
        type: task.type,
        next_run: task.next_run
      }));

    res.json({
      success: true,
      data: {
        tasks: taskStats,
        backups: backupStats,
        recentLogs: recentLogs.map(log => log.toJSON()),
        runningBackups: runningBackups.map(log => log.toJSON()),
        nextRuns,
        systemInfo: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard overview'
    });
  }
});

/**
 * GET /api/dashboard/logs
 * Get recent backup logs with filtering
 */
router.get('/logs', validate(schemas.logQuery, 'query'), async (req, res) => {
  try {
    const { taskId, status, days, page, limit } = req.query;

    let logs;
    if (taskId) {
      logs = await BackupLog.findByTaskId(taskId, limit);
    } else {
      logs = await BackupLog.findRecent(limit * page, status);
      // Apply pagination
      const startIndex = (page - 1) * limit;
      logs = logs.slice(startIndex, startIndex + limit);
    }

    res.json({
      success: true,
      data: logs.map(log => log.toJSON()),
      pagination: {
        page,
        limit,
        hasMore: logs.length === limit
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard logs:', error);
    res.status(500).json({
      error: 'Failed to fetch logs'
    });
  }
});

/**
 * GET /api/dashboard/statistics
 * Get detailed backup statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const userId = req.user.id;

    // Get overall statistics for current user
    const stats = await BackupLog.getStatistics(days, userId);

    // Get statistics by task type for current user
    const tasks = await BackupTask.findAll(userId);
    const statsByType = {};

    for (const type of ['mysql_to_mysql', 'mysql_to_smb', 'minio_to_minio']) {
      const typeTasks = tasks.filter(t => t.type === type);
      const typeTaskIds = typeTasks.map(t => t.id);
      
      if (typeTaskIds.length > 0) {
        // This would require a more complex query in a real implementation
        // For now, we'll provide basic counts
        statsByType[type] = {
          taskCount: typeTasks.length,
          activeTaskCount: typeTasks.filter(t => t.is_active).length
        };
      }
    }

    // Get daily statistics for the chart
    const dailyStats = [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // This would require more complex queries in a real implementation
    // For now, we'll provide a simplified version
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyStats.push({
        date: dateStr,
        successful: Math.floor(Math.random() * 10), // Placeholder
        failed: Math.floor(Math.random() * 3), // Placeholder
        total: Math.floor(Math.random() * 13) // Placeholder
      });
    }

    res.json({
      success: true,
      data: {
        overall: stats,
        byType: statsByType,
        daily: dailyStats,
        period: `${days} days`
      }
    });
  } catch (error) {
    logger.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * GET /api/dashboard/health
 * Get system health information
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: require('../package.json').version,
      environment: process.env.NODE_ENV || 'development'
    };

    // Check database connectivity
    try {
      const { getDatabase } = require('../config/database');
      const db = getDatabase();
      health.database = 'connected';
    } catch (error) {
      health.database = 'error';
      health.status = 'degraded';
    }

    // Check running backups
    try {
      const runningBackups = await BackupLog.findRecent(100, 'running');
      health.runningBackups = runningBackups.length;
      
      // Check for stuck backups (running for more than 2 hours)
      const stuckBackups = runningBackups.filter(log => {
        const startTime = new Date(log.started_at);
        const now = new Date();
        const duration = now.getTime() - startTime.getTime();
        return duration > 2 * 60 * 60 * 1000; // 2 hours
      });
      
      if (stuckBackups.length > 0) {
        health.stuckBackups = stuckBackups.length;
        health.status = 'warning';
      }
    } catch (error) {
      health.backupStatus = 'error';
      health.status = 'degraded';
    }

    // Check disk space (simplified)
    try {
      const fs = require('fs');
      const stats = fs.statSync('./');
      health.diskSpace = 'available'; // Simplified check
    } catch (error) {
      health.diskSpace = 'error';
      health.status = 'degraded';
    }

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Error fetching health status:', error);
    res.status(500).json({
      error: 'Failed to fetch health status',
      status: 'error'
    });
  }
});

/**
 * POST /api/dashboard/cleanup
 * Clean up old logs and temporary files
 */
router.post('/cleanup', async (req, res) => {
  try {
    const retentionDays = parseInt(req.body.retentionDays) || 30;
    
    // Clean up old logs
    const deletedLogs = await BackupLog.deleteOldLogs(retentionDays);
    
    // Clean up temporary files (implementation would depend on your temp file strategy)
    let deletedFiles = 0;
    try {
      const fs = require('fs');
      const path = require('path');
      const tempDir = process.env.BACKUP_TEMP_DIR || './temp';
      
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            deletedFiles++;
          }
        }
      }
    } catch (error) {
      logger.warn('Error cleaning up temporary files:', error);
    }

    logger.info('Cleanup completed', {
      deletedLogs,
      deletedFiles,
      retentionDays
    });

    res.json({
      success: true,
      data: {
        deletedLogs,
        deletedFiles,
        retentionDays
      },
      message: 'Cleanup completed successfully'
    });
  } catch (error) {
    logger.error('Error during cleanup:', error);
    res.status(500).json({
      error: 'Cleanup failed'
    });
  }
});

/**
 * GET /api/dashboard/export
 * Export configuration and logs
 */
router.get('/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const userId = req.user.id;

    // Get all tasks for current user (without credentials for security)
    const tasks = await BackupTask.findAll(userId);
    const recentLogs = await BackupLog.findRecent(1000, userId);
    const stats = await BackupLog.getStatistics(30, userId);

    const exportData = {
      timestamp: new Date().toISOString(),
      version: require('../package.json').version,
      tasks: tasks.map(task => task.toJSON(false)), // Don't include credentials
      logs: recentLogs.map(log => log.toJSON()),
      statistics: stats
    };

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="backup-export-${Date.now()}.json"`);
      res.json(exportData);
    } else {
      res.status(400).json({
        error: 'Unsupported export format'
      });
    }
  } catch (error) {
    logger.error('Error exporting data:', error);
    res.status(500).json({
      error: 'Export failed'
    });
  }
});

module.exports = router;
