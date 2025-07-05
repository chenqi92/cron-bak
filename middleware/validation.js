const Joi = require('joi');
const logger = require('../config/logger');

/**
 * Middleware factory for validating request data
 * @param {object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {function} - Express middleware function
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Validation error', {
        property,
        errors: errorDetails,
        url: req.originalUrl,
        method: req.method
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
    }

    // Replace the original data with the validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Authentication schemas
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required()
      .messages({
        'string.alphanum': 'Username can only contain letters and numbers',
        'string.min': 'Username must be at least 3 characters long',
        'string.max': 'Username cannot exceed 30 characters',
        'any.required': 'Username is required'
      }),
    password: Joi.string().min(6).max(100).required()
      .messages({
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password cannot exceed 100 characters',
        'any.required': 'Password is required'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Passwords do not match',
        'any.required': 'Password confirmation is required'
      })
  }),

  login: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).max(100).required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(100).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  }),

  // Backup task schemas
  createTask: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    type: Joi.string().valid('mysql_to_mysql', 'mysql_to_smb', 'minio_to_minio').required(),
    schedule: Joi.string().pattern(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/).required(),
    sourceConfig: Joi.object().required(),
    destinationConfig: Joi.object().required(),
    options: Joi.object().default({})
  }),

  updateTask: Joi.object({
    name: Joi.string().min(1).max(100),
    schedule: Joi.string().pattern(/^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/),
    sourceConfig: Joi.object(),
    destinationConfig: Joi.object(),
    options: Joi.object(),
    is_active: Joi.boolean()
  }),

  // MySQL configuration schemas
  mysqlConfig: Joi.object({
    host: Joi.string().hostname().required(),
    port: Joi.number().integer().min(1).max(65535).default(3306),
    username: Joi.string().required(),
    password: Joi.string().required(),
    database: Joi.string().when('$type', {
      is: 'mysql_to_smb',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    ssl: Joi.object({
      ca: Joi.string(),
      cert: Joi.string(),
      key: Joi.string(),
      rejectUnauthorized: Joi.boolean().default(true)
    }).default({}),
    connectionLimit: Joi.number().integer().min(1).max(100).default(10),
    timeout: Joi.number().integer().min(1000).max(600000).default(60000)
  }),

  // MinIO configuration schemas
  minioConfig: Joi.object({
    endPoint: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).default(9000),
    useSSL: Joi.boolean().default(false),
    accessKey: Joi.string().required(),
    secretKey: Joi.string().required(),
    bucket: Joi.string().required(),
    region: Joi.string().default('us-east-1')
  }),

  // SMB configuration schemas
  smbConfig: Joi.object({
    host: Joi.string().required(),
    port: Joi.number().integer().min(1).max(65535).default(445),
    username: Joi.string().required(),
    password: Joi.string().required(),
    domain: Joi.string().default(''),
    share: Joi.string().required(),
    path: Joi.string().default('/'),
    timeout: Joi.number().integer().min(1000).max(300000).default(30000)
  }),

  // Query parameter schemas
  paginationQuery: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().valid('created_at', 'updated_at', 'name', 'last_run').default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc')
  }),

  taskQuery: Joi.object({
    type: Joi.string().valid('mysql_to_mysql', 'mysql_to_smb', 'minio_to_minio'),
    active: Joi.boolean(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),

  // Notification schemas
  updateNotificationPreference: Joi.object({
    is_enabled: Joi.boolean(),
    config: Joi.object().allow(null),
    triggers: Joi.array().items(
      Joi.string().valid('backup_start', 'backup_success', 'backup_failure')
    )
  }),

  updateModuleEnabled: Joi.object({
    enabled: Joi.boolean().required()
  }),

  updateModuleConfig: Joi.object({
    config: Joi.object().required()
  }),

  testNotification: Joi.object({
    config: Joi.object().required()
  }),

  logQuery: Joi.object({
    taskId: Joi.number().integer().min(1),
    status: Joi.string().valid('running', 'success', 'failed', 'cancelled'),
    days: Joi.number().integer().min(1).max(365).default(30),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: Joi.number().integer().min(1).required()
  })
};

/**
 * Validate backup task configuration based on type
 */
const validateTaskConfig = (req, res, next) => {
  const { type, sourceConfig, destinationConfig } = req.body;

  try {
    // Validate source configuration
    switch (type) {
      case 'mysql_to_mysql':
      case 'mysql_to_smb':
        const { error: sourceError } = schemas.mysqlConfig.validate(sourceConfig, {
          context: { type }
        });
        if (sourceError) {
          return res.status(400).json({
            error: 'Invalid source configuration',
            details: sourceError.details.map(d => ({
              field: `sourceConfig.${d.path.join('.')}`,
              message: d.message
            }))
          });
        }
        break;

      case 'minio_to_minio':
        const { error: minioSourceError } = schemas.minioConfig.validate(sourceConfig);
        if (minioSourceError) {
          return res.status(400).json({
            error: 'Invalid source configuration',
            details: minioSourceError.details.map(d => ({
              field: `sourceConfig.${d.path.join('.')}`,
              message: d.message
            }))
          });
        }
        break;
    }

    // Validate destination configuration
    switch (type) {
      case 'mysql_to_mysql':
        const { error: destMysqlError } = schemas.mysqlConfig.validate(destinationConfig);
        if (destMysqlError) {
          return res.status(400).json({
            error: 'Invalid destination configuration',
            details: destMysqlError.details.map(d => ({
              field: `destinationConfig.${d.path.join('.')}`,
              message: d.message
            }))
          });
        }
        break;

      case 'mysql_to_smb':
        const { error: destSmbError } = schemas.smbConfig.validate(destinationConfig);
        if (destSmbError) {
          return res.status(400).json({
            error: 'Invalid destination configuration',
            details: destSmbError.details.map(d => ({
              field: `destinationConfig.${d.path.join('.')}`,
              message: d.message
            }))
          });
        }
        break;

      case 'minio_to_minio':
        const { error: destMinioError } = schemas.minioConfig.validate(destinationConfig);
        if (destMinioError) {
          return res.status(400).json({
            error: 'Invalid destination configuration',
            details: destMinioError.details.map(d => ({
              field: `destinationConfig.${d.path.join('.')}`,
              message: d.message
            }))
          });
        }
        break;
    }

    next();
  } catch (error) {
    logger.error('Task configuration validation error:', error);
    return res.status(500).json({ error: 'Configuration validation failed' });
  }
};

module.exports = {
  validate,
  schemas,
  validateTaskConfig
};
