#!/bin/bash

# Deployment script for Pet Card Generator
# This script handles deployment to different environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="/var/log/pet-card-generator/deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Target environment (staging|production)"
    echo "  -v, --version VERSION    Version to deploy"
    echo "  -f, --force             Force deployment without confirmation"
    echo "  -r, --rollback          Rollback to previous version"
    echo "  -s, --skip-tests        Skip running tests before deployment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment staging --version v1.2.3"
    echo "  $0 --environment production --version v1.2.3 --force"
    echo "  $0 --environment production --rollback"
}

# Function to validate environment
validate_environment() {
    local env=$1
    
    if [[ ! "$env" =~ ^(staging|production)$ ]]; then
        error "Invalid environment: $env. Must be 'staging' or 'production'"
        exit 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    local env=$1
    
    log "Checking deployment prerequisites for $env..."
    
    # Check required tools
    local required_tools=("docker" "git" "curl" "jq")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "Required tool '$tool' is not installed"
            exit 1
        fi
    done
    
    # Check environment variables
    local required_vars=()
    if [ "$env" = "staging" ]; then
        required_vars=("STAGING_SERVER" "STAGING_SSH_KEY")
    else
        required_vars=("PRODUCTION_SERVER" "PRODUCTION_SSH_KEY")
    fi
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            error "Required environment variable '$var' is not set"
            exit 1
        fi
    done
    
    log "Prerequisites check passed"
}

# Function to run tests
run_tests() {
    if [ "$SKIP_TESTS" = "true" ]; then
        warning "Skipping tests as requested"
        return 0
    fi
    
    log "Running tests before deployment..."
    
    cd "$PROJECT_ROOT"
    
    # Run unit tests
    if ! npm run test:unit; then
        error "Unit tests failed"
        exit 1
    fi
    
    # Run E2E tests
    if ! npm run test:e2e; then
        error "E2E tests failed"
        exit 1
    fi
    
    # Run security audit
    if ! npm audit --audit-level=high; then
        error "Security audit failed"
        exit 1
    fi
    
    log "All tests passed"
}

# Function to build application
build_application() {
    local version=$1
    
    log "Building application version $version..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci --production=false
    
    # Build application
    NODE_ENV=production npm run build
    
    # Create deployment package
    local package_name="pet-card-generator-${version}.tar.gz"
    tar -czf "$package_name" dist/ docker/ scripts/ package.json
    
    log "Application built successfully: $package_name"
    echo "$package_name"
}

# Function to create backup
create_backup() {
    local env=$1
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="backup_${env}_${timestamp}"
    
    log "Creating backup: $backup_name"
    
    # This would create a backup of the current deployment
    # Implementation depends on your infrastructure
    
    log "Backup created: $backup_name"
    echo "$backup_name"
}

# Function to deploy to staging
deploy_staging() {
    local version=$1
    local package_file=$2
    
    log "Deploying version $version to staging..."
    
    # Upload package to staging server
    scp -i "$STAGING_SSH_KEY" "$package_file" "deploy@$STAGING_SERVER:/tmp/"
    
    # Deploy on staging server
    ssh -i "$STAGING_SSH_KEY" "deploy@$STAGING_SERVER" << EOF
        set -e
        cd /var/www
        
        # Stop services
        sudo systemctl stop pet-card-generator-staging
        
        # Backup current deployment
        if [ -d "pet-card-generator-staging" ]; then
            sudo mv pet-card-generator-staging pet-card-generator-staging.backup.\$(date +%Y%m%d_%H%M%S)
        fi
        
        # Extract new deployment
        tar -xzf /tmp/$package_file
        sudo mv dist pet-card-generator-staging
        
        # Set permissions
        sudo chown -R www-data:www-data pet-card-generator-staging
        
        # Start services
        sudo systemctl start pet-card-generator-staging
        sudo systemctl reload nginx
        
        # Cleanup
        rm /tmp/$package_file
EOF
    
    log "Staging deployment completed"
}

# Function to deploy to production
deploy_production() {
    local version=$1
    local package_file=$2
    
    log "Deploying version $version to production..."
    
    # Upload package to production server
    scp -i "$PRODUCTION_SSH_KEY" "$package_file" "deploy@$PRODUCTION_SERVER:/tmp/"
    
    # Deploy on production server
    ssh -i "$PRODUCTION_SSH_KEY" "deploy@$PRODUCTION_SERVER" << EOF
        set -e
        cd /var/www
        
        # Stop services
        sudo systemctl stop pet-card-generator
        
        # Backup current deployment
        if [ -d "pet-card-generator" ]; then
            sudo mv pet-card-generator pet-card-generator.backup.\$(date +%Y%m%d_%H%M%S)
        fi
        
        # Extract new deployment
        tar -xzf /tmp/$package_file
        sudo mv dist pet-card-generator
        
        # Set permissions
        sudo chown -R www-data:www-data pet-card-generator
        
        # Start services
        sudo systemctl start pet-card-generator
        sudo systemctl reload nginx
        
        # Cleanup
        rm /tmp/$package_file
EOF
    
    log "Production deployment completed"
}

