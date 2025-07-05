const mysql = require('mysql2/promise');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Synchronize MySQL database to another MySQL database using native replication
 * @param {BackupTask} task - Backup task configuration
 * @returns {object} - Backup result
 */
async function syncMysqlToMysql(task) {
  const sourceConfig = task.getSourceConfig();
  const destinationConfig = task.getDestinationConfig();
  const options = task.getOptions();

  logger.info('Starting MySQL to MySQL sync', {
    taskId: task.id,
    sourceHost: sourceConfig.host,
    destinationHost: destinationConfig.host
  });

  let sourceConnection, destinationConnection;
  
  try {
    // Create connections
    sourceConnection = await mysql.createConnection({
      host: sourceConfig.host,
      port: sourceConfig.port || 3306,
      user: sourceConfig.username,
      password: sourceConfig.password,
      database: sourceConfig.database,
      ssl: sourceConfig.ssl || {},
      connectTimeout: sourceConfig.timeout || 60000,
      acquireTimeout: sourceConfig.timeout || 60000
    });

    destinationConnection = await mysql.createConnection({
      host: destinationConfig.host,
      port: destinationConfig.port || 3306,
      user: destinationConfig.username,
      password: destinationConfig.password,
      database: destinationConfig.database,
      ssl: destinationConfig.ssl || {},
      connectTimeout: destinationConfig.timeout || 60000,
      acquireTimeout: destinationConfig.timeout || 60000
    });

    // Test connections
    await sourceConnection.ping();
    await destinationConnection.ping();

    logger.info('MySQL connections established', { taskId: task.id });

    // Get list of tables to sync
    const [tables] = await sourceConnection.execute(
      'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = "BASE TABLE"',
      [sourceConfig.database]
    );

    let totalRows = 0;
    let totalTables = tables.length;

    // Sync each table
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      
      try {
        logger.info('Syncing table', { taskId: task.id, tableName });

        // Get table structure
        const [createTableResult] = await sourceConnection.execute(`SHOW CREATE TABLE \`${tableName}\``);
        const createTableSQL = createTableResult[0]['Create Table'];

        // Drop and recreate table in destination (if option is set)
        if (options.dropTables) {
          await destinationConnection.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
        }

        // Create table in destination
        await destinationConnection.execute(createTableSQL);

        // Clear existing data if option is set
        if (options.truncateTables) {
          await destinationConnection.execute(`TRUNCATE TABLE \`${tableName}\``);
        }

        // Get row count
        const [countResult] = await sourceConnection.execute(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const rowCount = countResult[0].count;

        if (rowCount > 0) {
          // Use batch processing for large tables
          const batchSize = options.batchSize || 1000;
          let offset = 0;

          while (offset < rowCount) {
            const [rows] = await sourceConnection.execute(
              `SELECT * FROM \`${tableName}\` LIMIT ${batchSize} OFFSET ${offset}`
            );

            if (rows.length > 0) {
              // Build INSERT statement
              const columns = Object.keys(rows[0]);
              const placeholders = columns.map(() => '?').join(', ');
              const insertSQL = `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES (${placeholders})`;

              // Insert rows in batch
              for (const row of rows) {
                const values = columns.map(col => row[col]);
                await destinationConnection.execute(insertSQL, values);
              }
            }

            offset += batchSize;
            totalRows += rows.length;

            // Log progress for large tables
            if (rowCount > 10000) {
              logger.info('Table sync progress', {
                taskId: task.id,
                tableName,
                progress: `${offset}/${rowCount}`,
                percentage: Math.round((offset / rowCount) * 100)
              });
            }
          }
        }

        logger.info('Table synced successfully', {
          taskId: task.id,
          tableName,
          rowCount
        });

      } catch (error) {
        logger.error('Error syncing table', {
          taskId: task.id,
          tableName,
          error: error.message
        });
        
        if (!options.continueOnError) {
          throw error;
        }
      }
    }

    return {
      message: `Successfully synced ${totalTables} tables with ${totalRows} total rows`,
      filesTransferred: totalTables,
      bytesTransferred: totalRows * 100 // Rough estimate
    };

  } catch (error) {
    logger.error('MySQL sync failed', {
      taskId: task.id,
      error: error.message
    });
    throw error;
  } finally {
    // Close connections
    if (sourceConnection) {
      await sourceConnection.end();
    }
    if (destinationConnection) {
      await destinationConnection.end();
    }
  }
}

/**
 * Create MySQL dump using mysqldump
 * @param {object} config - MySQL configuration
 * @param {string} outputPath - Output file path
 * @returns {Promise} - Promise that resolves when dump is complete
 */
function createMysqlDump(config, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', config.host,
      '-P', config.port || 3306,
      '-u', config.username,
      `-p${config.password}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--events',
      '--result-file', outputPath
    ];

    // Add database name
    if (config.database) {
      args.push(config.database);
    } else {
      args.push('--all-databases');
    }

    // Add SSL options if configured
    if (config.ssl && config.ssl.ca) {
      args.push('--ssl-ca', config.ssl.ca);
    }

    const mysqldump = spawn('mysqldump', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    mysqldump.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mysqldump.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mysqldump failed with code ${code}: ${stderr}`));
      }
    });

    mysqldump.on('error', (error) => {
      reject(new Error(`Failed to start mysqldump: ${error.message}`));
    });
  });
}

/**
 * Restore MySQL dump using mysql client
 * @param {object} config - MySQL configuration
 * @param {string} dumpPath - Dump file path
 * @returns {Promise} - Promise that resolves when restore is complete
 */
function restoreMysqlDump(config, dumpPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-h', config.host,
      '-P', config.port || 3306,
      '-u', config.username,
      `-p${config.password}`
    ];

    // Add database name if specified
    if (config.database) {
      args.push(config.database);
    }

    const mysql = spawn('mysql', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    mysql.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    mysql.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mysql restore failed with code ${code}: ${stderr}`));
      }
    });

    mysql.on('error', (error) => {
      reject(new Error(`Failed to start mysql: ${error.message}`));
    });

    // Pipe dump file to mysql
    const dumpStream = fs.createReadStream(dumpPath);
    dumpStream.pipe(mysql.stdin);
  });
}

/**
 * Get MySQL database size
 * @param {object} connection - MySQL connection
 * @param {string} database - Database name
 * @returns {number} - Database size in bytes
 */
async function getDatabaseSize(connection, database) {
  try {
    const [result] = await connection.execute(`
      SELECT 
        SUM(data_length + index_length) as size_bytes
      FROM information_schema.tables 
      WHERE table_schema = ?
    `, [database]);

    return result[0].size_bytes || 0;
  } catch (error) {
    logger.warn('Could not get database size', { error: error.message });
    return 0;
  }
}

/**
 * Test MySQL connection
 * @param {object} config - MySQL configuration
 * @returns {Promise<boolean>} - True if connection successful
 */
async function testConnection(config) {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      ssl: config.ssl || {},
      connectTimeout: 10000
    });

    await connection.ping();
    return true;
  } catch (error) {
    logger.error('MySQL connection test failed', {
      host: config.host,
      error: error.message
    });
    return false;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

module.exports = {
  syncMysqlToMysql,
  createMysqlDump,
  restoreMysqlDump,
  getDatabaseSize,
  testConnection
};
