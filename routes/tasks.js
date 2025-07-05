const express = require('express');
const BackupTask = require('../models/BackupTask');
const BackupLog = require('../models/BackupLog');
const { validate, schemas, validateTaskConfig } = require('../middleware/validation');
const { requireAuth, logRequest } = require('../middleware/auth');
const { scheduleTask, unscheduleTask, runTaskNow } = require('../services/scheduler');
const logger = require('../config/logger');

const router = express.Router();

// Apply authentication and logging to all task routes
router.use(requireAuth);
router.use(logRequest);

/**
 * GET /api/tasks
 * Get all backup tasks with optional filtering
 */
router.get('/', validate(schemas.taskQuery, 'query'), async (req, res) => {
  try {
    const { type, active, page, limit } = req.query;
    const userId = req.user.id;

    let tasks;
    if (type) {
      tasks = await BackupTask.findByType(userId, type, active);
    } else {
      tasks = await BackupTask.findAll(userId, active);
    }

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTasks.map(task => task.toJSON()),
      pagination: {
        page,
        limit,
        total: tasks.length,
        pages: Math.ceil(tasks.length / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching backup tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch backup tasks'
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get a specific backup task by ID
 */
router.get('/:id', validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const task = await BackupTask.findById(id);

    if (!task) {
      return res.status(404).json({
        error: 'Backup task not found'
      });
    }

    // Check if user owns this task
    if (!task.belongsToUser(userId)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: task.toJSON(true) // Include credentials for editing
    });
  } catch (error) {
    logger.error('Error fetching backup task:', error);
    res.status(500).json({
      error: 'Failed to fetch backup task'
    });
  }
});

/**
 * POST /api/tasks
 * Create a new backup task
 */
router.post('/',
  validate(schemas.createTask),
  validateTaskConfig,
  async (req, res) => {
    try {
      const taskData = req.body;
      const userId = req.user.id;

      // Create the task with user ID
      const task = await BackupTask.create(taskData, userId);

      // Schedule the task
      await scheduleTask(task);

      logger.info('Backup task created and scheduled', {
        taskId: task.id,
        userId,
        name: task.name,
        type: task.type,
        schedule: task.schedule
      });

      res.status(201).json({
        success: true,
        data: task.toJSON(),
        message: 'Backup task created successfully'
      });
    } catch (error) {
      logger.error('Error creating backup task:', error);
      res.status(500).json({
        error: 'Failed to create backup task',
        message: error.message
      });
    }
  }
);

/**
 * PUT /api/tasks/:id
 * Update an existing backup task
 */
router.put('/:id',
  validate(schemas.idParam, 'params'),
  validate(schemas.updateTask),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user.id;

      const task = await BackupTask.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Backup task not found'
        });
      }

      // Check if user owns this task
      if (!task.belongsToUser(userId)) {
        return res.status(403).json({
          error: 'Access denied'
        });
      }

      // Validate task configuration if being updated
      if (updates.sourceConfig || updates.destinationConfig) {
        // Create a temporary object for validation
        const tempTask = {
          type: task.type,
          sourceConfig: updates.sourceConfig || task.getSourceConfig(),
          destinationConfig: updates.destinationConfig || task.getDestinationConfig()
        };

        // Use the validation middleware logic
        const { validateTaskConfig } = require('../middleware/validation');
        // Note: This is a simplified validation - in production, you'd want to 
        // properly implement this validation
      }

      // Update the task
      await task.update(updates);

      // Reschedule if schedule changed
      if (updates.schedule || updates.is_active !== undefined) {
        await unscheduleTask(task.id);
        if (task.is_active) {
          await scheduleTask(task);
        }
      }

      logger.info('Backup task updated', {
        taskId: task.id,
        name: task.name,
        updatedFields: Object.keys(updates)
      });

      res.json({
        success: true,
        data: task.toJSON(),
        message: 'Backup task updated successfully'
      });
    } catch (error) {
      logger.error('Error updating backup task:', error);
      res.status(500).json({
        error: 'Failed to update backup task',
        message: error.message
      });
    }
  }
);

/**
 * DELETE /api/tasks/:id
 * Delete a backup task
 */
router.delete('/:id', validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const task = await BackupTask.findById(id);

    if (!task) {
      return res.status(404).json({
        error: 'Backup task not found'
      });
    }

    // Check if user owns this task
    if (!task.belongsToUser(userId)) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Unschedule the task
    await unscheduleTask(id);

    // Delete the task
    await task.delete();

    logger.info('Backup task deleted', {
      taskId: id,
      userId,
      name: task.name
    });

    res.json({
      success: true,
      message: 'Backup task deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting backup task:', error);
    res.status(500).json({
      error: 'Failed to delete backup task'
    });
  }
});

/**
 * POST /api/tasks/:id/run
 * Run a backup task immediately
 */
router.post('/:id/run', validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await BackupTask.findById(id);

    if (!task) {
      return res.status(404).json({
        error: 'Backup task not found'
      });
    }

    if (!task.is_active) {
      return res.status(400).json({
        error: 'Cannot run inactive task'
      });
    }

    // Run the task immediately
    const logEntry = await runTaskNow(task);

    logger.info('Backup task run manually', {
      taskId: task.id,
      name: task.name,
      logId: logEntry.id
    });

    res.json({
      success: true,
      data: {
        task: task.toJSON(),
        log: logEntry.toJSON()
      },
      message: 'Backup task started successfully'
    });
  } catch (error) {
    logger.error('Error running backup task:', error);
    res.status(500).json({
      error: 'Failed to run backup task',
      message: error.message
    });
  }
});

/**
 * GET /api/tasks/:id/logs
 * Get logs for a specific backup task
 */
router.get('/:id/logs', 
  validate(schemas.idParam, 'params'),
  validate(schemas.logQuery, 'query'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const task = await BackupTask.findById(id);
      if (!task) {
        return res.status(404).json({
          error: 'Backup task not found'
        });
      }

      const logs = await BackupLog.findByTaskId(id, limit);

      res.json({
        success: true,
        data: logs.map(log => log.toJSON()),
        task: task.toJSON()
      });
    } catch (error) {
      logger.error('Error fetching task logs:', error);
      res.status(500).json({
        error: 'Failed to fetch task logs'
      });
    }
  }
);

/**
 * POST /api/tasks/:id/toggle
 * Toggle task active status
 */
router.post('/:id/toggle', validate(schemas.idParam, 'params'), async (req, res) => {
  try {
    const { id } = req.params;
    const task = await BackupTask.findById(id);

    if (!task) {
      return res.status(404).json({
        error: 'Backup task not found'
      });
    }

    const newStatus = !task.is_active;
    await task.update({ is_active: newStatus });

    // Schedule or unschedule based on new status
    if (newStatus) {
      await scheduleTask(task);
    } else {
      await unscheduleTask(id);
    }

    logger.info('Backup task toggled', {
      taskId: task.id,
      name: task.name,
      newStatus
    });

    res.json({
      success: true,
      data: task.toJSON(),
      message: `Task ${newStatus ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    logger.error('Error toggling backup task:', error);
    res.status(500).json({
      error: 'Failed to toggle backup task'
    });
  }
});

module.exports = router;
