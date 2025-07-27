#!/bin/bash

# Rollback script for Pet Card Generator
# This script handles rolling back to a previous deployment

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="/var/backups/pet-card-generator"
LOG_FILE="/var/log/pet-card-generator/rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --version VERSION    Rollback to specific version"
    echo "  -l, --list              List available versions"
    echo "  -f, --force             Force rollback without confirmation"
    echo "  -e, --environment ENV   Environment (staging|production)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --list"
    echo "  $0 --version v1.2.3 --environment production"
    echo "  $0 --version v1.2.3 --force"
}

# Function to list available versions
list_versions() {
    log "Available versions for rollback:"
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR" | grep "^d" | awk '{print $9}' | grep -v "^\.$\|^\.\.$" | sort -V -r | head -10
    else
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
}

# Function to validate version exists
validate_version() {
    local version=$1
    
    if [ ! -d "$BACKUP_DIR/$version" ]; then
        error "Version $version not found in backup directory"
        list_versions
        exit 1
    fi
    
    if [ ! -f "$BACKUP_DIR/$version/dist.tar.gz" ]; then
        error "Backup files not found for version $version"
        exit 1
    fi
}

# Function to create current backup before rollback
backup_current() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/pre_rollback_$timestamp"
    
    log "Creating backup of current deployment..."
    
    mkdir -p "$backup_path"
    
    # Backup current application files
    if [ -d "/var/www/pet-card-generator" ]; then
        tar -czf "$backup_path/current_dist.tar.gz" -C "/var/www" pet-card-generator
    fi
    
    # Backup current database state (if applicable)
    if command -v pg_dump &> /dev/null; then
        pg_dump pet_card_generator > "$backup_path/database_backup.sql" 2>/dev/null || true
    fi
    
    # Save current version info
    echo "$(date): Pre-rollback backup" > "$backup_path/backup_info.txt"
    
    log "Current deployment backed up to: $backup_path"
}

# Function to stop services
stop_services() {
    log "Stopping services..."
    
    # Stop application services
    if systemctl is-active --quiet pet-card-generator; then
        systemctl stop pet-card-generator
        log "Stopped pet-card-generator service"
    fi
    
    # Stop nginx if needed
    if systemctl is-active --quiet nginx; then
        systemctl reload nginx
        log "Reloaded nginx configuration"
    fi
}

# Function to restore application files
restore_files() {
    local version=$1
    local app_dir="/var/www/pet-card-generator"
    
    log "Restoring application files for version $version..."
    
    # Remove current files
    if [ -d "$app_dir" ]; then
        rm -rf "$app_dir"
    fi
    
    # Create directory
    mkdir -p "$app_dir"
    
    # Extract backup
    tar -xzf "$BACKUP_DIR/$version/dist.tar.gz" -C "/var/www/"
    
    # Set proper permissions
    chown -R www-data:www-data "$app_dir"
    chmod -R 755 "$app_dir"
    
    log "Application files restored successfully"
}

# Function to restore database (if needed)
restore_database() {
    local version=$1
    
    if [ -f "$BACKUP_DIR/$version/database_backup.sql" ]; then
        log "Restoring database for version $version..."
        
        # Create database backup before restore
        pg_dump pet_card_generator > "/tmp/pre_rollback_db_$(date +%Y%m%d_%H%M%S).sql" 2>/dev/null || true
        
        # Restore database
        psql pet_card_generator < "$BACKUP_DIR/$version/database_backup.sql" 2>/dev/null || {
            warning "Database restore failed or not applicable"
        }
        
        log "Database restore completed"
    else
        log "No database backup found for version $version, skipping database restore"
    fi
}

# Function to start services
start_services() {
    log "Starting services..."
    
    # Start application services
    systemctl start pet-card-generator
    
    # Verify service is running
    sleep 5
    if systemctl is-active --quiet pet-card-generator; then
        log "pet-card-generator service started successfully"
    else
        error "Failed to start pet-card-generator service"
        exit 1
    fi
}

# Function to run health checks
health_check() {
    local max_attempts=30
    local attempt=1
    
    log "Running health checks..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost/health > /dev/null; then
            log "Health check passed"
            return 0
        fi
        
        log "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to run smoke tests
smoke_tests() {
    log "Running smoke tests..."
    
    # Test main endpoints
    local endpoints=(
        "http://localhost/"
        "http://localhost/health"
        "http://localhost/api/health"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            log "✓ $endpoint is responding"
        else
            error "✗ $endpoint is not responding"
            return 1
        fi
    done
    
    log "All smoke tests passed"
}

# Function to send notifications
send_notification() {
    local status=$1
    local version=$2
    local environment=$3
    
    local message
    if [ "$status" = "success" ]; then
        message="✅ Rollback to version $version completed successfully in $environment"
    else
        message="❌ Rollback to version $version failed in $environment"
    fi
    
    # Send Slack notification if webhook is configured
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Send email notification if configured
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Pet Card Generator Rollback" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
    
    log "Notification sent: $message"
}

# Main rollback function
perform_rollback() {
    local version=$1
    local environment=$2
    local force=$3
    
    log "Starting rollback to version $version in $environment environment"
    
    # Validate version
    validate_version "$version"
    
    # Confirmation prompt
    if [ "$force" != "true" ]; then
        echo -e "${YELLOW}Are you sure you want to rollback to version $version in $environment? (y/N)${NC}"
        read -r confirmation
        if [[ ! $confirmation =~ ^[Yy]$ ]]; then
            log "Rollback cancelled by user"
            exit 0
        fi
    fi
    
    # Perform rollback steps
    backup_current
    stop_services
    restore_files "$version"
    restore_database "$version"
    start_services
    
    # Verify rollback
    if health_check && smoke_tests; then
        log "Rollback to version $version completed successfully"
        send_notification "success" "$version" "$environment"
    else
        error "Rollback verification failed"
        send_notification "failure" "$version" "$environment"
        exit 1
    fi
}

# Parse command line arguments
VERSION=""
ENVIRONMENT="production"
FORCE=false
LIST=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -l|--list)
            LIST=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Main execution
main() {
    # Create log directory
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "Pet Card Generator Rollback Script Started"
    
    if [ "$LIST" = true ]; then
        list_versions
        exit 0
    fi
    
    if [ -z "$VERSION" ]; then
        error "Version is required. Use --version or --list to see available versions."
        usage
        exit 1
    fi
    
    # Validate environment
    if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
        error "Environment must be 'staging' or 'production'"
        exit 1
    fi
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root"
        exit 1
    fi
    
    # Perform rollback
    perform_rollback "$VERSION" "$ENVIRONMENT" "$FORCE"
    
    log "Rollback script completed"
}

# Run main function
main "$@"