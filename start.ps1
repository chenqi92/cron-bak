# Backup Service PowerShell Startup Script
# This script provides a convenient way to start the backup service on Windows

param(
    [string]$Mode = "menu",
    [int]$Port = 3000,
    [switch]$Setup,
    [switch]$Dev,
    [switch]$Production,
    [switch]$Docker,
    [switch]$Help
)

# Set console title
$Host.UI.RawUI.WindowTitle = "Backup Service Startup"

# Colors for output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Header {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   Backup Service Startup Script" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
}

function Show-Help {
    Write-Host "Backup Service PowerShell Startup Script"
    Write-Host ""
    Write-Host "USAGE:"
    Write-Host "  .\start.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "OPTIONS:"
    Write-Host "  -Mode <mode>      Startup mode: menu, dev, production, docker, setup"
    Write-Host "  -Port <port>      Custom port (default: 3000)"
    Write-Host "  -Setup            Run setup wizard"
    Write-Host "  -Dev              Start in development mode"
    Write-Host "  -Production       Start in production mode"
    Write-Host "  -Docker           Start using Docker"
    Write-Host "  -Help             Show this help message"
    Write-Host ""
    Write-Host "EXAMPLES:"
    Write-Host "  .\start.ps1                    # Show interactive menu"
    Write-Host "  .\start.ps1 -Dev               # Start in development mode"
    Write-Host "  .\start.ps1 -Production        # Start in production mode"
    Write-Host "  .\start.ps1 -Docker            # Start using Docker"
    Write-Host "  .\start.ps1 -Setup             # Run setup wizard"
    Write-Host "  .\start.ps1 -Port 8080         # Start on custom port"
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 16) {
            Write-Error "Node.js version 16+ is required. Current version: $nodeVersion"
            return $false
        }
        Write-Success "Node.js check passed ($nodeVersion)"
    }
    catch {
        Write-Error "Node.js is not installed or not in PATH"
        Write-Error "Please install Node.js 16+ from https://nodejs.org/"
        return $false
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm check passed ($npmVersion)"
    }
    catch {
        Write-Error "npm is not installed or not in PATH"
        return $false
    }
    
    # Check if we're in the correct directory
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found"
        Write-Error "Please run this script from the backup service directory"
        return $false
    }
    
    return $true
}

function Test-DockerPrerequisites {
    Write-Info "Checking Docker prerequisites..."
    
    try {
        $dockerVersion = docker --version
        Write-Success "Docker check passed ($dockerVersion)"
    }
    catch {
        Write-Error "Docker is not installed or not in PATH"
        Write-Error "Please install Docker from https://www.docker.com/"
        return $false
    }
    
    try {
        docker info | Out-Null
        Write-Success "Docker daemon is running"
    }
    catch {
        Write-Error "Docker daemon is not running"
        Write-Error "Please start Docker Desktop"
        return $false
    }
    
    return $true
}

function Install-Dependencies {
    param([bool]$ProductionOnly = $false)
    
    if (-not (Test-Path "node_modules")) {
        if ($ProductionOnly) {
            Write-Info "Installing production dependencies..."
            npm install --production
        } else {
            Write-Info "Installing dependencies..."
            npm install
        }
    } else {
        Write-Success "Dependencies already installed"
    }
}

function New-DefaultEnv {
    Write-Info "Creating default .env configuration..."
    
    $envContent = @"
# Server Configuration
PORT=3000
NODE_ENV=development

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=backup123!
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
SESSION_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1

# Database
DB_PATH=./data/backup_service.db
ENCRYPTION_KEY=12345678901234567890123456789012

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/backup_service.log

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Backup Configuration
BACKUP_TEMP_DIR=./temp
BACKUP_LOG_RETENTION_DAYS=30
MAX_CONCURRENT_BACKUPS=3

# Default Backup Settings
DEFAULT_BACKUP_RETENTION_DAYS=7
DEFAULT_MYSQL_TIMEOUT=300000
DEFAULT_MINIO_TIMEOUT=600000
DEFAULT_SMB_TIMEOUT=300000
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Success "Default .env file created"
}

function New-Directories {
    Write-Info "Creating necessary directories..."
    
    @("data", "logs", "temp") | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    
    Write-Success "Directories created"
}

function Start-DevMode {
    Write-Header
    Write-Info "Starting in development mode..."
    Write-Info "The service will auto-restart on file changes"
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""
    
    if (-not (Test-Prerequisites)) { return }
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating default configuration..."
        New-DefaultEnv
    }
    
    Install-Dependencies
    New-Directories
    
    Write-Info "Service will be available at: http://localhost:$Port"
    Write-Info "Default credentials: admin / backup123!"
    Write-Host ""
    
    if ($Port -ne 3000) {
        $env:PORT = $Port
    }
    
    npm run dev
}

