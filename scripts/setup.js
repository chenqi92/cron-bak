#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateSecureKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

async function setup() {
  console.log('🚀 Welcome to Backup Service Setup!\n');
  
  // Check if .env already exists
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      rl.close();
      return;
    }
  }

  console.log('📝 Let\'s configure your backup service...\n');

  // Basic configuration
  const port = await question('🌐 Server port (default: 3000): ') || '3000';
  const nodeEnv = await question('🔧 Environment (development/production, default: production): ') || 'production';

  // Authentication
  console.log('\n🔐 Authentication Configuration:');
  const adminUsername = await question('👤 Admin username (default: admin): ') || 'admin';
  let adminPassword = await question('🔑 Admin password (leave empty to generate): ');
  
  if (!adminPassword) {
    adminPassword = generateSecureKey(16);
    console.log(`🎲 Generated admin password: ${adminPassword}`);
  }

  // Security keys
  console.log('\n🔒 Security Configuration:');
  const jwtSecret = generateSecureKey(32);
  const sessionSecret = generateSecureKey(32);
  const encryptionKey = generateSecureKey(32);

  console.log('🔑 Generated security keys automatically');

  // Database configuration
  console.log('\n💾 Database Configuration:');
  const dbPath = await question('📁 Database file path (default: ./data/backup_service.db): ') || './data/backup_service.db';

  // Logging configuration
  console.log('\n📋 Logging Configuration:');
  const logLevel = await question('📊 Log level (error/warn/info/debug, default: info): ') || 'info';
  const logFile = await question('📄 Log file path (default: ./logs/backup_service.log): ') || './logs/backup_service.log';

  // Backup configuration
  console.log('\n💼 Backup Configuration:');
  const backupTempDir = await question('📂 Temporary backup directory (default: ./temp): ') || './temp';
  const logRetentionDays = await question('🗓️  Log retention days (default: 30): ') || '30';
  const maxConcurrentBackups = await question('⚡ Max concurrent backups (default: 3): ') || '3';

  // Rate limiting
  console.log('\n🛡️  Rate Limiting Configuration:');
  const rateLimitWindow = await question('⏱️  Rate limit window in ms (default: 900000 = 15 min): ') || '900000';
  const rateLimitMax = await question('🔢 Max requests per window (default: 100): ') || '100';

  // Create .env file content
  const envContent = `# Server Configuration
PORT=${port}
NODE_ENV=${nodeEnv}

# Authentication
ADMIN_USERNAME=${adminUsername}
ADMIN_PASSWORD=${adminPassword}
JWT_SECRET=${jwtSecret}
SESSION_SECRET=${sessionSecret}

# Database
DB_PATH=${dbPath}
ENCRYPTION_KEY=${encryptionKey}

# Logging
LOG_LEVEL=${logLevel}
LOG_FILE=${logFile}

# Security
RATE_LIMIT_WINDOW_MS=${rateLimitWindow}
RATE_LIMIT_MAX_REQUESTS=${rateLimitMax}

# Backup Configuration
BACKUP_TEMP_DIR=${backupTempDir}
BACKUP_LOG_RETENTION_DAYS=${logRetentionDays}
MAX_CONCURRENT_BACKUPS=${maxConcurrentBackups}

# Default Backup Settings
DEFAULT_BACKUP_RETENTION_DAYS=7
DEFAULT_MYSQL_TIMEOUT=300000
DEFAULT_MINIO_TIMEOUT=600000
DEFAULT_SMB_TIMEOUT=300000
`;

  // Write .env file
  fs.writeFileSync(envPath, envContent);
  console.log('\n✅ .env file created successfully!');

  // Create necessary directories
  const directories = [
    path.dirname(dbPath),
    path.dirname(logFile),
    backupTempDir
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });

  // Create a basic .gitignore if it doesn't exist
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    const gitignoreContent = `# Environment variables
.env

# Logs
logs/
*.log

# Database
data/
*.db
*.sqlite

# Temporary files
temp/
tmp/

# Node modules
node_modules/

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Backup files
*.bak
*.backup
`;
    fs.writeFileSync(gitignorePath, gitignoreContent);
    console.log('📝 Created .gitignore file');
  }

  console.log('\n🎉 Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Install dependencies: npm install');
  console.log('2. Start the service: npm start');
  console.log('3. Open your browser to: http://localhost:' + port);
  console.log('\n🔐 Login credentials:');
  console.log(`   Username: ${adminUsername}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n⚠️  Important: Save your admin password securely!');
  console.log('💡 You can change these settings later in the .env file');

  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Setup failed:', error.message);
  rl.close();
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Setup cancelled by user');
  rl.close();
  process.exit(0);
});

// Run setup
setup().catch((error) => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
