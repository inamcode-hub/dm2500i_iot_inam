# DMI Scripts Documentation

This directory contains all system scripts for the DM2500i device. Scripts are organized by their purpose and execution method.

## Directory Structure

```
/home/dmi/inam/scripts/
├── cronjob/                 # Scripts executed by cron scheduler
│   ├── cleanup-db-connections.sh
│   ├── cleanup-old-startup.sh
│   └── system-cleanup.sh
├── startup/                 # Scripts for system startup and kiosk mode
│   ├── start-dm2500i.sh
│   ├── setup-unified-kiosk.sh
│   ├── exit-kiosk.sh
│   ├── dm2500i-kiosk.service
│   └── README.md
└── README.md               # This file
```

## Script Categories

### Startup Scripts (`/startup/`)
Scripts related to system boot, kiosk mode, and service management.  
See `/home/dmi/inam/scripts/startup/README.md` for detailed documentation.

**Key scripts**:
- `start-dm2500i.sh` - Main startup orchestration (now uses Firefox ESR and starts both PM2 services)
- `setup-unified-kiosk.sh` - Initial system configuration
- `exit-kiosk.sh` - Exit kiosk for maintenance
- `dm2500i-kiosk.service` - Systemd service definition

### Cron Jobs (`/cronjob/`)
Scripts executed automatically by the cron scheduler for system maintenance.

## Cron Job Scripts

All scripts in the `cronjob/` folder are executed automatically by cron scheduler.

### cronjob/system-cleanup.sh
**Purpose**: Comprehensive system maintenance and cleanup  
**Schedule**: Daily at 2:00 AM  
**Functions**:
- Cleans PM2 logs
- Truncates system journals (keeps 3 days)
- Removes apt cache and unused packages
- Cleans npm cache
- Removes old temporary files
- Truncates large log files (>100MB)
- Cleans old INAM logs (>7 days)
- Removes old VS Code server versions
- Cleans browser cache
- Removes disabled snap packages
- **Cleans idle database connections (>30 seconds)**
- Reports disk usage
- Logs to: `/home/dmi/inam/logs/system-cleanup.log`

### cronjob/cleanup-db-connections.sh
**Purpose**: Regular cleanup of idle PostgreSQL connections  
**Schedule**: Every 15 minutes  
**Functions**:
- Checks PostgreSQL service status
- Counts total and idle connections
- Terminates connections idle for >1 hour
- Only affects 'dm' database connections
- Preserves active connections
- Auto-rotates log file at 1000 lines
- Logs to: `/home/dmi/inam/logs/db-cleanup-*.log`

### cronjob/cleanup-old-startup.sh
**Purpose**: Removes old startup log files  
**Schedule**: Manual or as needed  
**Functions**:
- Cleans startup logs older than specified days
- Prevents log directory from filling up

## Current Cron Schedule

View current cron jobs:
```bash
crontab -l
```

Current schedule:
```
0 2 * * * /home/dmi/inam/scripts/cronjob/system-cleanup.sh >> /home/dmi/iot-cleanup.log 2>&1
*/15 * * * * /home/dmi/inam/scripts/cronjob/cleanup-db-connections.sh
```

## Database Connection Management

The system uses a multi-layered approach to prevent database connection leaks:

1. **Periodic Cleanup (Every 15 minutes)**:
   - Runs via cron
   - Cleans connections idle >1 hour
   - No service interruption
   - Logged for monitoring

2. **Daily Cleanup (2 AM)**:
   - Part of system-cleanup.sh
   - More aggressive: cleans connections idle >30 seconds
   - Runs during low-usage hours

3. **Application Level**:
   - PM2 API uses connection pooling (max 5 connections)
   - Pool configuration in `/home/dmi/inam/software/2500i_api_ui/lib/db/pool.js`

## Log Files

All scripts generate detailed logs for troubleshooting:

- **Startup logs**: `/home/dmi/inam/logs/start-dm2500i-*.log`
- **System cleanup**: `/home/dmi/inam/logs/system-cleanup.log`
- **DB cleanup**: `/home/dmi/inam/logs/db-cleanup-*.log`
- **Cron output**: `/home/dmi/iot-cleanup.log`

## Manual Execution

To run any script manually:
```bash
# Startup script
/home/dmi/inam/scripts/startup/start-dm2500i.sh

# Database cleanup
/home/dmi/inam/scripts/cronjob/cleanup-db-connections.sh

# Full system cleanup
/home/dmi/inam/scripts/cronjob/system-cleanup.sh

# Exit kiosk mode
/home/dmi/inam/scripts/startup/exit-kiosk.sh
```

## Troubleshooting

### Check if scripts are running:
```bash
# View cron job execution
grep CRON /var/log/syslog | tail -20

# Check specific script logs
tail -f /home/dmi/inam/logs/db-cleanup-*.log
tail -f /home/dmi/inam/logs/system-cleanup.log
```

### Database connection issues:
```bash
# Check current connections
sudo -u postgres psql -c "SELECT count(*), state FROM pg_stat_activity WHERE datname='dm' GROUP BY state;"

# Manual cleanup
sudo /home/dmi/inam/scripts/cronjob/cleanup-db-connections.sh
```

### Modify cron schedule:
```bash
crontab -e
# Edit the schedule and save
```

## Script Permissions

All scripts should be executable:
```bash
chmod +x /home/dmi/inam/scripts/startup/*.sh
chmod +x /home/dmi/inam/scripts/cronjob/*.sh
```

## Adding New Cron Jobs

1. Create script in `/home/dmi/inam/scripts/cronjob/`
2. Make it executable: `chmod +x script.sh`
3. Add to crontab: `crontab -e`
4. Use format: `MIN HOUR DAY MONTH WEEKDAY /path/to/script.sh`

Example schedules:
- `*/5 * * * *` - Every 5 minutes
- `0 */4 * * *` - Every 4 hours
- `30 3 * * 0` - Every Sunday at 3:30 AM
- `@reboot` - On system startup

## Security Notes

- All scripts run as user 'dmi'
- Database operations use sudo for postgres user
- Logs may contain sensitive information
- Keep scripts permissions secure (755 recommended)