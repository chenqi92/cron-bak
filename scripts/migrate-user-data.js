#!/usr/bin/env node

/**
 * Database Migration Script for User Data Isolation
 * This script migrates existing data to support user-based data isolation
 */

const path = require('path');
const { hashPassword } = require('../config/encryption');
const { initializeDatabase, getDatabase } = require('../config/database');

// Configuration
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/backup.db');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function runMigration() {
    console.log('🚀 Starting database migration for user data isolation...');
    
    if (!ADMIN_PASSWORD) {
        console.error('❌ ADMIN_PASSWORD environment variable is required');
        process.exit(1);
    }

    try {
        // Initialize database first
        await initializeDatabase();
        console.log('✅ Database initialized');

        // Get database instance
        const db = getDatabase();
        console.log('✅ Database connection established');

        // Start transaction
        const transaction = db.transaction(() => {
            // Step 1: Check if migrations table exists
            const migrationTableExists = db.prepare(`
                SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'
            `).get();

            if (!migrationTableExists) {
                console.log('📋 Creating migrations table...');
                db.exec(`
                    CREATE TABLE migrations (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT UNIQUE NOT NULL,
                        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `);
            }

            // Step 2: Check if this migration has already been run
            const migrationExists = db.prepare('SELECT * FROM migrations WHERE name = ?').get('user_data_isolation');
            if (migrationExists) {
                console.log('⚠️  Migration already applied, skipping...');
                return;
            }

            // Step 3: Create admin user if not exists
            console.log('👤 Creating admin user...');
            const userExists = db.prepare('SELECT * FROM users WHERE username = ?').get(ADMIN_USERNAME);
            let adminUserId;

            if (!userExists) {
                const passwordHash = hashPassword(ADMIN_PASSWORD);
                const result = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(ADMIN_USERNAME, passwordHash);
                adminUserId = result.lastInsertRowid;
                console.log(`✅ Admin user created with ID: ${adminUserId}`);
            } else {
                adminUserId = userExists.id;
                console.log(`✅ Admin user already exists with ID: ${adminUserId}`);
            }

            // Step 4: Add user_id column to backup_tasks if not exists
            console.log('🔧 Updating backup_tasks table...');
            const taskColumns = db.pragma('table_info(backup_tasks)');
            const hasUserIdInTasks = taskColumns.some(col => col.name === 'user_id');
            
            if (!hasUserIdInTasks) {
                db.exec('ALTER TABLE backup_tasks ADD COLUMN user_id INTEGER');
                console.log('✅ Added user_id column to backup_tasks');
            }

            // Update existing tasks to belong to admin user
            const tasksUpdated = db.prepare('UPDATE backup_tasks SET user_id = ? WHERE user_id IS NULL').run(adminUserId);
            console.log(`✅ Updated ${tasksUpdated.changes} backup tasks to belong to admin user`);

            // Step 5: Add user_id column to credentials if not exists
            console.log('🔧 Updating credentials table...');
            const credColumns = db.pragma('table_info(credentials)');
            const hasUserIdInCreds = credColumns.some(col => col.name === 'user_id');
            
            if (!hasUserIdInCreds) {
                db.exec('ALTER TABLE credentials ADD COLUMN user_id INTEGER');
                console.log('✅ Added user_id column to credentials');
            }

            // Update existing credentials to belong to admin user
            const credsUpdated = db.prepare('UPDATE credentials SET user_id = ? WHERE user_id IS NULL').run(adminUserId);
            console.log(`✅ Updated ${credsUpdated.changes} credentials to belong to admin user`);

            // Step 6: Add user_id column to backup_logs if not exists
            console.log('🔧 Updating backup_logs table...');
            const logColumns = db.pragma('table_info(backup_logs)');
            const hasUserIdInLogs = logColumns.some(col => col.name === 'user_id');
            
            if (!hasUserIdInLogs) {
                db.exec('ALTER TABLE backup_logs ADD COLUMN user_id INTEGER');
                console.log('✅ Added user_id column to backup_logs');
            }

            // Update existing logs to belong to admin user
            const logsUpdated = db.prepare('UPDATE backup_logs SET user_id = ? WHERE user_id IS NULL').run(adminUserId);
            console.log(`✅ Updated ${logsUpdated.changes} backup logs to belong to admin user`);

            // Step 7: Create indexes for better performance
            console.log('📊 Creating indexes...');
            try {
                db.exec('CREATE INDEX IF NOT EXISTS idx_backup_tasks_user_id ON backup_tasks(user_id)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id)');
                db.exec('CREATE INDEX IF NOT EXISTS idx_backup_logs_user_id ON backup_logs(user_id)');
                console.log('✅ Indexes created successfully');
            } catch (error) {
                console.log('⚠️  Some indexes may already exist:', error.message);
            }

            // Step 8: Record migration
            db.prepare('INSERT INTO migrations (name) VALUES (?)').run('user_data_isolation');
            console.log('✅ Migration recorded in database');
        });

        // Execute transaction
        transaction();
        console.log('🎉 Migration completed successfully!');

        // Display summary
        const stats = {
            users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
            tasks: db.prepare('SELECT COUNT(*) as count FROM backup_tasks').get().count,
            credentials: db.prepare('SELECT COUNT(*) as count FROM credentials').get().count,
            logs: db.prepare('SELECT COUNT(*) as count FROM backup_logs').get().count
        };

        console.log('\n📊 Database Summary:');
        console.log(`   Users: ${stats.users}`);
        console.log(`   Backup Tasks: ${stats.tasks}`);
        console.log(`   Credentials: ${stats.credentials}`);
        console.log(`   Backup Logs: ${stats.logs}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        // Database will be closed by the application
        console.log('🔒 Migration completed');
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
