const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-character-key-change-me';
const ALGORITHM = 'aes-256-gcm';

if (ENCRYPTION_KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
}

/**
 * Encrypt sensitive data
 * @param {string} text - Text to encrypt
 * @returns {string} - Encrypted data with IV and auth tag
 */
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
    cipher.setAAD(Buffer.from('backup-service', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, auth tag, and encrypted data
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return result;
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedData - Encrypted data with IV and auth tag
 * @returns {string} - Decrypted text
 */
function decrypt(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
    decipher.setAAD(Buffer.from('backup-service', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

/**
 * Encrypt credentials object
 * @param {object} credentials - Credentials object to encrypt
 * @returns {string} - Encrypted JSON string
 */
function encryptCredentials(credentials) {
  const jsonString = JSON.stringify(credentials);
  return encrypt(jsonString);
}

/**
 * Decrypt credentials object
 * @param {string} encryptedCredentials - Encrypted credentials string
 * @returns {object} - Decrypted credentials object
 */
function decryptCredentials(encryptedCredentials) {
  const jsonString = decrypt(encryptedCredentials);
  return JSON.parse(jsonString);
}

/**
 * Generate a secure random key
 * @param {number} length - Key length in bytes
 * @returns {string} - Random key in hex format
 */
function generateKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using bcrypt-compatible method
 * @param {string} password - Password to hash
 * @returns {string} - Hashed password
 */
function hashPassword(password) {
  const bcrypt = require('bcrypt');
  return bcrypt.hashSync(password, 12);
}

/**
 * Verify a password against a hash
 * @param {string} password - Password to verify
 * @param {string} hash - Hash to verify against
 * @returns {boolean} - True if password matches
 */
function verifyPassword(password, hash) {
  const bcrypt = require('bcrypt');
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate a JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
function generateToken(payload, expiresIn = '24h') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(payload, process.env.JWT_SECRET || 'default-jwt-secret', { expiresIn });
}

/**
 * Verify a JWT token
 * @param {string} token - Token to verify
 * @returns {object} - Decoded token payload
 */
function verifyToken(token) {
  const jwt = require('jsonwebtoken');
  return jwt.verify(token, process.env.JWT_SECRET || 'default-jwt-secret');
}

module.exports = {
  encrypt,
  decrypt,
  encryptCredentials,
  decryptCredentials,
  generateKey,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken
};
