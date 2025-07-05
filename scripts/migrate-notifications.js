#!/usr/bin/env node

/**
 * Migration script for notification system
 * This script adds notification system tables and updates user roles
 */

const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || './data/backup_service.db';

async function runMigration() {
    console.log('🚀 Starting notification system migration...');
    
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 Created directory: ${dataDir}`);
    }

    let db;
    try {
        // Connect to database
        db = new Database(DB_PATH);
        console.log('📊 Connected to database');

        // Start transaction
        db.exec('BEGIN TRANSACTION');

        // Step 1: Add role and is_super_admin columns to users table if not exists
        console.log('🔧 Updating users table...');
        const userColumns = db.pragma('table_info(users)');
        const hasRole = userColumns.some(col => col.name === 'role');
        const hasSuperAdmin = userColumns.some(col => col.name === 'is_super_admin');

        if (!hasRole) {
            db.exec('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "user"');
            console.log('✅ Added role column to users table');
        }

        if (!hasSuperAdmin) {
            db.exec('ALTER TABLE users ADD COLUMN is_super_admin BOOLEAN DEFAULT 0');
            console.log('✅ Added is_super_admin column to users table');
        }

        // Step 2: Create notification_modules table
        console.log('🔧 Creating notification_modules table...');
        db.exec(`
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
        console.log('✅ Created notification_modules table');

        // Step 3: Create user_notification_preferences table
        console.log('🔧 Creating user_notification_preferences table...');
        db.exec(`
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
        console.log('✅ Created user_notification_preferences table');

        // Step 4: Create notification_logs table
        console.log('🔧 Creating notification_logs table...');
        db.exec(`
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
        console.log('✅ Created notification_logs table');

        // Step 5: Insert default notification modules
        console.log('🔧 Inserting default notification modules...');
        const insertModule = db.prepare(`
            INSERT OR IGNORE INTO notification_modules (name, type, display_name, description, is_enabled)
            VALUES (?, ?, ?, ?, ?)
        `);

        const modules = [
            ['wechat_work', 'wechat_work', '企业微信', '通过企业微信发送通知消息', 0],
            ['dingtalk', 'dingtalk', '钉钉', '通过钉钉发送通知消息', 0],
            ['webhook', 'webhook', '自定义Webhook', '通过HTTP Webhook发送通知', 0],
            ['synology_chat', 'synology_chat', 'Synology Chat', '通过Synology Chat发送通知', 0]
        ];

        modules.forEach(module => {
            insertModule.run(...module);
        });
        console.log('✅ Inserted default notification modules');

        // Step 6: Update admin user to super admin
        console.log('🔧 Updating admin user role...');
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const updateAdmin = db.prepare('UPDATE users SET role = ?, is_super_admin = ? WHERE username = ?');
        const result = updateAdmin.run('super_admin', 1, adminUsername);
        
        if (result.changes > 0) {
            console.log(`✅ Updated admin user "${adminUsername}" to super admin`);
        } else {
            console.log(`⚠️  Admin user "${adminUsername}" not found or already updated`);
        }

        // Step 7: Create indexes for better performance
        console.log('📊 Creating indexes...');
        try {
            db.exec('CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id ON user_notification_preferences(user_id)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_module_id ON user_notification_preferences(module_id)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_module_id ON notification_logs(module_id)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_task_id ON notification_logs(task_id)');
            db.exec('CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at)');
            console.log('✅ Indexes created successfully');
        } catch (error) {
            console.log('⚠️  Some indexes may already exist:', error.message);
        }

        // Step 8: Record migration
        console.log('📝 Recording migration...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        const recordMigration = db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)');
        recordMigration.run('add_notification_system');
        console.log('✅ Migration recorded');

        // Commit transaction
        db.exec('COMMIT');
        console.log('✅ Transaction committed');

        console.log('\n🎉 Notification system migration completed successfully!');
        console.log('\n📋 Summary:');
        console.log('- ✅ Updated users table with role and super admin fields');
        console.log('- ✅ Created notification_modules table');
        console.log('- ✅ Created user_notification_preferences table');
        console.log('- ✅ Created notification_logs table');
        console.log('- ✅ Inserted default notification modules');
        console.log(`- ✅ Updated admin user "${adminUsername}" to super admin`);
        console.log('- ✅ Created database indexes');
        console.log('\n🚀 You can now start the service and use the notification features!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        if (db) {
            try {
                db.exec('ROLLBACK');
                console.log('🔄 Transaction rolled back');
            } catch (rollbackError) {
                console.error('❌ Rollback failed:', rollbackError);
            }
        }
        process.exit(1);
    } finally {
        if (db) {
            db.close();
            console.log('📊 Database connection closed');
        }
    }
}

// Run migration if this script is executed directly
if (require.main === module) {
    runMigration().catch(error => {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    });
}

module.exports = { runMigration };
