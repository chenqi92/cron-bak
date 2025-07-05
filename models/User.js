const { runQuery, getQuery, allQuery } = require('../config/database');
const { hashPassword, verifyPassword } = require('../config/encryption');
const logger = require('../config/logger');

class User {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.created_at = data.created_at;
    this.last_login = data.last_login;
    this.is_active = data.is_active;
  }

  /**
   * Create a new user
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<User>} - Created user
   */
  static async create(username, password) {
    try {
      // Check if username already exists
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        throw new Error('Username already exists');
      }

      const passwordHash = hashPassword(password);

      const result = await runQuery(
        'INSERT INTO users (username, password_hash) VALUES (?, ?)',
        [username, passwordHash]
      );

      logger.info('User created', { username, userId: result.id });

      return await User.findById(result.id);
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Register a new user with validation
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @param {string} confirmPassword - Password confirmation
   * @returns {Promise<User>} - Created user
   */
  static async register(username, password, confirmPassword) {
    try {
      // Validate input
      if (!username || !password || !confirmPassword) {
        throw new Error('All fields are required');
      }

      if (username.length < 3 || username.length > 30) {
        throw new Error('Username must be between 3 and 30 characters');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Check username format (alphanumeric and underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      return await User.create(username, password);
    } catch (error) {
      logger.error('Error registering user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<User|null>} - User or null if not found
   */
  static async findById(id) {
    try {
      const row = await getQuery('SELECT * FROM users WHERE id = ?', [id]);
      return row ? new User(row) : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<User|null>} - User or null if not found
   */
  static async findByUsername(username) {
    try {
      const row = await getQuery('SELECT * FROM users WHERE username = ?', [username]);
      return row ? new User(row) : null;
    } catch (error) {
      logger.error('Error finding user by username:', error);
      throw error;
    }
  }

  /**
   * Get all users
   * @returns {Promise<User[]>} - Array of users
   */
  static async findAll() {
    try {
      const rows = await allQuery('SELECT * FROM users ORDER BY created_at DESC');
      return rows.map(row => new User(row));
    } catch (error) {
      logger.error('Error finding all users:', error);
      throw error;
    }
  }

  /**
   * Authenticate user
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<User|null>} - User if authenticated, null otherwise
   */
  static async authenticate(username, password) {
    try {
      const user = await User.findByUsername(username);
      
      if (!user || !user.is_active) {
        return null;
      }

      const isValid = verifyPassword(password, user.password_hash);
      
      if (isValid) {
        // Update last login
        await user.updateLastLogin();
        logger.authEvent('login_success', username);
        return user;
      } else {
        logger.authEvent('login_failed', username);
        return null;
      }
    } catch (error) {
      logger.error('Error authenticating user:', error);
      throw error;
    }
  }

  /**
   * Update user's last login timestamp
   * @returns {Promise<void>}
   */
  async updateLastLogin() {
    try {
      await runQuery(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
        [this.id]
      );
      this.last_login = new Date().toISOString();
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  /**
   * Update user password
   * @param {string} newPassword - New plain text password
   * @returns {Promise<void>}
   */
  async updatePassword(newPassword) {
    try {
      const passwordHash = hashPassword(newPassword);
      
      await runQuery(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [passwordHash, this.id]
      );
      
      this.password_hash = passwordHash;
      logger.info('User password updated', { userId: this.id, username: this.username });
    } catch (error) {
      logger.error('Error updating user password:', error);
      throw error;
    }
  }

  /**
   * Deactivate user
   * @returns {Promise<void>}
   */
  async deactivate() {
    try {
      await runQuery(
        'UPDATE users SET is_active = 0 WHERE id = ?',
        [this.id]
      );
      
      this.is_active = false;
      logger.info('User deactivated', { userId: this.id, username: this.username });
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    }
  }

  /**
   * Activate user
   * @returns {Promise<void>}
   */
  async activate() {
    try {
      await runQuery(
        'UPDATE users SET is_active = 1 WHERE id = ?',
        [this.id]
      );
      
      this.is_active = true;
      logger.info('User activated', { userId: this.id, username: this.username });
    } catch (error) {
      logger.error('Error activating user:', error);
      throw error;
    }
  }

  /**
   * Delete user
   * @returns {Promise<void>}
   */
  async delete() {
    try {
      await runQuery('DELETE FROM users WHERE id = ?', [this.id]);
      logger.info('User deleted', { userId: this.id, username: this.username });
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Convert to JSON (excluding sensitive data)
   * @returns {object} - User data without password hash
   */
  toJSON() {
    return {
      id: this.id,
      username: this.username,
      created_at: this.created_at,
      last_login: this.last_login,
      is_active: this.is_active
    };
  }
}

module.exports = User;
