const SMB2 = require('smb2');
const fs = require('fs');
const path = require('path');
const { createMysqlDump } = require('./mysqlBackup');
const logger = require('../config/logger');

/**
 * Backup MySQL database to SMB network share
 * @param {BackupTask} task - Backup task configuration
 * @returns {object} - Backup result
 */
async function backupMysqlToSmb(task) {
  const sourceConfig = task.getSourceConfig();
  const destinationConfig = task.getDestinationConfig();
  const options = task.getOptions();

  logger.info('Starting MySQL to SMB backup', {
    taskId: task.id,
    sourceHost: sourceConfig.host,
    destinationHost: destinationConfig.host,
    share: destinationConfig.share
  });

  const tempDir = process.env.BACKUP_TEMP_DIR || './temp';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dumpFileName = `${sourceConfig.database || 'all-databases'}_${timestamp}.sql`;
  const localDumpPath = path.join(tempDir, dumpFileName);
  
  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  let smbClient;
  
  try {
    // Create MySQL dump
    logger.info('Creating MySQL dump', {
      taskId: task.id,
      database: sourceConfig.database,
      outputPath: localDumpPath
    });

    await createMysqlDump(sourceConfig, localDumpPath);

    // Get dump file size
    const dumpStats = fs.statSync(localDumpPath);
    const dumpSize = dumpStats.size;

    logger.info('MySQL dump created', {
      taskId: task.id,
      size: formatBytes(dumpSize),
      path: localDumpPath
    });

    // Create SMB connection
    smbClient = new SMB2({
      share: `\\\\${destinationConfig.host}\\${destinationConfig.share}`,
      domain: destinationConfig.domain || '',
      username: destinationConfig.username,
      password: destinationConfig.password,
      port: destinationConfig.port || 445,
      timeout: destinationConfig.timeout || 30000
    });

    // Test SMB connection
    await testSmbConnection(smbClient);

    // Determine remote path
    const remotePath = path.posix.join(destinationConfig.path || '/', dumpFileName);

    // Create directory structure if needed
    const remoteDir = path.posix.dirname(remotePath);
    if (remoteDir !== '/' && remoteDir !== '.') {
      await createSmbDirectory(smbClient, remoteDir);
    }

    // Upload dump file to SMB share
    logger.info('Uploading dump to SMB share', {
      taskId: task.id,
      remotePath,
      size: formatBytes(dumpSize)
    });

    await uploadFileToSmb(smbClient, localDumpPath, remotePath);

    // Verify upload
    const remoteStats = await getSmbFileStats(smbClient, remotePath);
    if (remoteStats.size !== dumpSize) {
      throw new Error(`Upload verification failed: local size ${dumpSize}, remote size ${remoteStats.size}`);
    }

    logger.info('File uploaded successfully', {
      taskId: task.id,
      remotePath,
      size: formatBytes(remoteStats.size)
    });

    // Compress the dump if option is set
    if (options.compress) {
      const compressedPath = await compressDumpFile(localDumpPath, options.compressionLevel);
      const compressedStats = fs.statSync(compressedPath);
      
      // Upload compressed file
      const remoteCompressedPath = remotePath + '.gz';
      await uploadFileToSmb(smbClient, compressedPath, remoteCompressedPath);
      
      // Remove uncompressed remote file
      await deleteSmbFile(smbClient, remotePath);
      
      logger.info('Compressed backup uploaded', {
        taskId: task.id,
        originalSize: formatBytes(dumpSize),
        compressedSize: formatBytes(compressedStats.size),
        compressionRatio: ((1 - compressedStats.size / dumpSize) * 100).toFixed(1) + '%'
      });
    }

    // Clean up old backups if retention is set
    if (options.retentionDays) {
      await cleanupOldBackups(smbClient, destinationConfig.path || '/', options.retentionDays, sourceConfig.database);
    }

    return {
      message: `Successfully backed up database to SMB share (${formatBytes(dumpSize)})`,
      filesTransferred: 1,
      bytesTransferred: dumpSize
    };

  } catch (error) {
    logger.error('MySQL to SMB backup failed', {
      taskId: task.id,
      error: error.message
    });
    throw error;
  } finally {
    // Clean up local dump file
    try {
      if (fs.existsSync(localDumpPath)) {
        fs.unlinkSync(localDumpPath);
      }
    } catch (error) {
      logger.warn('Failed to clean up local dump file', {
        taskId: task.id,
        path: localDumpPath,
        error: error.message
      });
    }

    // Close SMB connection
    if (smbClient) {
      try {
        smbClient.close();
      } catch (error) {
        logger.warn('Error closing SMB connection', { error: error.message });
      }
    }
  }
}

