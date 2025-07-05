const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.dirname(process.env.LOG_FILE || './logs/backup_service.log');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'backup-service' },
  transports: [
    // File transport
    new winston.transports.File({
      filename: process.env.LOG_FILE || './logs/backup_service.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Error file transport
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Add backup-specific logging methods
logger.backupStart = (taskId, taskName, type) => {
  logger.info('Backup started', {
    taskId,
    taskName,
    type,
    event: 'backup_start'
  });
};

logger.backupSuccess = (taskId, taskName, duration, stats = {}) => {
  logger.info('Backup completed successfully', {
    taskId,
    taskName,
    duration,
    stats,
    event: 'backup_success'
  });
};

logger.backupError = (taskId, taskName, error, duration = null) => {
  logger.error('Backup failed', {
    taskId,
    taskName,
    error: error.message,
    stack: error.stack,
    duration,
    event: 'backup_error'
  });
};

logger.backupWarning = (taskId, taskName, warning) => {
  logger.warn('Backup warning', {
    taskId,
    taskName,
    warning,
    event: 'backup_warning'
  });
};

logger.schedulerEvent = (event, details = {}) => {
  logger.info('Scheduler event', {
    event: `scheduler_${event}`,
    ...details
  });
};

logger.authEvent = (event, username, ip, details = {}) => {
  logger.info('Authentication event', {
    event: `auth_${event}`,
    username,
    ip,
    ...details
  });
};

logger.apiRequest = (method, url, ip, duration, status) => {
  logger.info('API request', {
    method,
    url,
    ip,
    duration,
    status,
    event: 'api_request'
  });
};

module.exports = logger;
