#!/usr/bin/env node

/**
 * Production build script
 * Builds the frontend and prepares for production deployment
 */

const { spawn, execSync } = require('child_process');
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

function logStep(step, message) {
  log(`[${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    logStep('BUILD', `${description}...`);
    
    const cmd = isWindows && command === 'npm' ? 'npm.cmd' : command;
    const process = spawn(cmd, args, {
      cwd,
      stdio: 'pipe',
      shell: isWindows
    });

    let output = '';
    let errorOutput = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        logSuccess(description + ' completed');
        resolve(output);
      } else {
        logError(`${description} failed with code ${code}`);
        if (errorOutput) {
          console.error(errorOutput);
        }
        reject(new Error(`${description} failed`));
      }
    });
  });
}

async function checkDependencies() {
  logStep('CHECK', 'Checking dependencies...');
  
  const frontendPath = path.join(__dirname, '../frontend');
  const backendPath = path.join(__dirname, '..');
  
  // Check if frontend directory exists
  if (!fs.existsSync(frontendPath)) {
    logError('Frontend directory not found!');
    process.exit(1);
  }
  
  // Check frontend dependencies
  const frontendNodeModules = path.join(frontendPath, 'node_modules');
  if (!fs.existsSync(frontendNodeModules)) {
    logWarning('Frontend dependencies not installed. Installing...');
    await runCommand('npm', ['install'], frontendPath, 'Installing frontend dependencies');
  }
  
  // Check backend dependencies
  const backendNodeModules = path.join(backendPath, 'node_modules');
  if (!fs.existsSync(backendNodeModules)) {
    logWarning('Backend dependencies not installed. Installing...');
    await runCommand('npm', ['install'], backendPath, 'Installing backend dependencies');
  }
  
  logSuccess('Dependencies check completed');
}

async function buildFrontend() {
  const frontendPath = path.join(__dirname, '../frontend');
  
  logStep('BUILD', 'Building frontend for production...');
  
  // Clean previous build
  const publicPath = path.join(__dirname, '../public');
  if (fs.existsSync(publicPath)) {
    logStep('CLEAN', 'Cleaning previous build...');
    fs.rmSync(publicPath, { recursive: true, force: true });
  }
  
  // Build frontend
  await runCommand('npm', ['run', 'build'], frontendPath, 'Building frontend');
  
  // Verify build output
  const indexPath = path.join(publicPath, 'index.html');
  if (!fs.existsSync(indexPath)) {
    logError('Build failed: index.html not found in public directory');
    process.exit(1);
  }
  
  logSuccess('Frontend build completed');
}

async function optimizeBuild() {
  logStep('OPTIMIZE', 'Optimizing build...');
  
  const publicPath = path.join(__dirname, '../public');
  
  // Get build size
  try {
    const stats = fs.statSync(publicPath);
    const sizeInMB = (getDirectorySize(publicPath) / 1024 / 1024).toFixed(2);
    log(`📦 Build size: ${sizeInMB} MB`, 'blue');
  } catch (error) {
    logWarning('Could not calculate build size');
  }
  
  logSuccess('Build optimization completed');
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  function calculateSize(itemPath) {
    const stats = fs.statSync(itemPath);
    
    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const items = fs.readdirSync(itemPath);
      items.forEach(item => {
        calculateSize(path.join(itemPath, item));
      });
    }
  }
  
  calculateSize(dirPath);
  return totalSize;
}

async function generateBuildInfo() {
  logStep('INFO', 'Generating build information...');
  
  const buildInfo = {
    buildTime: new Date().toISOString(),
    version: require('../package.json').version,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch
  };
  
  const buildInfoPath = path.join(__dirname, '../public/build-info.json');
  fs.writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));
  
  logSuccess('Build information generated');
}

async function main() {
  try {
    log('🏗️  Building Backup Service for Production', 'cyan');
    log('', 'reset');
    
    await checkDependencies();
    await buildFrontend();
    await optimizeBuild();
    await generateBuildInfo();
    
    log('', 'reset');
    logSuccess('Production build completed successfully!');
    log('', 'reset');
    log('🚀 Deployment ready:', 'bright');
    log('   • Built files are in the public/ directory', 'blue');
    log('   • Start production server with: npm start', 'blue');
    log('   • Or use: node server.js', 'blue');
    log('', 'reset');
    
  } catch (error) {
    log('', 'reset');
    logError('Build failed!');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the build process
main();
