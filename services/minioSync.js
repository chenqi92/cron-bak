const Minio = require('minio');
const logger = require('../config/logger');

/**
 * Synchronize MinIO bucket to another MinIO bucket
 * @param {BackupTask} task - Backup task configuration
 * @returns {object} - Backup result
 */
async function syncMinioToMinio(task) {
  const sourceConfig = task.getSourceConfig();
  const destinationConfig = task.getDestinationConfig();
  const options = task.getOptions();

  logger.info('Starting MinIO to MinIO sync', {
    taskId: task.id,
    sourceBucket: sourceConfig.bucket,
    destinationBucket: destinationConfig.bucket
  });

  let sourceClient, destinationClient;
  
  try {
    // Create MinIO clients
    sourceClient = new Minio.Client({
      endPoint: sourceConfig.endPoint,
      port: sourceConfig.port || 9000,
      useSSL: sourceConfig.useSSL || false,
      accessKey: sourceConfig.accessKey,
      secretKey: sourceConfig.secretKey,
      region: sourceConfig.region || 'us-east-1'
    });

    destinationClient = new Minio.Client({
      endPoint: destinationConfig.endPoint,
      port: destinationConfig.port || 9000,
      useSSL: destinationConfig.useSSL || false,
      accessKey: destinationConfig.accessKey,
      secretKey: destinationConfig.secretKey,
      region: destinationConfig.region || 'us-east-1'
    });

    // Test connections
    await testMinioConnection(sourceClient, sourceConfig.bucket);
    await testMinioConnection(destinationClient, destinationConfig.bucket);

    logger.info('MinIO connections established', { taskId: task.id });

    // Ensure destination bucket exists
    const destBucketExists = await destinationClient.bucketExists(destinationConfig.bucket);
    if (!destBucketExists) {
      await destinationClient.makeBucket(destinationConfig.bucket, destinationConfig.region || 'us-east-1');
      logger.info('Created destination bucket', {
        taskId: task.id,
        bucket: destinationConfig.bucket
      });
    }

    // Get list of objects from source bucket
    const sourceObjects = [];
    const objectStream = sourceClient.listObjectsV2(sourceConfig.bucket, options.prefix || '', true);

    for await (const obj of objectStream) {
      sourceObjects.push(obj);
    }

    logger.info('Found objects to sync', {
      taskId: task.id,
      objectCount: sourceObjects.length
    });

    let syncedFiles = 0;
    let syncedBytes = 0;
    let skippedFiles = 0;

    // Sync each object
    for (const sourceObj of sourceObjects) {
      try {
        const objectName = sourceObj.name;
        
        // Check if object exists in destination
        let shouldSync = true;
        
        if (!options.forceOverwrite) {
          try {
            const destStat = await destinationClient.statObject(destinationConfig.bucket, objectName);
            
            // Compare modification times and sizes
            if (destStat.lastModified >= sourceObj.lastModified && destStat.size === sourceObj.size) {
              shouldSync = false;
              skippedFiles++;
              
              if (options.verbose) {
                logger.info('Skipping unchanged object', {
                  taskId: task.id,
                  objectName
                });
              }
            }
          } catch (error) {
            // Object doesn't exist in destination, should sync
            shouldSync = true;
          }
        }

        if (shouldSync) {
          // Copy object using MinIO's native copy operation
          const copyConditions = new Minio.CopyConditions();
          
          await destinationClient.copyObject(
            destinationConfig.bucket,
            objectName,
            `/${sourceConfig.bucket}/${objectName}`,
            copyConditions
          );

          syncedFiles++;
          syncedBytes += sourceObj.size;

          if (options.verbose || syncedFiles % 100 === 0) {
            logger.info('Object synced', {
              taskId: task.id,
              objectName,
              size: sourceObj.size,
              progress: `${syncedFiles}/${sourceObjects.length}`
            });
          }
        }

        // Add delay between operations if specified
        if (options.delayMs) {
          await new Promise(resolve => setTimeout(resolve, options.delayMs));
        }

      } catch (error) {
        logger.error('Error syncing object', {
          taskId: task.id,
          objectName: sourceObj.name,
          error: error.message
        });
        
        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    // Clean up destination objects that don't exist in source (if option is set)
    if (options.deleteExtraFiles) {
      const destObjects = [];
      const destObjectStream = destinationClient.listObjectsV2(destinationConfig.bucket, options.prefix || '', true);

      for await (const obj of destObjectStream) {
        destObjects.push(obj.name);
      }

      const sourceObjectNames = new Set(sourceObjects.map(obj => obj.name));
      const objectsToDelete = destObjects.filter(name => !sourceObjectNames.has(name));

      for (const objectName of objectsToDelete) {
        try {
          await destinationClient.removeObject(destinationConfig.bucket, objectName);
          logger.info('Deleted extra object', {
            taskId: task.id,
            objectName
          });
        } catch (error) {
          logger.error('Error deleting extra object', {
            taskId: task.id,
            objectName,
            error: error.message
          });
        }
      }
    }

    return {
      message: `Successfully synced ${syncedFiles} files (${formatBytes(syncedBytes)}), skipped ${skippedFiles} unchanged files`,
      filesTransferred: syncedFiles,
      bytesTransferred: syncedBytes
    };

  } catch (error) {
    logger.error('MinIO sync failed', {
      taskId: task.id,
      error: error.message
    });
    throw error;
  }
}

/**
 * Test MinIO connection and bucket access
 * @param {Minio.Client} client - MinIO client
 * @param {string} bucket - Bucket name
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testMinioConnection(client, bucket) {
  try {
    // Test bucket access
    const bucketExists = await client.bucketExists(bucket);
    
    if (!bucketExists) {
      throw new Error(`Bucket '${bucket}' does not exist`);
    }

    // Try to list objects (limited) to test permissions
    const objectStream = client.listObjectsV2(bucket, '', false, 1);
    for await (const obj of objectStream) {
      // Just testing access, break after first object
      break;
    }

    return true;
  } catch (error) {
    logger.error('MinIO connection test failed', {
      bucket,
      error: error.message
    });
    throw error;
  }
}

/**
 * Get bucket statistics
 * @param {Minio.Client} client - MinIO client
 * @param {string} bucket - Bucket name
 * @param {string} prefix - Object prefix filter
 * @returns {object} - Bucket statistics
 */
async function getBucketStats(client, bucket, prefix = '') {
  try {
    let objectCount = 0;
    let totalSize = 0;
    
    const objectStream = client.listObjectsV2(bucket, prefix, true);
    
    for await (const obj of objectStream) {
      objectCount++;
      totalSize += obj.size;
    }

    return {
      objectCount,
      totalSize,
      formattedSize: formatBytes(totalSize)
    };
  } catch (error) {
    logger.error('Error getting bucket stats', {
      bucket,
      error: error.message
    });
    throw error;
  }
}

/**
 * Create a presigned URL for object access
 * @param {Minio.Client} client - MinIO client
 * @param {string} bucket - Bucket name
 * @param {string} objectName - Object name
 * @param {number} expiry - URL expiry in seconds
 * @returns {string} - Presigned URL
 */
async function createPresignedUrl(client, bucket, objectName, expiry = 3600) {
  try {
    return await client.presignedGetObject(bucket, objectName, expiry);
  } catch (error) {
    logger.error('Error creating presigned URL', {
      bucket,
      objectName,
      error: error.message
    });
    throw error;
  }
}

/**
 * Upload a file to MinIO bucket
 * @param {Minio.Client} client - MinIO client
 * @param {string} bucket - Bucket name
 * @param {string} objectName - Object name
 * @param {string} filePath - Local file path
 * @param {object} metadata - Object metadata
 * @returns {object} - Upload result
 */
async function uploadFile(client, bucket, objectName, filePath, metadata = {}) {
  try {
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    
    await client.fPutObject(bucket, objectName, filePath, metadata);
    
    return {
      objectName,
      size: stats.size,
      uploaded: true
    };
  } catch (error) {
    logger.error('Error uploading file', {
      bucket,
      objectName,
      filePath,
      error: error.message
    });
    throw error;
  }
}

/**
 * Download a file from MinIO bucket
 * @param {Minio.Client} client - MinIO client
 * @param {string} bucket - Bucket name
 * @param {string} objectName - Object name
 * @param {string} filePath - Local file path
 * @returns {object} - Download result
 */
async function downloadFile(client, bucket, objectName, filePath) {
  try {
    await client.fGetObject(bucket, objectName, filePath);
    
    const fs = require('fs');
    const stats = fs.statSync(filePath);
    
    return {
      objectName,
      filePath,
      size: stats.size,
      downloaded: true
    };
  } catch (error) {
    logger.error('Error downloading file', {
      bucket,
      objectName,
      filePath,
      error: error.message
    });
    throw error;
  }
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
  syncMinioToMinio,
  testMinioConnection,
  getBucketStats,
  createPresignedUrl,
  uploadFile,
  downloadFile,
  formatBytes
};
