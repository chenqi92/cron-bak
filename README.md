# Backup Service

A comprehensive, lightweight backup management service with scheduled task automation, designed for resource-constrained devices.

[![Docker Build](https://github.com/your-username/cron-bak/actions/workflows/docker-build.yml/badge.svg)](https://github.com/your-username/cron-bak/actions/workflows/docker-build.yml)
[![Docker Pulls](https://img.shields.io/docker/pulls/your-username/backup-service)](https://hub.docker.com/r/your-username/backup-service)
[![GitHub release](https://img.shields.io/github/release/your-username/cron-bak.svg)](https://github.com/your-username/cron-bak/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

### 🚀 Core Functionality
- **Scheduled Task Management** - Web-based application for managing automated backup tasks
- **Authentication System** - Secure login with environment-configured credentials
- **Three Backup Types**:
  - MySQL-to-MySQL synchronization using native replication
  - MySQL database backup to SMB network shares
  - MinIO bucket synchronization between instances

### 🛡️ Security & Performance
- Lightweight architecture suitable for resource-constrained devices
- Data transfer uses native database/storage features (not through local service)
- Encrypted credential storage with AES-256-GCM encryption
- JWT-based authentication with session management
- Rate limiting and security headers

### 🎨 User Interface
- **Modern, responsive web UI** built with Bootstrap 5
- **Internationalization (i18n)** support for English and Chinese (简体中文)
- **Dark/Light theme system** with smooth transitions and system preference detection
- **Enhanced visual design** with modern styling, animations, and micro-interactions
- **Intuitive dashboard** for managing backup tasks with real-time updates
- **Comprehensive statistics** and reporting with interactive charts
- **Accessibility compliant** (WCAG 2.1 AA) with keyboard navigation and screen reader support

### 📊 Monitoring & Logging
- Detailed backup logs with retention management
- System health monitoring
- Performance statistics and success rate tracking
- Automated cleanup of old logs and temporary files

## Quick Start

### Prerequisites
- Node.js 16.0.0 or higher (for source installation)
- Docker and Docker Compose (for containerized deployment)

### Installation Options

#### Option 1: Using Docker (Recommended)

**Pull from GitHub Container Registry:**
```bash
docker run -d \
  --name backup-service \
  -p 3000:3000 \
  -v backup_data:/app/data \
  -v backup_logs:/app/logs \
  -v backup_temp:/app/temp \
  ghcr.io/your-username/cron-bak:latest
```

**Using Docker Compose:**
```bash
curl -O https://raw.githubusercontent.com/your-username/cron-bak/main/docker-compose.yml
docker-compose up -d
```

#### Option 2: Quick Start Script

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
chmod +x start.sh
./start.sh
```

#### Option 3: From Source

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/cron-bak.git
   cd cron-bak
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run setup wizard**
   ```bash
   npm run setup
   ```

4. **Start the service**
   ```bash
   npm start
   ```

5. **Access the web interface**
   Open your browser to `http://localhost:3000`

## 🎨 UI Features

### Internationalization (i18n)
- **Language Support**: English and Simplified Chinese (简体中文)
- **Dynamic Switching**: Change language without page reload using the globe icon in navigation
- **Persistent Preferences**: Language choice saved automatically
- **Comprehensive Translation**: All interface elements, messages, and labels translated

### Theme System
- **Light/Dark Themes**: Toggle between light and dark modes using the moon/sun icon
- **System Preference**: Automatically detects and follows system theme preference
- **Smooth Transitions**: Animated theme switching with CSS transitions
- **Consistent Theming**: All components adapt to selected theme

### Enhanced Design
- **Modern Styling**: Contemporary design with improved typography and spacing
- **Interactive Elements**: Hover effects, animations, and micro-interactions
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Accessibility**: WCAG 2.1 AA compliant with keyboard navigation support

### Demo Page
Visit `/demo.html` to see all UI features in action with interactive examples.

### Development Mode

For development with auto-restart:
```bash
npm run dev
# or
make dev
```

## Configuration

### Environment Variables

The service is configured via environment variables in the `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret

# Database & Security
DB_PATH=./data/backup_service.db
ENCRYPTION_KEY=your_32_character_encryption_key

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/backup_service.log

# Backup Settings
BACKUP_TEMP_DIR=./temp
BACKUP_LOG_RETENTION_DAYS=30
MAX_CONCURRENT_BACKUPS=3
```

### Backup Types Configuration

#### MySQL-to-MySQL Synchronization
```javascript
{
  "type": "mysql_to_mysql",
  "sourceConfig": {
    "host": "source.mysql.com",
    "port": 3306,
    "username": "user",
    "password": "password",
    "database": "source_db"
  },
  "destinationConfig": {
    "host": "dest.mysql.com",
    "port": 3306,
    "username": "user",
    "password": "password",
    "database": "dest_db"
  }
}
```

#### MySQL-to-SMB Backup
```javascript
{
  "type": "mysql_to_smb",
  "sourceConfig": {
    "host": "mysql.server.com",
    "port": 3306,
    "username": "mysql_user",
    "password": "mysql_password",
    "database": "my_database"
  },
  "destinationConfig": {
    "host": "smb.server.com",
    "port": 445,
    "username": "smb_user",
    "password": "smb_password",
    "share": "backups",
    "path": "/mysql-backups/"
  }
}
```

#### MinIO-to-MinIO Synchronization
```javascript
{
  "type": "minio_to_minio",
  "sourceConfig": {
    "endPoint": "source.minio.com",
    "port": 9000,
    "useSSL": true,
    "accessKey": "access_key",
    "secretKey": "secret_key",
    "bucket": "source-bucket"
  },
  "destinationConfig": {
    "endPoint": "dest.minio.com",
    "port": 9000,
    "useSSL": true,
    "accessKey": "access_key",
    "secretKey": "secret_key",
    "bucket": "dest-bucket"
  }
}
```

## Version Management

### Versioning Strategy

This project follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

### Updating Version

**Using npm scripts:**
```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:major
```

**Using Makefile:**
```bash
# Patch version
make version-patch

# Minor version
make version-minor

# Major version
make version-major
```

### Automated Releases

When you push changes to the `VERSION` file to the main branch:

1. **GitHub Actions automatically:**
   - Builds multi-architecture Docker images
   - Pushes to GitHub Container Registry (`ghcr.io`)
   - Pushes to Docker Hub (if configured)
   - Creates a GitHub release with changelog
   - Runs security scans

2. **Docker images are tagged with:**
   - `latest` (for main branch)
   - Version number (e.g., `1.0.0`)
   - Git SHA (e.g., `main-abc1234`)

### CI/CD Pipeline

The project includes GitHub Actions workflows for:

- **Docker Build** (`.github/workflows/docker-build.yml`)
  - Multi-architecture builds (AMD64, ARM64, ARMv7)
  - Automated testing and security scanning
  - Push to multiple registries

- **Release Management** (`.github/workflows/release.yml`)
  - Automatic tagging and releases
  - Changelog generation
  - Version synchronization

### Available Commands

**Development:**
```bash
make help          # Show all available commands
make dev           # Start development server
make test          # Run tests
make logs          # Show application logs
```

**Docker:**
```bash
make docker-build  # Build Docker image
make docker-run    # Build and run container
make compose-up    # Start with Docker Compose
make status        # Show service status
```

**Maintenance:**
```bash
make backup-data   # Backup application data
make clean         # Clean up containers and volumes
make health        # Check service health
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `GET /api/auth/status` - Check authentication status

### Task Management Endpoints

- `GET /api/tasks` - List all backup tasks
- `POST /api/tasks` - Create new backup task
- `GET /api/tasks/:id` - Get specific task details
- `PUT /api/tasks/:id` - Update task configuration
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/run` - Run task immediately
- `POST /api/tasks/:id/toggle` - Toggle task active status

### Dashboard Endpoints

- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/dashboard/logs` - Recent backup logs
- `GET /api/dashboard/statistics` - Detailed statistics
- `GET /api/dashboard/health` - System health status

## Deployment

### Docker Deployment (Recommended)

#### Using Pre-built Images

**From GitHub Container Registry:**
```bash
# Latest version
docker pull ghcr.io/your-username/cron-bak:latest

# Specific version
docker pull ghcr.io/your-username/cron-bak:1.0.0
```

**From Docker Hub:**
```bash
# Latest version
docker pull your-username/backup-service:latest

# Specific version
docker pull your-username/backup-service:1.0.0
```

#### Multi-Architecture Support

The Docker images support multiple architectures:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple M1/M2, AWS Graviton)
- `linux/arm/v7` (ARM 32-bit, Raspberry Pi)

#### Production Docker Compose

```yaml
version: '3.8'
services:
  backup-service:
    image: ghcr.io/your-username/cron-bak:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ADMIN_PASSWORD=your_secure_password
    volumes:
      - backup_data:/app/data
      - backup_logs:/app/logs
      - backup_temp:/app/temp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  backup_data:
  backup_logs:
  backup_temp:
```

### Traditional Deployment

1. **Set production environment**
   ```bash
   export NODE_ENV=production
   ```

2. **Configure reverse proxy** (recommended)
   Use nginx or Apache to proxy requests to the Node.js service

3. **Set up process manager**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name backup-service
   pm2 startup
   pm2 save
   ```

4. **Configure firewall**
   Ensure only necessary ports are open

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backup-service
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backup-service
  template:
    metadata:
      labels:
        app: backup-service
    spec:
      containers:
      - name: backup-service
        image: ghcr.io/your-username/cron-bak:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        volumeMounts:
        - name: data
          mountPath: /app/data
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: backup-data
      - name: logs
        persistentVolumeClaim:
          claimName: backup-logs
```

## Security Considerations

- Change default admin credentials immediately
- Use strong, unique passwords and keys
- Enable HTTPS in production
- Regularly update dependencies
- Monitor logs for suspicious activity
- Implement network-level access controls
- Backup your configuration and encryption keys securely

## Troubleshooting

### Common Issues

1. **Service won't start**
   - Check Node.js version (requires 16+)
   - Verify .env file configuration
   - Check port availability

2. **Database connection errors**
   - Ensure data directory exists and is writable
   - Check database file permissions

3. **Backup tasks failing**
   - Verify source/destination credentials
   - Check network connectivity
   - Review backup logs for specific errors

4. **Authentication issues**
   - Verify admin credentials in .env file
   - Check JWT secret configuration
   - Clear browser cache/cookies

### Logs

Check application logs for detailed error information:
```bash
tail -f logs/backup_service.log
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Check the troubleshooting section
- Review application logs
- Create an issue in the repository

---

**Note**: This backup service is designed for lightweight deployment scenarios. For enterprise-scale deployments, consider additional monitoring, clustering, and high-availability configurations.
