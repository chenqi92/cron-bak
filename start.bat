@echo off
setlocal enabledelayedexpansion

:: Backup Service Startup Script
:: This script provides multiple ways to start the backup service

echo.
echo ========================================
echo   Backup Service Startup Script
echo ========================================
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 16+ from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if we're in the correct directory
if not exist "package.json" (
    echo [ERROR] package.json not found
    echo Please run this script from the backup service directory
    pause
    exit /b 1
)

:: Display menu
:menu
echo Choose startup method:
echo.
echo 1. Development mode (with auto-restart)
echo 2. Production mode
echo 3. Docker (build and run)
echo 4. Docker Compose
echo 5. Setup/Configuration
echo 6. View logs
echo 7. Stop all services
echo 8. Exit
echo.
set /p choice="Enter your choice (1-8): "

if "%choice%"=="1" goto dev_mode
if "%choice%"=="2" goto prod_mode
if "%choice%"=="3" goto docker_mode
if "%choice%"=="4" goto docker_compose_mode
if "%choice%"=="5" goto setup_mode
if "%choice%"=="6" goto view_logs
if "%choice%"=="7" goto stop_services
if "%choice%"=="8" goto exit_script

echo Invalid choice. Please try again.
echo.
goto menu

:dev_mode
echo.
echo [INFO] Starting in development mode...
echo [INFO] The service will auto-restart on file changes
echo [INFO] Press Ctrl+C to stop
echo.

:: Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating default configuration...
    call :create_default_env
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        goto menu
    )
)

npm run dev
goto menu

:prod_mode
echo.
echo [INFO] Starting in production mode...
echo [INFO] Press Ctrl+C to stop
echo.

:: Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found. Creating default configuration...
    call :create_default_env
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install --production
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        goto menu
    )
)

set NODE_ENV=production
npm start
goto menu

:docker_mode
echo.
echo [INFO] Building and running Docker container...

:: Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not running
    echo Please install Docker Desktop from https://www.docker.com/
    pause
    goto menu
)

:: Build Docker image
echo [INFO] Building Docker image...
docker build -t backup-service:latest .
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    pause
    goto menu
)

:: Stop existing container if running
docker stop backup-service >nul 2>&1
docker rm backup-service >nul 2>&1

:: Run Docker container
echo [INFO] Starting Docker container...
docker run -d ^
    --name backup-service ^
    -p 3000:3000 ^
    -v backup_data:/app/data ^
    -v backup_logs:/app/logs ^
    -v backup_temp:/app/temp ^
    backup-service:latest

if errorlevel 1 (
    echo [ERROR] Failed to start Docker container
    pause
    goto menu
)

echo [SUCCESS] Docker container started successfully
echo [INFO] Service available at: http://localhost:3000
echo [INFO] View logs with: docker logs -f backup-service
pause
goto menu

:docker_compose_mode
echo.
echo [INFO] Starting with Docker Compose...

:: Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    docker compose version >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] Docker Compose is not installed
        pause
        goto menu
    )
    set COMPOSE_CMD=docker compose
) else (
    set COMPOSE_CMD=docker-compose
)

:: Start services
echo [INFO] Starting services with Docker Compose...
%COMPOSE_CMD% up -d --build

if errorlevel 1 (
    echo [ERROR] Failed to start services with Docker Compose
    pause
    goto menu
)

echo [SUCCESS] Services started successfully
echo [INFO] Service available at: http://localhost:3000
echo [INFO] View logs with: %COMPOSE_CMD% logs -f
pause
goto menu

:setup_mode
echo.
echo [INFO] Running setup configuration...

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        goto menu
    )
)

npm run setup
pause
goto menu

:view_logs
echo.
echo Choose log viewing option:
echo.
echo 1. Application logs (if running locally)
echo 2. Docker container logs
echo 3. Docker Compose logs
echo 4. Back to main menu
echo.
set /p log_choice="Enter your choice (1-4): "

if "%log_choice%"=="1" (
    if exist "logs\backup_service.log" (
        echo [INFO] Showing application logs (Press Ctrl+C to stop)
        type logs\backup_service.log
        pause
    ) else (
        echo [WARNING] Log file not found. Service may not be running locally.
        pause
    )
)
if "%log_choice%"=="2" (
    echo [INFO] Showing Docker container logs (Press Ctrl+C to stop)
    docker logs -f backup-service
)
if "%log_choice%"=="3" (
    echo [INFO] Showing Docker Compose logs (Press Ctrl+C to stop)
    docker-compose logs -f 2>nul || docker compose logs -f
)
if "%log_choice%"=="4" goto menu

goto menu

:stop_services
echo.
echo [INFO] Stopping all backup services...

:: Stop Docker containers
docker stop backup-service >nul 2>&1
docker rm backup-service >nul 2>&1

:: Stop Docker Compose services
docker-compose down >nul 2>&1 || docker compose down >nul 2>&1

echo [SUCCESS] All services stopped
pause
goto menu

:create_default_env
echo [INFO] Creating default .env configuration...
(
echo # Server Configuration
echo PORT=3000
echo NODE_ENV=development
echo.
echo # Authentication
echo ADMIN_USERNAME=admin
echo ADMIN_PASSWORD=backup123!
echo JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
echo SESSION_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
echo.
echo # Database
echo DB_PATH=./data/backup_service.db
echo ENCRYPTION_KEY=12345678901234567890123456789012
echo.
echo # Logging
echo LOG_LEVEL=info
echo LOG_FILE=./logs/backup_service.log
echo.
echo # Security
echo RATE_LIMIT_WINDOW_MS=900000
echo RATE_LIMIT_MAX_REQUESTS=100
echo.
echo # Backup Configuration
echo BACKUP_TEMP_DIR=./temp
echo BACKUP_LOG_RETENTION_DAYS=30
echo MAX_CONCURRENT_BACKUPS=3
echo.
echo # Default Backup Settings
echo DEFAULT_BACKUP_RETENTION_DAYS=7
echo DEFAULT_MYSQL_TIMEOUT=300000
echo DEFAULT_MINIO_TIMEOUT=600000
echo DEFAULT_SMB_TIMEOUT=300000
) > .env
echo [SUCCESS] Default .env file created
goto :eof

:exit_script
echo.
echo [INFO] Thank you for using Backup Service!
echo [INFO] Service documentation: README.md
echo [INFO] Quick start guide: QUICK_START.md
echo.
exit /b 0
