#!/bin/bash

# Backup Service Startup Script
# This script provides multiple ways to start the backup service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to create default .env file
create_default_env() {
    print_info "Creating default .env configuration..."
    cat > .env << 'EOF'
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
EOF
    print_success "Default .env file created"
}

# Function to install dependencies
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_info "Installing dependencies..."
        npm install
    fi
}

# Function to install production dependencies
install_prod_dependencies() {
    if [ ! -d "node_modules" ]; then
        print_info "Installing production dependencies..."
        npm install --production
    fi
}

# Function to start in development mode
start_dev_mode() {
    echo
    print_info "Starting in development mode..."
    print_info "The service will auto-restart on file changes"
    print_info "Press Ctrl+C to stop"
    echo

    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating default configuration..."
        create_default_env
    fi

    install_dependencies
    npm run dev
}

# Function to start in production mode
start_prod_mode() {
    echo
    print_info "Starting in production mode..."
    print_info "Press Ctrl+C to stop"
    echo

    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Creating default configuration..."
        create_default_env
    fi

    install_prod_dependencies
    export NODE_ENV=production
    npm start
}

# Function to start with Docker
start_docker_mode() {
    echo
    print_info "Building and running Docker container..."

    # Check if Docker is installed
    if ! command_exists docker; then
        print_error "Docker is not installed or not running"
        print_error "Please install Docker from https://www.docker.com/"
        return 1
    fi

    # Build Docker image
    print_info "Building Docker image..."
    docker build -t backup-service:latest .

    # Stop existing container if running
    docker stop backup-service >/dev/null 2>&1 || true
    docker rm backup-service >/dev/null 2>&1 || true

    # Run Docker container
    print_info "Starting Docker container..."
    docker run -d \
        --name backup-service \
        -p 3000:3000 \
        -v backup_data:/app/data \
        -v backup_logs:/app/logs \
        -v backup_temp:/app/temp \
        backup-service:latest

    print_success "Docker container started successfully"
    print_info "Service available at: http://localhost:3000"
    print_info "View logs with: docker logs -f backup-service"
}

# Function to start with Docker Compose
start_docker_compose_mode() {
    echo
    print_info "Starting with Docker Compose..."

    # Check if Docker Compose is installed
    if command_exists docker-compose; then
        COMPOSE_CMD="docker-compose"
    elif command_exists docker && docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not installed"
        return 1
    fi

    # Start services
    print_info "Starting services with Docker Compose..."
    $COMPOSE_CMD up -d --build

    print_success "Services started successfully"
    print_info "Service available at: http://localhost:3000"
    print_info "View logs with: $COMPOSE_CMD logs -f"
}

# Function to run setup
run_setup() {
    echo
    print_info "Running setup configuration..."

    install_dependencies
    npm run setup
}

# Function to view logs
view_logs() {
    echo
    echo "Choose log viewing option:"
    echo
    echo "1. Application logs (if running locally)"
    echo "2. Docker container logs"
    echo "3. Docker Compose logs"
    echo "4. Back to main menu"
    echo
    read -p "Enter your choice (1-4): " log_choice

    case $log_choice in
        1)
            if [ -f "logs/backup_service.log" ]; then
                print_info "Showing application logs (Press Ctrl+C to stop)"
                tail -f logs/backup_service.log
            else
                print_warning "Log file not found. Service may not be running locally."
            fi
            ;;
        2)
            print_info "Showing Docker container logs (Press Ctrl+C to stop)"
            docker logs -f backup-service
            ;;
        3)
            print_info "Showing Docker Compose logs (Press Ctrl+C to stop)"
            if command_exists docker-compose; then
                docker-compose logs -f
            else
                docker compose logs -f
            fi
            ;;
        4)
            return
            ;;
        *)
            print_error "Invalid choice"
            ;;
    esac
}

# Function to stop services
stop_services() {
    echo
    print_info "Stopping all backup services..."

    # Stop Docker containers
    docker stop backup-service >/dev/null 2>&1 || true
    docker rm backup-service >/dev/null 2>&1 || true

    # Stop Docker Compose services
    if command_exists docker-compose; then
        docker-compose down >/dev/null 2>&1 || true
    elif command_exists docker; then
        docker compose down >/dev/null 2>&1 || true
    fi

    print_success "All services stopped"
}

# Main menu function
show_menu() {
    echo
    echo "========================================"
    echo "   Backup Service Startup Script"
    echo "========================================"
    echo
    echo "Choose startup method:"
    echo
    echo "1. Development mode (with auto-restart)"
    echo "2. Production mode"
    echo "3. Docker (build and run)"
    echo "4. Docker Compose"
    echo "5. Setup/Configuration"
    echo "6. View logs"
    echo "7. Stop all services"
    echo "8. Exit"
    echo
}

# Main script
main() {
    # Check if Node.js is installed
    if ! command_exists node; then
        print_error "Node.js is not installed or not in PATH"
        print_error "Please install Node.js 16+ from https://nodejs.org/"
        exit 1
    fi

    # Check if we're in the correct directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        print_error "Please run this script from the backup service directory"
        exit 1
    fi

    # Make script executable
    chmod +x "$0"

    while true; do
        show_menu
        read -p "Enter your choice (1-8): " choice

        case $choice in
            1)
                start_dev_mode
                ;;
            2)
                start_prod_mode
                ;;
            3)
                start_docker_mode
                ;;
            4)
                start_docker_compose_mode
                ;;
            5)
                run_setup
                ;;
            6)
                view_logs
                ;;
            7)
                stop_services
                ;;
            8)
                echo
                print_info "Thank you for using Backup Service!"
                print_info "Service documentation: README.md"
                print_info "Quick start guide: QUICK_START.md"
                echo
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac

        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"
