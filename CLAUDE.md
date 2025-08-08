# DMI System Configuration - CLAUDE.md

## Project Overview
This is a custom Linux system setup for DMI that requires a clean, professional boot experience with a custom logo and robust application management.

## Main Goal
Create a completely silent boot process that shows only the DMI logo from power-on until the X session (Firefox ESR kiosk) starts, with no text, no boot messages, smooth transitions, and automatic recovery for all components.

## Current Setup
- **OS**: Linux 5.15.0-143-generic
- **User**: dmi
- **Boot**: Plymouth with custom theme
- **Display Manager**: NoDM (automatic login without getty)
- **X Session**: Firefox ESR kiosk mode on http://localhost:3002
- **Logo**: `/home/dmi/inam/boot-logo/logo.png`
- **Process Manager**: PM2 for Node.js API
- **Controller**: DM520_NEW binary
- **Monitor**: Automatic process monitoring and recovery

## Key Requirements
1. **Silent Boot**: No GRUB menu, no boot messages, no text output
2. **Logo Display**: Show DMI logo throughout entire boot process
3. **Smooth Transition**: No black screens between Plymouth and X session
4. **Auto-start**: Automatic login and launch of Firefox ESR kiosk
5. **Process Recovery**: Automatic restart of failed components
6. **Logging**: All startup scripts log to `/home/dmi/inam/logs/`

## File Structure
```
/home/dmi/inam/
├── startupscreen/          # All boot-related files
│   ├── logo1.png          # Boot logo
│   ├── setup-silent-boot.sh
│   ├── fix-plymouth-transition.sh
│   └── Plymouth theme files
├── boot-logo/             # Application splash screen
│   └── logo.png           # Splash screen logo
├── scripts/               # System scripts
│   ├── start-dm2500i.sh   # Main startup script (improved)
│   └── monitor-dm2500i.sh # Process monitoring script
├── software/              # Application software
│   └── 2500i_api_ui/      # Node.js API application
├── logs/                  # Log directory
│   ├── startup/           # Startup script logs
│   ├── start-dm2500i-*.log
│   └── monitor-dm2500i-*.log
└── docs/                  # Documentation
```

## Display Manager Configuration
- **Using NoDM** instead of getty for cleaner boot flow
- **Config**: `/etc/default/nodm` and `/etc/nodm.conf`
- **X Session**: `/home/dmi/.xsession` launches DMI startup scripts
- **Logs**: `/home/dmi/inam/logs/startup/xsession-*.log`

## Startup Process (Improved - July 2025)
1. **System Boot**: GRUB → Plymouth → NoDM
2. **NoDM Auto-login**: Logs in user 'dmi' automatically
3. **X Session** (`/home/dmi/.xsession`):
   - Starts monitor script in background
   - Executes main startup script
4. **Main Startup Script** (`start-dm2500i.sh`):
   - Kills any existing processes
   - Shows splash screen with feh
   - Starts DM520 controller
   - Starts PM2 API with named process
   - Waits for API port availability
   - Launches Firefox ESR with retry logic
   - Monitors main browser process
5. **Monitor Script** (`monitor-dm2500i.sh`):
   - Checks all components every 30 seconds
   - Automatically restarts failed components
   - Logs all actions and issues

## PM2 Configuration
- **Process Name**: `dm2500i-api`
- **App Location**: `/home/dmi/inam/software/2500i_api_ui/app.js`
- **Port**: 3002
- **Logs**: `~/.pm2/logs/dm2500i-api-*.log`
- **Commands**:
  ```bash
  pm2 list                    # Show all processes
  pm2 show dm2500i-api       # Show process details
  pm2 logs dm2500i-api       # View logs
  pm2 restart dm2500i-api    # Restart API
  ```

## Systemd Services
- **nodm.service**: Handles automatic login and X session
- **dm2500i-monitor.service**: Process monitoring (optional)
  ```bash
  systemctl status dm2500i-monitor    # Check monitor status
  systemctl start dm2500i-monitor     # Start monitor
  systemctl stop dm2500i-monitor      # Stop monitor
  ```

## Process Recovery Features
The monitor script automatically recovers:
1. **DM520 Controller**: Restarts if process not found
2. **PM2 API**: Restarts if port 3002 not responding
3. **Firefox ESR Browser**: Restarts if not running (only when API is up)

## Known Issues & Solutions
1. **Black screen after Plymouth**: Run `fix-plymouth-transition.sh`
2. **Boot messages visible**: Check GRUB_CMDLINE_LINUX_DEFAULT in /etc/default/grub
3. **Logo not centered**: Plymouth theme script handles centering
4. **X session not starting**: Check `systemctl status nodm.service`
5. **PM2 not showing processes**: Check `pm2 list` and `pm2 show dm2500i-api`
6. **API not responding**: Check logs in `~/.pm2/logs/` and port 3002 availability

## Testing Commands
```bash
# View Plymouth theme
plymouth-show-splash

# Check boot services
systemctl status plymouth-quit-wait.service
systemctl status nodm.service
systemctl status dm2500i-monitor.service

# View startup logs
tail -f /home/dmi/inam/logs/start-dm2500i-*.log
tail -f /home/dmi/inam/logs/monitor-dm2500i-*.log

# Check running processes
ps aux | grep -E "(DM520|firefox|node|pm2)" | grep -v grep
pm2 list

# Check API port
netstat -tlnp | grep :3002
curl http://localhost:3002

# Manual component restart
pm2 restart dm2500i-api
pkill -f DM520_NEW && cd /home/dmi/control && ./DM520_NEW &
```

## Manual Startup (for testing)
```bash
# Kill all processes first
pkill -f firefox
pkill -f DM520
pm2 kill

# Run the improved startup script
/home/dmi/inam/scripts/start-dm2500i.sh

# Or run monitor in foreground for testing
/home/dmi/inam/scripts/monitor-dm2500i.sh
```

## Troubleshooting New Setup
1. **Splash screen error**: Check if logo exists at `/home/dmi/inam/boot-logo/logo.png`
2. **PM2 fails to start app**:
   ```bash
   cd /home/dmi/inam/software/2500i_api_ui
   pm2 delete all
   pm2 start app.js --name dm2500i-api
   pm2 save
   ```
3. **Port 3002 already in use**:
   ```bash
   lsof -i :3002
   kill -9 <PID>
   ```
4. **Monitor not working**: Check logs at `/home/dmi/inam/logs/monitor-dm2500i-*.log`

## NoDM Rollback Instructions
If NoDM fails, use the rollback script:
```bash
sudo /home/dmi/inam/scripts/rollback-to-getty.sh
```

## Full System Rollback Instructions
1. Restore GRUB: `sudo cp /etc/default/grub.backup.* /etc/default/grub && sudo update-grub`
2. Reset Plymouth: `sudo update-alternatives --set default.plymouth /usr/share/plymouth/themes/spinner/spinner.plymouth`
3. Update initramfs: `sudo update-initramfs -u`
4. Disable NoDM: `sudo systemctl disable nodm.service`
5. Re-enable getty: `sudo systemctl enable getty@tty1.service`
6. Disable monitor: `sudo systemctl disable dm2500i-monitor.service`

## Recent Updates (July 2025)
- Improved startup script with better error handling and retry logic
- Fixed feh splash screen syntax error
- Added automatic process monitoring and recovery
- PM2 process now uses named identifier for easier management
- Added port availability checking before marking API as ready
- Implemented systemd service for monitor script
- Enhanced logging with detailed status reporting