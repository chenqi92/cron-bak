const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const DB_PATH = process.env.DB_PATH || './data/backup_service.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;

function getDatabase() {
  if (!db) {
    try {
      db = new Database(DB_PATH);
      logger.info('Connected to SQLite database');
    } catch (err) {
      logger.error('Error opening database:', err);
      throw err;
    }
  }
  return db;
}

async function initializeDatabase() {
  const database = getDatabase();

  try {
    // Users table
    database.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
        is_super_admin BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Backup tasks table
    database.exec(`
      CREATE TABLE IF NOT EXISTS backup_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('mysql_to_mysql', 'mysql_to_smb', 'minio_to_minio')),
        schedule TEXT NOT NULL,
        source_config TEXT NOT NULL,
        destination_config TEXT NOT NULL,
        options TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_run DATETIME,
        next_run DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Backup logs table
    database.exec(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        duration INTEGER,
        message TEXT,
        error_details TEXT,
        bytes_transferred INTEGER DEFAULT 0,
        files_transferred INTEGER DEFAULT 0,
        FOREIGN KEY (task_id) REFERENCES backup_tasks (id) ON DELETE CASCADE
      )
    `);

    // Credentials table (encrypted)
    database.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('mysql', 'minio', 'smb')),
        encrypted_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        UNIQUE(user_id, name)
      )
    `);

    // System settings table
    database.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification modules table
    database.exec(`
      CREATE TABLE IF NOT EXISTS notification_modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('wechat_work', 'dingtalk', 'webhook', 'synology_chat')),
        display_name TEXT NOT NULL,
        description TEXT,
        is_enabled BOOLEAN DEFAULT 0,
        global_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User notification preferences table
    database.exec(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        is_enabled BOOLEAN DEFAULT 0,
        config TEXT,
        triggers TEXT DEFAULT '["backup_start","backup_success","backup_failure"]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES notification_modules (id) ON DELETE CASCADE,
        UNIQUE(user_id, module_id)
      )
    `);

    // Notification logs table
    database.exec(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        task_id INTEGER,
        trigger_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'pending')),
        message TEXT,
        error_details TEXT,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (module_id) REFERENCES notification_modules (id) ON DELETE CASCADE,
        FOREIGN KEY (task_id) REFERENCES backup_tasks (id) ON DELETE SET NULL
      )
    `);

    // Run database migrations
    await runMigrations(database);

    logger.info('Database tables initialized successfully');
  } catch (err) {
    logger.error('Error creating tables:', err);
    throw err;
  }
}

async function runMigrations(database) {
  try {
    // Check if migrations table exists
    const migrationTableExists = database.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
    `).get();

    if (!migrationTableExists) {
      database.exec(`
        CREATE TABLE migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Migration 1: Add user_id to existing tables
    const migration1 = database.prepare('SELECT * FROM migrations WHERE name = ?').get('add_user_id_columns');
    if (!migration1) {
      try {
        // Check if user_id column already exists in backup_tasks
        const taskColumns = database.pragma('table_info(backup_tasks)');
        const hasUserIdInTasks = taskColumns.some(col => col.name === 'user_id');

        if (!hasUserIdInTasks) {
          database.exec('ALTER TABLE backup_tasks ADD COLUMN user_id INTEGER');
          // Set default user_id to 1 for existing tasks (assuming first user is admin)
          database.exec('UPDATE backup_tasks SET user_id = 1 WHERE user_id IS NULL');
        }

        // Check if user_id column already exists in credentials
        const credColumns = database.pragma('table_info(credentials)');
        const hasUserIdInCreds = credColumns.some(col => col.name === 'user_id');

        if (!hasUserIdInCreds) {
          database.exec('ALTER TABLE credentials ADD COLUMN user_id INTEGER');
          // Set default user_id to 1 for existing credentials
          database.exec('UPDATE credentials SET user_id = 1 WHERE user_id IS NULL');
        }

        // Record migration
        database.prepare('INSERT INTO migrations (name) VALUES (?)').run('add_user_id_columns');
        logger.info('Migration completed: add_user_id_columns');
      } catch (error) {
        logger.warn('Migration add_user_id_columns already applied or failed:', error.message);
      }
    }

    // Migration 2: Add role and notification system
    const migration2 = database.prepare('SELECT * FROM migrations WHERE name = ?').get('add_notification_system');
    if (!migration2) {
      try {
        // Add role and is_super_admin columns to users table
        const userColumns = database.pragma('table_info(users)');
        const hasRole = userColumns.some(col => col.name === 'role');
        const hasSuperAdmin = userColumns.some(col => col.name === 'is_super_admin');

        if (!hasRole) {
          database.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
        }
        if (!hasSuperAdmin) {
          database.exec('ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0');
        }

        // Set admin user as super admin
        database.exec('UPDATE users SET role = "super_admin", is_super_admin = 1 WHERE username = ?', [process.env.ADMIN_USERNAME || 'admin']);

        // Insert default notification modules
        const insertModule = database.prepare(`
          INSERT OR IGNORE INTO notification_modules (name, type, display_name, description, is_enabled)
          VALUES (?, ?, ?, ?, ?)
        `);

        insertModule.run('wechat_work', 'wechat_work', '企业微信', '通过企业微信发送通知消息', 0);
        insertModule.run('dingtalk', 'dingtalk', '钉钉', '通过钉钉发送通知消息', 0);
        insertModule.run('webhook', 'webhook', '自定义Webhook', '通过HTTP Webhook发送通知', 0);
        insertModule.run('synology_chat', 'synology_chat', 'Synology Chat', '通过Synology Chat发送通知', 0);

        // Record migration
        database.prepare('INSERT INTO migrations (name) VALUES (?)').run('add_notification_system');
        logger.info('Migration completed: add_notification_system');
      } catch (error) {
        logger.warn('Migration add_notification_system already applied or failed:', error.message);
      }
    }

  } catch (error) {
    logger.error('Error running migrations:', error);
    // Don't throw error to prevent app from failing on migration issues
  }
}

function runQuery(sql, params = []) {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    const result = stmt.run(params);
    return Promise.resolve({ id: result.lastInsertRowid, changes: result.changes });
  } catch (err) {
    return Promise.reject(err);
  }
}

function getQuery(sql, params = []) {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    const result = stmt.get(params);
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}

function allQuery(sql, params = []) {
  const database = getDatabase();
  try {
    const stmt = database.prepare(sql);
    const result = stmt.all(params);
    return Promise.resolve(result);
  } catch (err) {
    return Promise.reject(err);
  }
}

function closeDatabase() {
  if (db) {
    try {
      db.close();
      logger.info('Database connection closed');
    } catch (err) {
      logger.error('Error closing database:', err);
    }
  }
}

module.exports = {
  getDatabase,
  initializeDatabase,
  runQuery,
  getQuery,
  allQuery,
  closeDatabase
};
