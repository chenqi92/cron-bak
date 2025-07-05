#!/usr/bin/env node

/**
 * Startup script that ensures notification system is properly initialized
 * This script runs migrations and then starts the server
 */

const path = require('path');
const { spawn } = require('child_process');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function runMigrations() {
    console.log('🔄 Running notification system migrations...');
    
    return new Promise((resolve, reject) => {
        const migrationScript = path.join(__dirname, 'migrate-notifications.js');
        const child = spawn('node', [migrationScript], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        child.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Migrations completed successfully');
                resolve();
            } else {
                console.error('❌ Migration failed with code:', code);
                reject(new Error(`Migration failed with code ${code}`));
            }
        });

        child.on('error', (error) => {
            console.error('❌ Migration process error:', error);
            reject(error);
        });
    });
}

async function startServer() {
    console.log('🚀 Starting backup service...');
    
    const serverScript = path.join(__dirname, '..', 'server.js');
    const child = spawn('node', [serverScript], {
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    });

    child.on('error', (error) => {
        console.error('❌ Server process error:', error);
        process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('📴 Received SIGTERM, shutting down gracefully...');
        child.kill('SIGTERM');
    });

    process.on('SIGINT', () => {
        console.log('📴 Received SIGINT, shutting down gracefully...');
        child.kill('SIGINT');
    });

    return child;
}

async function main() {
    try {
        console.log('🎯 Starting CronBak with notification system...\n');
        
        // Run migrations first
        await runMigrations();
        
        console.log('\n🎉 System ready! Starting server...\n');
        
        // Start the server
        await startServer();
        
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Startup script failed:', error);
        process.exit(1);
    });
}

module.exports = { runMigrations, startServer, main };