# Function to run health checks
health_check() {
    local env=$1
    local url
    
    if [ "$env" = "staging" ]; then
        url="https://staging.petcardgenerator.com"
    else
        url="https://petcardgenerator.com"
    fi
    
    log "Running health checks for $env..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/health" > /dev/null; then
            log "Health check passed for $env"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying in 10 seconds..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed for $env after $max_attempts attempts"
    return 1
}

# Function to run smoke tests
run_smoke_tests() {
    local env=$1
    
    log "Running smoke tests for $env..."
    
    cd "$PROJECT_ROOT"
    
    if [ "$env" = "staging" ]; then
        npx playwright test --config=playwright.staging.config.ts
    else
        npx playwright test --config=playwright.production.config.ts
    fi
    
    log "Smoke tests passed for $env"
}

# Function to send notifications
send_notification() {
    local status=$1
    local env=$2
    local version=$3
    
    local message
    if [ "$status" = "success" ]; then
        message="✅ Deployment of version $version to $env completed successfully"
    else
        message="❌ Deployment of version $version to $env failed"
    fi
    
    # Send Slack notification
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || true
    fi
    
    # Send email notification
    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "Pet Card Generator Deployment" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
    
    log "Notification sent: $message"
}

# Main deployment function
perform_deployment() {
    local env=$1
    local version=$2
    local force=$3
    
    log "Starting deployment of version $version to $env"
    
    # Confirmation prompt
    if [ "$force" != "true" ]; then
        echo -e "${YELLOW}Are you sure you want to deploy version $version to $env? (y/N)${NC}"
        read -r confirmation
        if [[ ! $confirmation =~ ^[Yy]$ ]]; then
            log "Deployment cancelled by user"
            exit 0
        fi
    fi
    
    # Check prerequisites
    check_prerequisites "$env"
    
    # Run tests
    run_tests
    
    # Build application
    local package_file
    package_file=$(build_application "$version")
    
    # Create backup
    create_backup "$env"
    
    # Deploy based on environment
    if [ "$env" = "staging" ]; then
        deploy_staging "$version" "$package_file"
    else
        deploy_production "$version" "$package_file"
    fi
    
    # Health checks
    if health_check "$env" && run_smoke_tests "$env"; then
        log "Deployment of version $version to $env completed successfully"
        send_notification "success" "$env" "$version"
    else
        error "Deployment verification failed"
        send_notification "failure" "$env" "$version"
        
        # Auto-rollback on production failure
        if [ "$env" = "production" ]; then
            warning "Initiating automatic rollback..."
            "$SCRIPT_DIR/rollback.sh" --environment production --force
        fi
        
        exit 1
    fi
    
    # Cleanup
    rm -f "$package_file"
}

# Parse command line arguments
ENVIRONMENT=""
VERSION=""
FORCE=false
ROLLBACK=false
SKIP_TESTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -r|--rollback)
            ROLLBACK=true
            shift
            ;;
        -s|--skip-tests)
            SKIP_TESTS=true
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
    
    log "Pet Card Generator Deployment Script Started"
    
    # Validate inputs
    if [ -z "$ENVIRONMENT" ]; then
        error "Environment is required. Use --environment"
        usage
        exit 1
    fi
    
    validate_environment "$ENVIRONMENT"
    
    if [ "$ROLLBACK" = "true" ]; then
        log "Initiating rollback for $ENVIRONMENT"
        "$SCRIPT_DIR/rollback.sh" --environment "$ENVIRONMENT" --force
        exit 0
    fi
    
    if [ -z "$VERSION" ]; then
        error "Version is required for deployment. Use --version"
        usage
        exit 1
    fi
    
    # Check if running with proper permissions
    if [ "$EUID" -eq 0 ]; then
        warning "Running as root is not recommended"
    fi
    
    # Perform deployment
    perform_deployment "$ENVIRONMENT" "$VERSION" "$FORCE"
    
    log "Deployment script completed successfully"
}

# Run main function
main "$@"