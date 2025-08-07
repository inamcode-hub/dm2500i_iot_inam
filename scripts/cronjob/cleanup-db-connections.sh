#!/bin/bash
# Database Connection Cleanup Script
# Runs periodically via cron to clean idle connections

LOG_DIR="/home/dmi/inam/logs"
LOG_FILE="$LOG_DIR/db-cleanup-$(date +%Y%m%d).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Only run cleanup if PostgreSQL is running
if ! systemctl is-active --quiet postgresql; then
    log "PostgreSQL is not running, skipping cleanup"
    exit 0
fi

# Get connection stats before cleanup
TOTAL_BEFORE=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'dm';" 2>/dev/null | tr -d ' ')
IDLE_BEFORE=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'dm' AND state = 'idle';" 2>/dev/null | tr -d ' ')

# Only log if there are connections
if [ "$TOTAL_BEFORE" -gt "0" ]; then
    log "Connections before cleanup - Total: $TOTAL_BEFORE, Idle: $IDLE_BEFORE"
    
    # Terminate idle connections older than 1 hour
    TERMINATED=$(sudo -u postgres psql -t -c "
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE datname = 'dm' 
        AND state = 'idle' 
        AND pid <> pg_backend_pid()
        AND state_change < NOW() - INTERVAL '1 hour';" 2>/dev/null | grep -c 't')
    
    if [ "$TERMINATED" -gt "0" ]; then
        # Get stats after cleanup
        TOTAL_AFTER=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'dm';" 2>/dev/null | tr -d ' ')
        IDLE_AFTER=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'dm' AND state = 'idle';" 2>/dev/null | tr -d ' ')
        
        log "Terminated $TERMINATED idle connections"
        log "Connections after cleanup - Total: $TOTAL_AFTER, Idle: $IDLE_AFTER"
    fi
fi

# Rotate log file if it gets too large (keep last 1000 lines)
if [ -f "$LOG_FILE" ] && [ $(wc -l < "$LOG_FILE") -gt 1000 ]; then
    tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
    log "Log file rotated"
fi