function Start-ProductionMode {
    Write-Header
    Write-Info "Starting in production mode..."
    Write-Info "Press Ctrl+C to stop"
    Write-Host ""
    
    if (-not (Test-Prerequisites)) { return }
    
    if (-not (Test-Path ".env")) {
        Write-Warning ".env file not found. Creating default configuration..."
        New-DefaultEnv
    }
    
    Install-Dependencies -ProductionOnly $true
    New-Directories
    
    Write-Info "Service will be available at: http://localhost:$Port"
    Write-Info "Default credentials: admin / backup123!"
    Write-Host ""
    
    $env:NODE_ENV = "production"
    if ($Port -ne 3000) {
        $env:PORT = $Port
    }
    
    npm start
}

function Start-DockerMode {
    Write-Header
    Write-Info "Building and running Docker container..."
    
    if (-not (Test-DockerPrerequisites)) { return }
    
    # Build Docker image
    Write-Info "Building Docker image..."
    docker build -t backup-service:latest .
    
    # Stop existing container if running
    Write-Info "Stopping existing container if running..."
    docker stop backup-service 2>$null | Out-Null
    docker rm backup-service 2>$null | Out-Null
    
    # Run Docker container
    Write-Info "Starting Docker container..."
    docker run -d `
        --name backup-service `
        -p "${Port}:3000" `
        -v backup_data:/app/data `
        -v backup_logs:/app/logs `
        -v backup_temp:/app/temp `
        backup-service:latest
    
    Write-Success "Docker container started successfully"
    Write-Info "Service available at: http://localhost:$Port"
    Write-Info "Default credentials: admin / backup123!"
    Write-Info "View logs with: docker logs -f backup-service"
    Write-Host ""
    
    # Show container logs
    Write-Info "Container logs (press Ctrl+C to stop following):"
    docker logs -f backup-service
}

function Start-SetupMode {
    Write-Header
    Write-Info "Running setup configuration..."
    
    if (-not (Test-Prerequisites)) { return }
    
    Install-Dependencies
    npm run setup
}

function Show-Menu {
    while ($true) {
        Write-Header
        Write-Host "Choose startup method:" -ForegroundColor White
        Write-Host ""
        Write-Host "1. Development mode (with auto-restart)" -ForegroundColor White
        Write-Host "2. Production mode" -ForegroundColor White
        Write-Host "3. Docker (build and run)" -ForegroundColor White
        Write-Host "4. Setup/Configuration" -ForegroundColor White
        Write-Host "5. View logs" -ForegroundColor White
        Write-Host "6. Stop all services" -ForegroundColor White
        Write-Host "7. Exit" -ForegroundColor White
        Write-Host ""
        
        $choice = Read-Host "Enter your choice (1-7)"
        
        switch ($choice) {
            "1" { Start-DevMode; break }
            "2" { Start-ProductionMode; break }
            "3" { Start-DockerMode; break }
            "4" { Start-SetupMode; break }
            "5" { Show-Logs; break }
            "6" { Stop-Services; break }
            "7" { 
                Write-Host ""
                Write-Info "Thank you for using Backup Service!"
                Write-Info "Service documentation: README.md"
                Write-Info "Quick start guide: QUICK_START.md"
                Write-Host ""
                exit 0
            }
            default { 
                Write-Error "Invalid choice. Please try again."
                Start-Sleep -Seconds 2
            }
        }
    }
}

function Show-Logs {
    Write-Host ""
    Write-Host "Choose log viewing option:" -ForegroundColor White
    Write-Host ""
    Write-Host "1. Application logs (if running locally)" -ForegroundColor White
    Write-Host "2. Docker container logs" -ForegroundColor White
    Write-Host "3. Back to main menu" -ForegroundColor White
    Write-Host ""
    
    $logChoice = Read-Host "Enter your choice (1-3)"
    
    switch ($logChoice) {
        "1" {
            if (Test-Path "logs\backup_service.log") {
                Write-Info "Showing application logs (Press Ctrl+C to stop)"
                Get-Content "logs\backup_service.log" -Wait
            } else {
                Write-Warning "Log file not found. Service may not be running locally."
                Read-Host "Press Enter to continue"
            }
        }
        "2" {
            Write-Info "Showing Docker container logs (Press Ctrl+C to stop)"
            docker logs -f backup-service
        }
        "3" {
            return
        }
        default {
            Write-Error "Invalid choice"
            Start-Sleep -Seconds 2
        }
    }
}

function Stop-Services {
    Write-Host ""
    Write-Info "Stopping all backup services..."
    
    # Stop Docker containers
    docker stop backup-service 2>$null | Out-Null
    docker rm backup-service 2>$null | Out-Null
    
    # Stop Docker Compose services
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        docker-compose down 2>$null | Out-Null
    } else {
        docker compose down 2>$null | Out-Null
    }
    
    Write-Success "All services stopped"
    Read-Host "Press Enter to continue"
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

# Handle command line parameters
if ($Setup) {
    Start-SetupMode
} elseif ($Dev) {
    Start-DevMode
} elseif ($Production) {
    Start-ProductionMode
} elseif ($Docker) {
    Start-DockerMode
} elseif ($Mode -eq "dev") {
    Start-DevMode
} elseif ($Mode -eq "production") {
    Start-ProductionMode
} elseif ($Mode -eq "docker") {
    Start-DockerMode
} elseif ($Mode -eq "setup") {
    Start-SetupMode
} else {
    Show-Menu
}
