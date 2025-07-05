# Quick Start Guide

## 🎉 Congratulations! Your Backup Service is Running!

Your comprehensive backup management service is now successfully running at:
**http://localhost:3000**

## 🔐 Login Credentials

- **Username**: `admin`
- **Password**: `backup123!`

## 🚀 Getting Started

### 1. Access the Web Interface
Open your web browser and navigate to: http://localhost:3000

### 2. Login
Use the credentials above to log into the dashboard.

### 3. Create Your First Backup Task

The service supports three types of backup tasks:

#### MySQL-to-MySQL Synchronization
- Synchronizes data between two MySQL databases
- Uses native MySQL replication features
- Ideal for database mirroring and failover scenarios

#### MySQL-to-SMB Backup
- Creates MySQL dumps and stores them on SMB network shares
- Supports compression and retention policies
- Perfect for regular database backups to network storage

#### MinIO-to-MinIO Synchronization
- Synchronizes objects between MinIO instances
- Maintains identical directory structures
- Great for object storage replication

### 4. Configure Backup Schedules
- Use standard cron expressions for scheduling
- Examples:
  - `0 2 * * *` - Daily at 2:00 AM
  - `0 0 * * 0` - Weekly on Sunday at midnight
  - `0 */6 * * *` - Every 6 hours

## 📊 Dashboard Features

### Overview
- Real-time statistics
- Running backup status
- Success rates and performance metrics
- Next scheduled runs

### Task Management
- Create, edit, and delete backup tasks
- Run tasks manually
- Enable/disable tasks
- View task-specific logs

### Monitoring
- Comprehensive backup logs
- System health monitoring
- Performance statistics
- Error tracking and alerts

## 🔧 Configuration

### Environment Variables
Edit the `.env` file to customize:
- Server port and environment
- Authentication credentials
- Database and logging paths
- Backup settings and limits

### Security Settings
- JWT and session secrets
- Rate limiting configuration
- Encryption keys for credential storage

## 📝 Example Backup Task Configurations

### MySQL Database Backup to SMB Share
```json
{
  "name": "Daily Database Backup",
  "type": "mysql_to_smb",
  "schedule": "0 2 * * *",
  "sourceConfig": {
    "host": "mysql.example.com",
    "port": 3306,
    "username": "backup_user",
    "password": "secure_password",
    "database": "production_db"
  },
  "destinationConfig": {
    "host": "nas.example.com",
    "username": "backup_user",
    "password": "smb_password",
    "share": "backups",
    "path": "/mysql-backups/"
  },
  "options": {
    "compress": true,
    "retentionDays": 30
  }
}
```

### MinIO Bucket Synchronization
```json
{
  "name": "Object Storage Sync",
  "type": "minio_to_minio",
  "schedule": "0 */4 * * *",
  "sourceConfig": {
    "endPoint": "source.minio.com",
    "port": 9000,
    "useSSL": true,
    "accessKey": "source_access_key",
    "secretKey": "source_secret_key",
    "bucket": "production-data"
  },
  "destinationConfig": {
    "endPoint": "backup.minio.com",
    "port": 9000,
    "useSSL": true,
    "accessKey": "backup_access_key",
    "secretKey": "backup_secret_key",
    "bucket": "backup-data"
  },
  "options": {
    "deleteExtraFiles": false,
    "continueOnError": true
  }
}
```

## 🛠️ Management Commands

### Start the Service
```bash
npm start
```

### Development Mode (with auto-restart)
```bash
npm run dev
```

### Run Setup Wizard
```bash
npm run setup
```

### View Logs
```bash
# Application logs
tail -f logs/backup_service.log

# Error logs
tail -f logs/error.log
```

## 🔍 Monitoring and Troubleshooting

### Health Check
Visit: http://localhost:3000/health

### API Status
Visit: http://localhost:3000/api/auth/status

### Common Issues

1. **Service won't start**
   - Check Node.js version (requires 16+)
   - Verify .env file configuration
   - Ensure port 3000 is available

2. **Database errors**
   - Check data directory permissions
   - Verify database file path in .env

3. **Backup tasks failing**
   - Verify source/destination credentials
   - Check network connectivity
   - Review backup logs for specific errors

## 📚 Next Steps

1. **Create your first backup task** using the web interface
2. **Set up monitoring** by checking the dashboard regularly
3. **Configure retention policies** to manage storage space
4. **Test your backups** by running tasks manually first
5. **Set up alerts** by monitoring the logs directory

## 🔒 Security Best Practices

- Change default admin password immediately
- Use strong, unique passwords for all connections
- Enable HTTPS in production environments
- Regularly update dependencies
- Monitor access logs for suspicious activity
- Backup your configuration and encryption keys

## 📞 Support

- Check the main README.md for detailed documentation
- Review application logs for error details
- Verify configuration settings in .env file

---

**Your backup service is ready to protect your data! 🛡️**
