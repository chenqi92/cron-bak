const cron = require('node-cron');
const BackupTask = require('../models/BackupTask');
const BackupLog = require('../models/BackupLog');
const mysqlBackup = require('./mysqlBackup');
const minioSync = require('./minioSync');
const smbBackup = require('./smbBackup');
const logger = require('../config/logger');

// Store scheduled tasks
const scheduledTasks = new Map();
const runningTasks = new Map();

/**
 * Initialize the scheduler and load all active tasks
 */
async function initializeScheduler() {
  try {
    logger.schedulerEvent('initializing');
    
    // Load all active tasks
    const activeTasks = await BackupTask.findAll(true);
    
    for (const task of activeTasks) {
      await scheduleTask(task);
    }
    
    // Schedule cleanup job to run daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        const retentionDays = parseInt(process.env.BACKUP_LOG_RETENTION_DAYS) || 30;
        await BackupLog.deleteOldLogs(retentionDays);
        logger.schedulerEvent('cleanup_completed', { retentionDays });
      } catch (error) {
        logger.error('Scheduled cleanup failed:', error);
      }
    });
    
    logger.schedulerEvent('initialized', { 
      scheduledTasks: activeTasks.length 
    });
  } catch (error) {
    logger.error('Failed to initialize scheduler:', error);
    throw error;
  }
}

/**
 * Schedule a backup task
 * @param {BackupTask} task - Task to schedule
 */
async function scheduleTask(task) {
  try {
    // Unschedule existing task if it exists
    await unscheduleTask(task.id);
    
    if (!task.is_active) {
      logger.schedulerEvent('task_skipped_inactive', { 
        taskId: task.id, 
        name: task.name 
      });
      return;
    }

    // Validate cron expression
    if (!cron.validate(task.schedule)) {
      throw new Error(`Invalid cron expression: ${task.schedule}`);
    }

    // Create scheduled task
    const scheduledTask = cron.schedule(task.schedule, async () => {
      await executeTask(task);
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'UTC'
    });

    scheduledTasks.set(task.id, scheduledTask);
    
    // Calculate next run time
    const nextRun = getNextRunTime(task.schedule);
    await task.updateNextRun(nextRun);
    
    logger.schedulerEvent('task_scheduled', {
      taskId: task.id,
      name: task.name,
      schedule: task.schedule,
      nextRun: nextRun.toISOString()
    });
  } catch (error) {
    logger.error('Failed to schedule task:', error);
    throw error;
  }
}

/**
 * Unschedule a backup task
 * @param {number} taskId - Task ID to unschedule
 */
async function unscheduleTask(taskId) {
  try {
    const scheduledTask = scheduledTasks.get(taskId);
    
    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask.destroy();
      scheduledTasks.delete(taskId);
      
      logger.schedulerEvent('task_unscheduled', { taskId });
    }
  } catch (error) {
    logger.error('Failed to unschedule task:', error);
    throw error;
  }
}

/**
 * Execute a backup task
 * @param {BackupTask} task - Task to execute
 */
