const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { Client } = require('minio');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// 加密密钥（在生产环境中应该从环境变量获取）
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here!!';

// 加密函数
function encrypt(text) {
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 解密函数
function decrypt(text) {
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(text, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// 存储库配置文件路径
const STORAGES_FILE = path.join(__dirname, '../data/storages.json');

// 确保数据目录存在
async function ensureDataDir() {
  const dataDir = path.dirname(STORAGES_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// 读取存储库配置
async function loadStorages() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(STORAGES_FILE, 'utf8');
    const storages = JSON.parse(data);
    
    // 解密敏感信息
    return storages.map(storage => {
      const decrypted = { ...storage };
      if (storage.password) {
        decrypted.password = decrypt(storage.password);
      }
      if (storage.secretKey) {
        decrypted.secretKey = decrypt(storage.secretKey);
      }
      return decrypted;
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// 保存存储库配置
async function saveStorages(storages) {
  await ensureDataDir();
  
  // 加密敏感信息
  const encrypted = storages.map(storage => {
    const toSave = { ...storage };
    if (storage.password) {
      toSave.password = encrypt(storage.password);
    }
    if (storage.secretKey) {
      toSave.secretKey = encrypt(storage.secretKey);
    }
    return toSave;
  });
  
  await fs.writeFile(STORAGES_FILE, JSON.stringify(encrypted, null, 2));
}

// 获取所有存储库
router.get('/', async (req, res) => {
  try {
    const storages = await loadStorages();
    
    // 返回时隐藏敏感信息
    const safeStorages = storages.map(storage => ({
      ...storage,
      password: storage.password ? '***' : undefined,
      secretKey: storage.secretKey ? '***' : undefined
    }));
    
    res.json({
      success: true,
      data: safeStorages
    });
  } catch (error) {
    console.error('Error loading storages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load storages'
    });
  }
});

// 创建存储库
router.post('/', async (req, res) => {
  try {
    const { name, type, config } = req.body;
    
    if (!name || !type || !config) {
      return res.status(400).json({
        success: false,
        error: 'Name, type, and config are required'
      });
    }
    
    const storages = await loadStorages();
    
    // 检查名称是否已存在
    if (storages.find(s => s.name === name)) {
      return res.status(400).json({
        success: false,
        error: 'Storage name already exists'
      });
    }
    
    const newStorage = {
      id: Date.now().toString(),
      name,
      type,
      config,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    storages.push(newStorage);
    await saveStorages(storages);
    
    // 返回时隐藏敏感信息
    const safeStorage = {
      ...newStorage,
      config: {
        ...newStorage.config,
        password: newStorage.config.password ? '***' : undefined,
        secretKey: newStorage.config.secretKey ? '***' : undefined
      }
    };
    
    res.json({
      success: true,
      data: safeStorage
    });
  } catch (error) {
    console.error('Error creating storage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create storage'
    });
  }
});

// 更新存储库
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, config } = req.body;
    
    const storages = await loadStorages();
    const index = storages.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Storage not found'
      });
    }
    
    // 检查名称冲突（排除自己）
    if (name && storages.find(s => s.name === name && s.id !== id)) {
      return res.status(400).json({
        success: false,
        error: 'Storage name already exists'
      });
    }
    
    storages[index] = {
      ...storages[index],
      name: name || storages[index].name,
      type: type || storages[index].type,
      config: config || storages[index].config,
      updatedAt: new Date().toISOString()
    };
    
    await saveStorages(storages);
    
    // 返回时隐藏敏感信息
    const safeStorage = {
      ...storages[index],
      config: {
        ...storages[index].config,
        password: storages[index].config.password ? '***' : undefined,
        secretKey: storages[index].config.secretKey ? '***' : undefined
      }
    };
    
    res.json({
      success: true,
      data: safeStorage
    });
  } catch (error) {
    console.error('Error updating storage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update storage'
    });
  }
});

// 删除存储库
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const storages = await loadStorages();
    const index = storages.findIndex(s => s.id === id);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: 'Storage not found'
      });
    }
    
    storages.splice(index, 1);
    await saveStorages(storages);
    
    res.json({
      success: true,
      message: 'Storage deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting storage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete storage'
    });
  }
});

// 测试MySQL连接
async function testMySQLConnection(config) {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.host,
      port: config.port || 3306,
      user: config.username,
      password: config.password,
      database: config.database,
      connectTimeout: 5000
    });

    await connection.execute('SELECT 1');
    return { success: true, message: 'MySQL connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 测试MinIO/S3连接
async function testMinIOConnection(config) {
  try {
    const minioClient = new Client({
      endPoint: config.endpoint,
      port: config.port || (config.useSSL ? 443 : 9000),
      useSSL: config.useSSL || false,
      accessKey: config.accessKey,
      secretKey: config.secretKey
    });

    // 尝试列出存储桶
    await minioClient.listBuckets();
    return { success: true, message: 'MinIO/S3 connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 测试SMB连接
async function testSMBConnection(config) {
  try {
    // 这里需要使用SMB客户端库，暂时返回模拟结果
    // 在实际实现中，您需要安装并使用如 'node-smb2' 等库

    // 基本验证
    if (!config.host || !config.username || !config.password) {
      return { success: false, error: 'Missing required SMB configuration' };
    }

    // 模拟连接测试（实际实现时替换为真实的SMB连接测试）
    return { success: true, message: 'SMB connection test not implemented yet' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 测试存储库连接
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;

    const storages = await loadStorages();
    const storage = storages.find(s => s.id === id);

    if (!storage) {
      return res.status(404).json({
        success: false,
        error: 'Storage not found'
      });
    }

    let result;

    switch (storage.type) {
      case 'mysql':
        result = await testMySQLConnection(storage.config);
        break;
      case 'minio':
      case 's3':
        result = await testMinIOConnection(storage.config);
        break;
      case 'smb':
        result = await testSMBConnection(storage.config);
        break;
      default:
        result = { success: false, error: 'Unsupported storage type' };
    }

    res.json({
      success: true,
      data: {
        storageId: id,
        storageName: storage.name,
        storageType: storage.type,
        testResult: result,
        testedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error testing storage connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test storage connection'
    });
  }
});

// 批量测试所有存储库连接
router.post('/test-all', async (req, res) => {
  try {
    const storages = await loadStorages();
    const results = [];

    for (const storage of storages) {
      let result;

      switch (storage.type) {
        case 'mysql':
          result = await testMySQLConnection(storage.config);
          break;
        case 'minio':
        case 's3':
          result = await testMinIOConnection(storage.config);
          break;
        case 'smb':
          result = await testSMBConnection(storage.config);
          break;
        default:
          result = { success: false, error: 'Unsupported storage type' };
      }

      results.push({
        storageId: storage.id,
        storageName: storage.name,
        storageType: storage.type,
        testResult: result,
        testedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Error testing all storage connections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test storage connections'
    });
  }
});

module.exports = router;
