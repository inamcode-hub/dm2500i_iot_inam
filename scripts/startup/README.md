# Startup Scripts Documentation

This directory contains all scripts related to system startup and kiosk mode configuration for the DM2500i device.

## Scripts Overview

### start-dm2500i.sh
**Purpose**: Main unified startup script for the entire system  
**Called by**: systemd service (dm2500i-kiosk.service)  
**Key Functions**:
- Handles Plymouth boot splash transition smoothly
- Starts X server on VT7 if not already running
- Shows DMI logo splash screen during startup
- Launches DM520 controller binary
- Starts PM2-managed API service on port 3002
- Opens Firefox ESR in kiosk mode
- Monitors and maintains all processes

**Important Variables**:
- `PLYMOUTH_BG_COLOR="#203967"` - Background color matching boot theme
- Logs to: `/home/dmi/inam/logs/start-dm2500i-*.log`

### setup-unified-kiosk.sh
**Purpose**: Initial system setup and configuration  
**Usage**: Run once during initial device setup  
**Functions**:
- Installs required packages (nodm, unclutter, feh, etc.)
- Configures automatic login via systemd
- Sets up Plymouth boot splash theme
- Creates and enables systemd service
- Configures GRUB for silent boot
- Sets up proper permissions

**Warning**: This script makes system-level changes. Run only during initial setup.

### exit-kiosk.sh
**Purpose**: Safely exit kiosk mode for maintenance  
**Usage**: Manual execution when maintenance is needed  
**Functions**:
- Stops Firefox kiosk browser
- Kills DM520 controller
- Stops PM2 services
- Returns to normal desktop environment
- Useful for debugging or system maintenance

### dm2500i-kiosk.service
**Purpose**: Systemd service definition for automatic startup  
**Location**: Copy installed to `/etc/systemd/system/`  
**Key Settings**:
- Runs as user 'dmi'
- Starts after network and PostgreSQL
- Uses TTY7 for display
- Auto-restarts on failure
- Resource limits: 80% CPU, 2GB memory

## Startup Flow

1. **System Boot**: GRUB → Plymouth (shows logo)
2. **Systemd Target**: Reaches graphical.target
3. **Service Start**: dm2500i-kiosk.service launches
4. **Main Script**: start-dm2500i.sh executes
5. **Component Order**:
   - PostgreSQL started
   - X server on VT7
   - Splash screen shown
   - DM520 controller
   - PM2 API service
   - Firefox kiosk (after API ready)

## Log Files

All startup activities are logged:
- **Main startup**: `/home/dmi/inam/logs/start-dm2500i-YYYYMMDD-HHMMSS.log`
- **Service logs**: `journalctl -u dm2500i-kiosk.service`
- **PM2 logs**: `pm2 logs dm2500i-api`

## Common Commands

### Service Management
```bash
# Check service status
sudo systemctl status dm2500i-kiosk.service

# Start/stop/restart service
sudo systemctl start dm2500i-kiosk.service
sudo systemctl stop dm2500i-kiosk.service
sudo systemctl restart dm2500i-kiosk.service

# View service logs
journalctl -u dm2500i-kiosk.service -f

# Enable/disable autostart
sudo systemctl enable dm2500i-kiosk.service
sudo systemctl disable dm2500i-kiosk.service
```

### Manual Testing
```bash
# Run startup script manually
/home/dmi/inam/scripts/startup/start-dm2500i.sh

# Exit kiosk mode
/home/dmi/inam/scripts/startup/exit-kiosk.sh

# Check if components are running
ps aux | grep -E "(DM520|firefox|pm2|node)" | grep -v grep
```

### Update Service File
```bash
# After modifying dm2500i-kiosk.service
sudo cp /home/dmi/inam/scripts/startup/dm2500i-kiosk.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart dm2500i-kiosk.service
```

## Troubleshooting

### Service won't start
1. Check logs: `journalctl -u dm2500i-kiosk.service -n 50`
2. Verify PostgreSQL is running: `systemctl status postgresql`
3. Check script permissions: `ls -la /home/dmi/inam/scripts/startup/`
4. Test manually: `/home/dmi/inam/scripts/startup/start-dm2500i.sh`

### Black screen on boot
1. Check X server: `ps aux | grep Xorg`
2. Verify VT7 is free: `who | grep tty7`
3. Check Plymouth: `plymouth --ping`
4. Review startup log: `tail -f /home/dmi/inam/logs/start-dm2500i-*.log`

### Firefox won't start
1. Verify API is running: `curl http://localhost:3002`
2. Check PM2: `pm2 list`
3. Look for port conflicts: `sudo lsof -i :3002`
4. Check Firefox process: `ps aux | grep firefox`

### Components keep restarting
1. Check system resources: `top` or `htop`
2. Review PM2 logs: `pm2 logs dm2500i-api`
3. Check for crashes in startup log
4. Verify database connections: `sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='dm';"`

## Environment Variables

The service sets these environment variables:
- `HOME=/home/dmi`
- `USER=dmi`
- `PATH` includes Node.js 18.17.1 from nvm

## Permissions

All scripts should have execute permissions:
```bash
chmod +x /home/dmi/inam/scripts/startup/*.sh
```

Service file should be owned by root:
```bash
sudo chown root:root /etc/systemd/system/dm2500i-kiosk.service
sudo chmod 644 /etc/systemd/system/dm2500i-kiosk.service
```

## Dependencies

Required packages (installed by setup script):
- X server (xorg)
- Firefox ESR
- Node.js 18.17.1 (via nvm)
- PM2 (global npm package)
- PostgreSQL
- feh (image viewer)
- unclutter (hide mouse cursor)
- Plymouth (boot splash)