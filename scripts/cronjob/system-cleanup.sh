#!/bin/bash
# System Cleanup Script - Enhanced Version for DMI IoT Device

LOG_FILE="/home/dmi/inam/logs/system-cleanup.log"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create log directory if it doesn't exist
mkdir -p /home/dmi/inam/logs

log_message "========== Starting system cleanup =========="

# 1. Clean PM2 logs
log_message "Cleaning PM2 logs..."
pm2 flush > /dev/null 2>&1

# 2. Clean system journal (keep only last 3 days)
log_message "Cleaning journal logs (keeping 3 days)..."
sudo journalctl --vacuum-time=3d 2>&1 | grep -v "No entries deleted" >> "$LOG_FILE"

# 3. Clean apt cache and autoremove unused packages
log_message "Cleaning apt cache and removing unused packages..."
sudo apt-get clean 2>&1 >> "$LOG_FILE"
sudo apt-get autoremove -y 2>&1 | tail -5 >> "$LOG_FILE"

# 4. Clean npm cache
log_message "Cleaning npm cache..."
npm cache clean --force 2>&1 | grep -v "npm WARN" >> "$LOG_FILE"

# 5. Clean temporary files
log_message "Cleaning temporary files older than 1 day..."
TEMP_COUNT=$(find /tmp /var/tmp -type f -atime +1 2>/dev/null | wc -l)
find /tmp -type f -atime +1 -delete 2>/dev/null
find /var/tmp -type f -atime +1 -delete 2>/dev/null
log_message "Removed $TEMP_COUNT temporary files"

# 6. Clean old INAM logs (keep 7 days) and truncate large logs
log_message "Cleaning INAM logs older than 7 days..."
INAM_COUNT=0
for dir in ~/inam/logs ~/inam/logs/startup ~/inam/logs/nodm-setup; do
    if [ -d "$dir" ]; then
        count=$(find "$dir" -type f -name "*.log" -mtime +7 2>/dev/null | wc -l)
        find "$dir" -type f -name "*.log" -mtime +7 -delete 2>/dev/null
        INAM_COUNT=$((INAM_COUNT + count))
        
        # Truncate logs larger than 100MB
        find "$dir" -type f -name "*.log" -size +100M | while read logfile; do
            size=$(du -h "$logfile" | cut -f1)
            log_message "Truncating large log: $logfile (was $size)"
            tail -n 10000 "$logfile" > "$logfile.tmp" && mv "$logfile.tmp" "$logfile"
        done
    fi
done
log_message "Removed $INAM_COUNT old INAM log files"

# 7. Clean IoT device logs (keep 7 days)
log_message "Cleaning IoT device logs older than 7 days..."
if [ -d ~/inam/software/2500i-iot-device/logs ]; then
    IOT_COUNT=$(find ~/inam/software/2500i-iot-device/logs -type f -name "*.log" -mtime +7 2>/dev/null | wc -l)
    find ~/inam/software/2500i-iot-device/logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null
    log_message "Removed $IOT_COUNT old IoT device log files"
fi

# 8. Clean npm and cache directories
log_message "Cleaning npm and user cache..."
find ~/.npm -type f -atime +7 -delete 2>/dev/null
find ~/.cache -type f -mtime +7 -delete 2>/dev/null
find ~/.cache/thumbnails -type f -delete 2>/dev/null

# 9. Clean VS Code server logs and old versions
if [ -d ~/.vscode-server ]; then
    log_message "Cleaning VS Code server..."
    find ~/.vscode-server -name "*.log" -type f -delete 2>/dev/null
    
    # Remove old VS Code server versions (keep only the 2 most recent)
    if [ -d ~/.vscode-server/cli/servers ]; then
        cd ~/.vscode-server/cli/servers
        ls -t | tail -n +3 | while read old_version; do
            if [ -d "$old_version" ]; then
                size=$(du -sh "$old_version" | cut -f1)
                log_message "Removing old VS Code server version: $old_version ($size)"
                rm -rf "$old_version"
            fi
        done
        cd - > /dev/null
    fi
fi