/**
 * Test SMB connection
 * @param {SMB2} smbClient - SMB client
 * @returns {Promise<boolean>} - True if connection successful
 */
function testSmbConnection(smbClient) {
  return new Promise((resolve, reject) => {
    smbClient.readdir('/', (err, files) => {
      if (err) {
        reject(new Error(`SMB connection failed: ${err.message}`));
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Upload file to SMB share
 * @param {SMB2} smbClient - SMB client
 * @param {string} localPath - Local file path
 * @param {string} remotePath - Remote file path
 * @returns {Promise<void>}
 */
function uploadFileToSmb(smbClient, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(localPath);
    const writeStream = smbClient.createWriteStream(remotePath);

    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    
    readStream.on('error', reject);
    readStream.pipe(writeStream);
  });
}

/**
 * Get SMB file statistics
 * @param {SMB2} smbClient - SMB client
 * @param {string} remotePath - Remote file path
 * @returns {Promise<object>} - File statistics
 */
function getSmbFileStats(smbClient, remotePath) {
  return new Promise((resolve, reject) => {
    smbClient.stat(remotePath, (err, stats) => {
      if (err) {
        reject(err);
      } else {
        resolve(stats);
      }
    });
  });
}

/**
 * Create directory on SMB share
 * @param {SMB2} smbClient - SMB client
 * @param {string} remotePath - Remote directory path
 * @returns {Promise<void>}
 */
function createSmbDirectory(smbClient, remotePath) {
  return new Promise((resolve, reject) => {
    // Split path and create directories recursively
    const parts = remotePath.split('/').filter(part => part);
    let currentPath = '';

    const createNext = (index) => {
      if (index >= parts.length) {
        resolve();
        return;
      }

      currentPath += '/' + parts[index];
      
      smbClient.mkdir(currentPath, (err) => {
        // Ignore error if directory already exists
        if (err && err.code !== 'EEXIST') {
          reject(err);
        } else {
          createNext(index + 1);
        }
      });
    };

    createNext(0);
  });
}

/**
 * Delete file from SMB share
 * @param {SMB2} smbClient - SMB client
 * @param {string} remotePath - Remote file path
 * @returns {Promise<void>}
 */
function deleteSmbFile(smbClient, remotePath) {
  return new Promise((resolve, reject) => {
    smbClient.unlink(remotePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Compress dump file using gzip
 * @param {string} filePath - File path to compress
 * @param {number} level - Compression level (1-9)
 * @returns {Promise<string>} - Compressed file path
 */
function compressDumpFile(filePath, level = 6) {
  return new Promise((resolve, reject) => {
    const zlib = require('zlib');
    const compressedPath = filePath + '.gz';
    
    const readStream = fs.createReadStream(filePath);
    const writeStream = fs.createWriteStream(compressedPath);
    const gzip = zlib.createGzip({ level });

    writeStream.on('error', reject);
    writeStream.on('finish', () => resolve(compressedPath));
    
    readStream.on('error', reject);
    readStream.pipe(gzip).pipe(writeStream);
  });
}

/**
 * Clean up old backup files
 * @param {SMB2} smbClient - SMB client
 * @param {string} remotePath - Remote directory path
 * @param {number} retentionDays - Number of days to retain backups
 * @param {string} databaseName - Database name for filtering
 * @returns {Promise<void>}
 */
function cleanupOldBackups(smbClient, remotePath, retentionDays, databaseName) {
  return new Promise((resolve, reject) => {
    smbClient.readdir(remotePath, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const deletePromises = files
        .filter(file => {
          // Filter backup files for this database
          const fileName = file.name;
          return fileName.startsWith(databaseName) && 
                 (fileName.endsWith('.sql') || fileName.endsWith('.sql.gz'));
        })
        .filter(file => {
          // Filter by modification date
          return new Date(file.mtime) < cutoffDate;
        })
        .map(file => {
          const filePath = path.posix.join(remotePath, file.name);
          return deleteSmbFile(smbClient, filePath);
        });

      Promise.all(deletePromises)
        .then(() => resolve())
        .catch(reject);
    });
  });
}

/**
 * Format bytes to human readable format
 * @param {number} bytes - Bytes
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  backupMysqlToSmb,
  testSmbConnection,
  uploadFileToSmb,
  getSmbFileStats,
  createSmbDirectory,
  deleteSmbFile,
  formatBytes
};
