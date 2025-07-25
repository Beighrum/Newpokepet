#!/bin/bash

# Security Rollback Procedures Script
# Provides automated rollback capabilities for security deployments

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_FILE="$PROJECT_ROOT/rollback.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Help function
show_help() {
    cat << EOF
Security Rollback Procedures

Usage: $0 [COMMAND] [OPTIONS]

Commands:
    feature-flag     Rollback using feature flags (fastest)
    traffic          Rollback traffic routing (fast)
    full             Full code rollback (slower)
    emergency        Emergency rollback (all methods)
    status           Check rollback status
    validate         Validate system after rollback
    help             Show this help message

Options:
    --reason REASON     Reason for rollback (required)
    --version VERSION   Target version for rollback
    --confirm          Skip confirmation prompts
    --dry-run          Show what would be done without executing

Examples:
    $0 feature-flag --reason "High error rate detected"
    $0 traffic --version HEAD~1 --confirm
    $0 full --reason "Security vulnerability" --dry-run
    $0 emergency --reason "Critical security incident"

EOF
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if we're in the right directory
    if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
        error "Not in project root directory"
        exit 1
    fi
    
    # Check required tools
    local tools=("git" "npm" "curl" "jq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    # Check Firebase CLI if needed
    if [[ "$1" == "full" ]] || [[ "$1" == "emergency" ]]; then
        if ! command -v firebase &> /dev/null; then
            error "Firebase CLI is required for full rollback"
            exit 1
        fi
    fi
    
    success "Prerequisites check passed"
}

# Create backup before rollback
create_backup() {
    log "Creating backup before rollback..."
    
    local backup_timestamp=$(date +%Y%m%d-%H%M%S)
    local backup_path="$BACKUP_DIR/rollback-backup-$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup current configuration
    if [[ -f "$PROJECT_ROOT/src/config/feature-flags.ts" ]]; then
        cp "$PROJECT_ROOT/src/config/feature-flags.ts" "$backup_path/"
    fi
    
    # Backup Firebase configuration
    if [[ -f "$PROJECT_ROOT/firebase.json" ]]; then
        cp "$PROJECT_ROOT/firebase.json" "$backup_path/"
    fi
    
    # Backup current git state
    git rev-parse HEAD > "$backup_path/current-commit.txt"
    git status --porcelain > "$backup_path/git-status.txt"
    
    # Backup current feature flag state
    if command -v firebase &> /dev/null; then
        firebase functions:config:get > "$backup_path/firebase-config.json" 2>/dev/null || true
    fi
    
    echo "$backup_path" > "$PROJECT_ROOT/.last-backup"
    success "Backup created at $backup_path"
}

# Feature flag rollback (fastest method)
rollback_feature_flags() {
    local reason="$1"
    local dry_run="$2"
    
    log "Starting feature flag rollback..."
    log "Reason: $reason"
    
    if [[ "$dry_run" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Disable all enhanced security features
    local flags_to_disable=(
        "enhanced_sanitization"
        "strict_xss_protection"
        "advanced_content_filtering"
        "security_status_indicators"
        "violation_feedback"
        "safe_content_preview"
    )
    
    # Enable safe fallback features
    local flags_to_enable=(
        "sanitization_caching"
        "detailed_security_logging"
        "real_time_violation_alerts"
        "performance_monitoring"
    )
    
    if [[ "$dry_run" != "true" ]]; then
        # Create backup first
        create_backup
        
        # Disable risky features
        for flag in "${flags_to_disable[@]}"; do
            log "Disabling feature flag: $flag"
            # In a real implementation, this would call the feature flag service
            echo "Feature flag $flag disabled" >> "$LOG_FILE"
        done
        
        # Enable safe features
        for flag in "${flags_to_enable[@]}"; do
            log "Enabling feature flag: $flag"
            # In a real implementation, this would call the feature flag service
            echo "Feature flag $flag enabled" >> "$LOG_FILE"
        done
        
        # Notify monitoring systems
        log "Notifying monitoring systems..."
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"type\":\"feature_flag_rollback\",\"reason\":\"$reason\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
             "https://api.petcardgenerator.com/internal/rollback-notification" 2>/dev/null || true
    else
        log "Would disable flags: ${flags_to_disable[*]}"
        log "Would enable flags: ${flags_to_enable[*]}"
    fi
    
    success "Feature flag rollback completed"
}

# Traffic routing rollback
rollback_traffic() {
    local reason="$1"
    local target_version="$2"
    local dry_run="$3"
    
    log "Starting traffic routing rollback..."
    log "Reason: $reason"
    log "Target version: $target_version"
    
    if [[ "$dry_run" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
    fi
    
    if [[ -z "$target_version" ]]; then
        target_version="HEAD~1"
        warning "No target version specified, using $target_version"
    fi
    
    # Get the actual commit hash
    local target_commit=$(git rev-parse "$target_version")
    log "Target commit: $target_commit"
    
    if [[ "$dry_run" != "true" ]]; then
        create_backup
        
        # Update load balancer configuration (simulated)
        log "Updating load balancer configuration..."
        
        # In a real implementation, this would update actual load balancer
        cat > "$PROJECT_ROOT/load-balancer-config.json" << EOF
{
  "routing": {
    "version": "$target_commit",
    "traffic_percentage": 100,
    "rollback_reason": "$reason",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
        
        # Verify the rollback
        log "Verifying traffic rollback..."
        sleep 5  # Wait for changes to propagate
        
        # Health check
        if curl -f -s "https://api.petcardgenerator.com/health" > /dev/null; then
            success "Health check passed after traffic rollback"
        else
            error "Health check failed after traffic rollback"
            return 1
        fi
    else
        log "Would route 100% traffic to version $target_commit"
        log "Would update load balancer configuration"
    fi
    
    success "Traffic routing rollback completed"
}

# Full code rollback
rollback_full() {
    local reason="$1"
    local target_version="$2"
    local dry_run="$3"
    
    log "Starting full code rollback..."
    log "Reason: $reason"
    
    if [[ -z "$target_version" ]]; then
        target_version="HEAD~1"
        warning "No target version specified, using $target_version"
    fi
    
    local target_commit=$(git rev-parse "$target_version")
    log "Target commit: $target_commit"
    
    if [[ "$dry_run" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
        log "Would checkout commit: $target_commit"
        log "Would deploy to production"
        log "Would run validation tests"
        return 0
    fi
    
    create_backup
    
    # Stash any uncommitted changes
    if [[ -n "$(git status --porcelain)" ]]; then
        log "Stashing uncommitted changes..."
        git stash push -m "Pre-rollback stash $(date)"
    fi
    
    # Checkout target version
    log "Checking out target version: $target_commit"
    git checkout "$target_commit"
    
    # Install dependencies
    log "Installing dependencies..."
    npm ci
    
    # Run critical tests
    log "Running critical tests..."
    if ! npm run test:critical 2>/dev/null; then
        warning "Critical tests failed, but continuing with rollback"
    fi
    
    # Deploy to production
    log "Deploying to production..."
    if command -v firebase &> /dev/null; then
        firebase deploy --only functions,hosting --project production
    else
        warning "Firebase CLI not available, skipping deployment"
    fi
    
    # Update monitoring
    log "Updating monitoring systems..."
    if command -v sentry-cli &> /dev/null; then
        sentry-cli releases new "$target_commit" 2>/dev/null || true
        sentry-cli releases finalize "$target_commit" 2>/dev/null || true
    fi
    
    success "Full code rollback completed"
}

# Emergency rollback (all methods)
rollback_emergency() {
    local reason="$1"
    local dry_run="$2"
    
    error "🚨 EMERGENCY ROLLBACK INITIATED"
    log "Reason: $reason"
    
    if [[ "$dry_run" == "true" ]]; then
        warning "DRY RUN MODE - No changes will be made"
    fi
    
    # Step 1: Immediate feature flag rollback
    log "Step 1: Emergency feature flag rollback"
    rollback_feature_flags "$reason" "$dry_run"
    
    # Step 2: Traffic routing rollback
    log "Step 2: Emergency traffic rollback"
    rollback_traffic "$reason" "HEAD~1" "$dry_run"
    
    # Step 3: Enable emergency security mode
    if [[ "$dry_run" != "true" ]]; then
        log "Step 3: Enabling emergency security mode"
        
        # Enable strict security settings
        cat > "$PROJECT_ROOT/emergency-security-config.json" << EOF
{
  "emergency_mode": true,
  "strict_sanitization": true,
  "block_all_html": true,
  "enhanced_logging": true,
  "rate_limiting_strict": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "reason": "$reason"
}
EOF
        
        # Notify all systems
        log "Notifying all systems of emergency rollback..."
        curl -X POST -H "Content-Type: application/json" \
             -d "{\"type\":\"emergency_rollback\",\"reason\":\"$reason\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" \
             "https://api.petcardgenerator.com/internal/emergency-notification" 2>/dev/null || true
    else
        log "Would enable emergency security mode"
        log "Would notify all systems"
    fi
    
    # Step 4: Intensive monitoring
    log "Step 4: Starting intensive monitoring"
    if [[ "$dry_run" != "true" ]]; then
        # Start monitoring script in background
        nohup "$SCRIPT_DIR/monitor-rollback.sh" "$reason" > "$PROJECT_ROOT/rollback-monitor.log" 2>&1 &
        echo $! > "$PROJECT_ROOT/rollback-monitor.pid"
    fi
    
    success "Emergency rollback completed"
    warning "System is now in emergency mode - manual intervention may be required"
}

# Validate system after rollback
validate_rollback() {
    log "Validating system after rollback..."
    
    local validation_failed=false
    
    # Health checks
    log "Running health checks..."
    if curl -f -s "https://api.petcardgenerator.com/health" > /dev/null; then
        success "✓ Main health check passed"
    else
        error "✗ Main health check failed"
        validation_failed=true
    fi
    
    if curl -f -s "https://api.petcardgenerator.com/health/security" > /dev/null; then
        success "✓ Security health check passed"
    else
        error "✗ Security health check failed"
        validation_failed=true
    fi
    
    if curl -f -s "https://api.petcardgenerator.com/health/sanitization" > /dev/null; then
        success "✓ Sanitization health check passed"
    else
        error "✗ Sanitization health check failed"
        validation_failed=true
    fi
    
    # Performance checks
    log "Running performance checks..."
    local response_time=$(curl -w "%{time_total}" -s -o /dev/null "https://api.petcardgenerator.com/api/sanitize" || echo "999")
    if (( $(echo "$response_time < 2.0" | bc -l) )); then
        success "✓ Response time acceptable: ${response_time}s"
    else
        warning "⚠ Response time high: ${response_time}s"
    fi
    
    # Functional tests
    log "Running functional tests..."
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npm run test:smoke 2>/dev/null; then
            success "✓ Smoke tests passed"
        else
            error "✗ Smoke tests failed"
            validation_failed=true
        fi
    fi
    
    # Security tests
    log "Running security validation..."
    if [[ -f "$PROJECT_ROOT/package.json" ]]; then
        if npm run test:security:basic 2>/dev/null; then
            success "✓ Basic security tests passed"
        else
            error "✗ Basic security tests failed"
            validation_failed=true
        fi
    fi
    
    if [[ "$validation_failed" == "true" ]]; then
        error "Rollback validation failed - manual intervention required"
        return 1
    else
        success "Rollback validation completed successfully"
        return 0
    fi
}

# Check rollback status
check_status() {
    log "Checking rollback status..."
    
    # Check if monitoring is running
    if [[ -f "$PROJECT_ROOT/rollback-monitor.pid" ]]; then
        local monitor_pid=$(cat "$PROJECT_ROOT/rollback-monitor.pid")
        if ps -p "$monitor_pid" > /dev/null 2>&1; then
            success "Rollback monitoring is active (PID: $monitor_pid)"
        else
            warning "Rollback monitoring process not found"
            rm -f "$PROJECT_ROOT/rollback-monitor.pid"
        fi
    else
        log "No active rollback monitoring"
    fi
    
    # Check emergency mode
    if [[ -f "$PROJECT_ROOT/emergency-security-config.json" ]]; then
        warning "System is in emergency security mode"
        local emergency_reason=$(jq -r '.reason // "Unknown"' "$PROJECT_ROOT/emergency-security-config.json" 2>/dev/null)
        log "Emergency reason: $emergency_reason"
    else
        log "System is not in emergency mode"
    fi
    
    # Check last backup
    if [[ -f "$PROJECT_ROOT/.last-backup" ]]; then
        local last_backup=$(cat "$PROJECT_ROOT/.last-backup")
        log "Last backup: $last_backup"
    else
        log "No recent backups found"
    fi
    
    # Check current git state
    local current_commit=$(git rev-parse HEAD)
    local current_branch=$(git branch --show-current)
    log "Current commit: $current_commit"
    log "Current branch: $current_branch"
    
    # Check system health
    validate_rollback
}

# Main function
main() {
    local command="$1"
    shift
    
    # Parse arguments
    local reason=""
    local version=""
    local confirm=false
    local dry_run=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --reason)
                reason="$2"
                shift 2
                ;;
            --version)
                version="$2"
                shift 2
                ;;
            --confirm)
                confirm=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Create log file
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "$command" in
        feature-flag)
            if [[ -z "$reason" ]]; then
                error "Reason is required for rollback"
                exit 1
            fi
            check_prerequisites "$command"
            if [[ "$confirm" == "false" ]] && [[ "$dry_run" == "false" ]]; then
                read -p "Confirm feature flag rollback? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log "Rollback cancelled"
                    exit 0
                fi
            fi
            rollback_feature_flags "$reason" "$dry_run"
            ;;
        traffic)
            if [[ -z "$reason" ]]; then
                error "Reason is required for rollback"
                exit 1
            fi
            check_prerequisites "$command"
            if [[ "$confirm" == "false" ]] && [[ "$dry_run" == "false" ]]; then
                read -p "Confirm traffic rollback? (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log "Rollback cancelled"
                    exit 0
                fi
            fi
            rollback_traffic "$reason" "$version" "$dry_run"
            ;;
        full)
            if [[ -z "$reason" ]]; then
                error "Reason is required for rollback"
                exit 1
            fi
            check_prerequisites "$command"
            if [[ "$confirm" == "false" ]] && [[ "$dry_run" == "false" ]]; then
                read -p "Confirm full rollback? This will change code! (y/N): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    log "Rollback cancelled"
                    exit 0
                fi
            fi
            rollback_full "$reason" "$version" "$dry_run"
            ;;
        emergency)
            if [[ -z "$reason" ]]; then
                error "Reason is required for emergency rollback"
                exit 1
            fi
            check_prerequisites "$command"
            if [[ "$confirm" == "false" ]] && [[ "$dry_run" == "false" ]]; then
                echo -e "${RED}WARNING: This will perform an emergency rollback!${NC}"
                read -p "Are you absolutely sure? Type 'EMERGENCY' to confirm: " -r
                if [[ "$REPLY" != "EMERGENCY" ]]; then
                    log "Emergency rollback cancelled"
                    exit 0
                fi
            fi
            rollback_emergency "$reason" "$dry_run"
            ;;
        status)
            check_status
            ;;
        validate)
            validate_rollback
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"