# 10. Clean Mozilla/Firefox cache if exists
if [ -d ~/.mozilla ]; then
    log_message "Cleaning Mozilla cache..."
    find ~/.mozilla -name "*.sqlite" -size +10M -delete 2>/dev/null
    find ~/.mozilla -path "*/Cache/*" -type f -delete 2>/dev/null
    find ~/.mozilla -path "*/cache2/*" -type f -delete 2>/dev/null
fi

# 11. Clean old snap versions
log_message "Cleaning snap packages..."
sudo rm -rf /var/lib/snapd/cache/* 2>/dev/null
if command -v snap >/dev/null 2>&1; then
    SNAP_COUNT=0
    snap list --all | awk '/disabled/{print $1, $3}' |
    while read snapname revision; do
        log_message "Removing disabled snap: $snapname revision $revision"
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null
        SNAP_COUNT=$((SNAP_COUNT + 1))
    done
fi

# 12. Truncate large system logs
log_message "Checking and truncating large system logs..."
for logfile in /var/log/syslog /var/log/kern.log /var/log/auth.log /var/log/dpkg.log /var/log/apt/history.log; do
    if [ -f "$logfile" ]; then
        size=$(wc -l < "$logfile" 2>/dev/null || echo 0)
        if [ "$size" -gt 10000 ]; then
            log_message "Truncating $logfile (was $size lines)..."
            sudo tail -n 1000 "$logfile" > "/tmp/$(basename $logfile).tmp" && sudo mv "/tmp/$(basename $logfile).tmp" "$logfile"
        fi
    fi
done

# 13. Clean old rotated logs
log_message "Removing old rotated logs..."
ROTATED_COUNT=$(sudo find /var/log -type f \( -name "*.gz" -o -name "*.1" -o -name "*.old" -o -name "*.bak" \) -mtime +7 2>/dev/null | wc -l)
sudo find /var/log -type f \( -name "*.gz" -o -name "*.1" -o -name "*.old" -o -name "*.bak" \) -mtime +7 -delete 2>/dev/null
log_message "Removed $ROTATED_COUNT old rotated log files"

# 14. Clean Docker if installed
if command -v docker >/dev/null 2>&1; then
    log_message "Cleaning Docker system..."
    docker system prune -f --volumes 2>&1 | grep -E "Total reclaimed|deleted" >> "$LOG_FILE"
fi

# 15. Clean package manager cache
log_message "Cleaning package manager cache..."
sudo find /var/lib/apt/lists -type f -mtime +7 -delete 2>/dev/null
sudo rm -rf /var/cache/apt/archives/*.deb 2>/dev/null

# 16. Clean control folder logs if they exist
if [ -d /home/dmi/control ]; then
    log_message "Cleaning control folder logs..."
    find /home/dmi/control -name "*.log" -type f -mtime +7 -delete 2>/dev/null
fi

# 17. Clean up idle database connections
log_message "Cleaning up idle database connections..."
if sudo -u postgres psql -t -c "SELECT 1;" >/dev/null 2>&1; then
    IDLE_DB_COUNT=$(sudo -u postgres psql -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = 'dm' AND state = 'idle';" 2>/dev/null | tr -d ' ')
    if [ "$IDLE_DB_COUNT" -gt "0" ]; then
        TERMINATED_DB=$(sudo -u postgres psql -t -c "
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = 'dm' 
            AND state = 'idle' 
            AND pid <> pg_backend_pid()
            AND state_change < NOW() - INTERVAL '30 seconds';" 2>/dev/null | grep -c 't')
        log_message "Terminated $TERMINATED_DB idle database connections"
    else
        log_message "No idle database connections found"
    fi
else
    log_message "PostgreSQL not accessible, skipping database cleanup"
fi

# 18. Report disk usage
log_message "Disk usage after cleanup:"
df -h / | grep -E "^/|Filesystem" >> "$LOG_FILE"

# Show space freed
AFTER_USED=$(df / | tail -1 | awk '{print $3}')
log_message "Current disk usage: $(df -h / | tail -1 | awk '{print $5}') used"

# Show largest directories
log_message "Largest directories:"
du -h --max-depth=2 /home 2>/dev/null | sort -rh | head -5 >> "$LOG_FILE"

# Keep only last 1000 lines of this cleanup log
if [ -f "$LOG_FILE" ]; then
    tail -n 1000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi

log_message "========== Cleanup completed =========="