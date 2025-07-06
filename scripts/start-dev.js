#!/usr/bin/env node

/**
 * Development startup script
 * Starts both frontend and backend in development mode
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const isWindows = process.platform === 'win32';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logWithPrefix(prefix, message, color = 'reset') {
  console.log(`${colors[color]}[${prefix}]${colors.reset} ${message}`);
}

// Check if frontend directory exists
const frontendPath = path.join(__dirname, '../frontend');
if (!fs.existsSync(frontendPath)) {
  log('❌ Frontend directory not found!', 'red');
  log('Please make sure the frontend is properly set up.', 'yellow');
  process.exit(1);
}

// Check if frontend dependencies are installed
const frontendNodeModules = path.join(frontendPath, 'node_modules');
if (!fs.existsSync(frontendNodeModules)) {
  log('❌ Frontend dependencies not installed!', 'red');
  log('Please run: cd frontend && npm install', 'yellow');
  process.exit(1);
}

// Check if backend dependencies are installed
const backendNodeModules = path.join(__dirname, '../node_modules');
if (!fs.existsSync(backendNodeModules)) {
  log('❌ Backend dependencies not installed!', 'red');
  log('Please run: npm install', 'yellow');
  process.exit(1);
}

log('🚀 Starting Backup Service Development Environment', 'cyan');
log('', 'reset');

// Start backend server
log('📦 Starting backend server...', 'blue');
const backendCmd = isWindows ? 'npm.cmd' : 'npm';
const backend = spawn(backendCmd, ['run', 'dev:backend'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'pipe',
  shell: isWindows
});

backend.stdout.on('data', (data) => {
  const message = data.toString().trim();
  if (message) {
    logWithPrefix('BACKEND', message, 'blue');
  }
});

backend.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message && !message.includes('nodemon')) {
    logWithPrefix('BACKEND', message, 'red');
  }
});

// Start frontend dev server
log('🎨 Starting frontend dev server...', 'magenta');
const frontendCmd = isWindows ? 'npm.cmd' : 'npm';
const frontend = spawn(frontendCmd, ['run', 'dev'], {
  cwd: frontendPath,
  stdio: 'pipe',
  shell: isWindows
});

frontend.stdout.on('data', (data) => {
  const message = data.toString().trim();
  if (message) {
    logWithPrefix('FRONTEND', message, 'magenta');
  }
});

frontend.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message) {
    logWithPrefix('FRONTEND', message, 'red');
  }
});

// Handle process termination
const cleanup = () => {
  log('', 'reset');
  log('🛑 Shutting down development servers...', 'yellow');
  
  if (backend && !backend.killed) {
    backend.kill('SIGTERM');
  }
  
  if (frontend && !frontend.killed) {
    frontend.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 1000);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Handle backend exit
backend.on('exit', (code) => {
  if (code !== 0) {
    logWithPrefix('BACKEND', `Exited with code ${code}`, 'red');
  }
});

// Handle frontend exit
frontend.on('exit', (code) => {
  if (code !== 0) {
    logWithPrefix('FRONTEND', `Exited with code ${code}`, 'red');
  }
});

// Show startup information
setTimeout(() => {
  log('', 'reset');
  log('✅ Development environment started!', 'green');
  log('', 'reset');
  log('📍 Services:', 'bright');
  log('   • Backend API: http://localhost:3000', 'blue');
  log('   • Frontend Dev: http://localhost:5173', 'magenta');
  log('   • Health Check: http://localhost:3000/health', 'cyan');
  log('', 'reset');
  log('🔧 Available commands:', 'bright');
  log('   • Ctrl+C: Stop all services', 'yellow');
  log('   • Backend logs: prefixed with [BACKEND]', 'blue');
  log('   • Frontend logs: prefixed with [FRONTEND]', 'magenta');
  log('', 'reset');
  log('🎯 Open http://localhost:5173 in your browser to start!', 'green');
  log('', 'reset');
}, 3000);