async function executeTask(task) {
  // Check if task is already running
  if (runningTasks.has(task.id)) {
    logger.schedulerEvent('task_already_running', {
      taskId: task.id,
      name: task.name
    });
    return;
  }

  // Check maximum concurrent backups
  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_BACKUPS) || 3;
  if (runningTasks.size >= maxConcurrent) {
    logger.schedulerEvent('max_concurrent_reached', {
      taskId: task.id,
      name: task.name,
      maxConcurrent,
      currentRunning: runningTasks.size
    });
    return;
  }

  let logEntry;
  
  try {
    // Create log entry
    logEntry = await BackupLog.create({
      taskId: task.id,
      status: 'running',
      message: 'Backup started'
    });

    // Mark task as running
    runningTasks.set(task.id, {
      task,
      logEntry,
      startTime: new Date()
    });

    // Update task last run
    await task.updateLastRun();

    logger.backupStart(task.id, task.name, task.type);

    // Execute backup based on type
    let result;
    switch (task.type) {
      case 'mysql_to_mysql':
        result = await mysqlBackup.syncMysqlToMysql(task);
        break;
      case 'mysql_to_smb':
        result = await smbBackup.backupMysqlToSmb(task);
        break;
      case 'minio_to_minio':
        result = await minioSync.syncMinioToMinio(task);
        break;
      default:
        throw new Error(`Unknown backup type: ${task.type}`);
    }

    // Complete log entry with success
    await logEntry.complete(
      'success',
      result.message || 'Backup completed successfully',
      null,
      result.bytesTransferred || 0,
      result.filesTransferred || 0
    );

    logger.backupSuccess(
      task.id,
      task.name,
      logEntry.duration,
      {
        bytesTransferred: result.bytesTransferred || 0,
        filesTransferred: result.filesTransferred || 0
      }
    );

    // Update next run time
    const nextRun = getNextRunTime(task.schedule);
    await task.updateNextRun(nextRun);

  } catch (error) {
    // Complete log entry with failure
    if (logEntry) {
      await logEntry.complete(
        'failed',
        'Backup failed',
        error.message
      );
    }

    logger.backupError(task.id, task.name, error, logEntry?.duration);
  } finally {
    // Remove from running tasks
    runningTasks.delete(task.id);
  }
}

/**
 * Run a task immediately (manual execution)
 * @param {BackupTask} task - Task to run
 * @returns {BackupLog} - Log entry for the execution
 */
async function runTaskNow(task) {
  // Create log entry
  const logEntry = await BackupLog.create({
    taskId: task.id,
    status: 'running',
    message: 'Manual backup started'
  });

  // Execute task asynchronously
  setImmediate(() => executeTask(task));

  return logEntry;
}

/**
 * Get the next run time for a cron expression
 * @param {string} cronExpression - Cron expression
 * @returns {Date} - Next run time
 */
function getNextRunTime(cronExpression) {
  try {
    // This is a simplified implementation
    // In a real application, you'd use a proper cron parser
    const now = new Date();
    const nextRun = new Date(now.getTime() + 60000); // Add 1 minute as placeholder
    
    // Parse cron expression (simplified)
    const parts = cronExpression.split(' ');
    if (parts.length === 5) {
      // Basic parsing for common patterns
      const [minute, hour, day, month, weekday] = parts;
      
      if (minute !== '*' && hour !== '*') {
        const targetHour = parseInt(hour);
        const targetMinute = parseInt(minute);
        
        const next = new Date(now);
        next.setHours(targetHour, targetMinute, 0, 0);
        
        // If time has passed today, schedule for tomorrow
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        
        return next;
      }
    }
    
    return nextRun;
  } catch (error) {
    logger.error('Error calculating next run time:', error);
    return new Date(Date.now() + 60000); // Default to 1 minute from now
  }
}

/**
 * Get status of all scheduled and running tasks
 * @returns {object} - Scheduler status
 */
function getSchedulerStatus() {
  return {
    scheduledTasks: Array.from(scheduledTasks.keys()),
    runningTasks: Array.from(runningTasks.entries()).map(([taskId, info]) => ({
      taskId,
      name: info.task.name,
      type: info.task.type,
      startTime: info.startTime,
      duration: Date.now() - info.startTime.getTime()
    })),
    totalScheduled: scheduledTasks.size,
    totalRunning: runningTasks.size
  };
}

/**
 * Stop all scheduled tasks (for graceful shutdown)
 */
function stopScheduler() {
  logger.schedulerEvent('stopping');
  
  for (const [taskId, scheduledTask] of scheduledTasks) {
    try {
      scheduledTask.stop();
      scheduledTask.destroy();
    } catch (error) {
      logger.error(`Error stopping scheduled task ${taskId}:`, error);
    }
  }
  
  scheduledTasks.clear();
  logger.schedulerEvent('stopped');
}

module.exports = {
  initializeScheduler,
  scheduleTask,
  unscheduleTask,
  executeTask,
  runTaskNow,
  getSchedulerStatus,
  stopScheduler
};
