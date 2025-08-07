# DMI 2500i IoT System

A comprehensive IoT system for the DMI 2500i industrial controller with custom boot configuration, web interface, and process monitoring.

## 🚀 Overview

This system provides a complete solution for running the DMI 2500i controller with:
- Silent boot process with custom DMI logo
- Automatic kiosk mode with Chromium browser
- Node.js API backend with PostgreSQL database
- Process monitoring and automatic recovery
- Network stability enhancements
- Comprehensive logging system

## 📋 Table of Contents

- [System Requirements](#system-requirements)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Components](#components)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## 💻 System Requirements

- **OS**: Ubuntu/Debian Linux (Kernel 5.15.0+)
- **Hardware**: x86_64 compatible system
- **Memory**: Minimum 4GB RAM
- **Storage**: 20GB+ free space
- **Display**: 1920x1080 resolution recommended
- **Network**: Ethernet connection required

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Boot Process                         │
│  GRUB → Plymouth (DMI Logo) → NoDM → X Session         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Application Stack                       │
│                                                          │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────┐ │
│  │ DM520_NEW     │  │ Node.js API    │  │ Chromium   │ │
│  │ Controller    │  │ (Port 3002)    │  │ Kiosk Mode │ │
│  └───────────────┘  └────────────────┘  └────────────┘ │
│                            │                             │
│                            ▼                             │
│                    ┌────────────────┐                   │
│                    │  PostgreSQL DB  │                   │
│                    └────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
/home/dmi/inam/
├── boot-logo/              # Application splash screen assets
│   └── logo.png           # Main splash screen logo
├── config/                 # Configuration files
│   ├── network/           # Network configuration
│   └── systemd/           # Systemd service files
├── docs/                   # Documentation
├── loading-screen/         # Boot loading screen assets
├── logs/                   # All system logs
│   ├── network/           # Network-related logs
│   ├── nodm-setup/        # Display manager logs
│   └── startup/           # Startup script logs
├── scripts/                # System management scripts
│   ├── cronjob/           # Scheduled maintenance scripts
│   ├── network/           # Network stability scripts
│   └── startup/           # Boot and startup scripts
├── software/              # Application software
│   ├── 2500i_api_ui/      # Main Node.js API application
│   └── 2500i_iot/         # IoT connectivity module
└── startupscreen/         # Plymouth boot theme

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/inamcode-hub/dm2500i_iot_inam.git
cd dm2500i_iot_inam
```

### 2. Run Setup Script
```bash
sudo ./scripts/startup/setup-unified-kiosk.sh
```

This script will:
- Configure silent boot with Plymouth
- Set up NoDM for automatic login
- Install system dependencies
- Configure systemd services
- Set up process monitoring

### 3. Install Application Dependencies
```bash
cd software/2500i_api_ui
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## ⚙️ Configuration

### Boot Configuration
- **GRUB**: Silent boot parameters in `/etc/default/grub`
- **Plymouth**: Custom theme in `/home/dmi/inam/startupscreen/`
- **NoDM**: Auto-login configuration in `/etc/nodm.conf`

### Application Configuration
- **API Port**: 3002 (configured in `software/2500i_api_ui/app.js`)
- **Database**: PostgreSQL connection in `lib/db/pool.js`
- **PM2**: Process management in `ecosystem.config.js`

### Network Configuration
Enhanced network stability scripts in `scripts/network/`:
- `fix-network-stability.sh` - Applies network optimizations
- `vpn-stability-fix.sh` - VPN connection stability
- `reverse-network-changes.sh` - Rollback network changes

## 🚀 Usage

### Starting the System
The system starts automatically on boot. Manual control:

```bash
# Start all components
/home/dmi/inam/scripts/startup/start-dm2500i.sh

# Monitor system status
pm2 status
systemctl status dm2500i-monitor

# View logs
tail -f /home/dmi/inam/logs/startup/start-dm2500i-*.log
pm2 logs dm2500i-api
```

### Stopping Components
```bash
# Stop all PM2 processes
pm2 stop all

# Kill all components
pkill -f chromium
pkill -f DM520
pm2 kill
```

## 📦 Components

### 1. DM520_NEW Controller
- Binary executable for hardware control
- Location: `/home/dmi/control/DM520_NEW`
- Auto-started and monitored

### 2. Node.js API (Port 3002)
- Express.js REST API
- PostgreSQL database integration
- Real-time data processing
- Endpoints:
  - `/api/home` - Dashboard data
  - `/api/alarms` - Alarm management
  - `/api/diagnostics` - System diagnostics
  - `/api/history` - Historical data
  - `/api/settings` - Configuration

### 3. Web Interface
- React-based SPA
- Vite build system
- Real-time updates
- Touch-optimized UI

### 4. Process Monitor
- Automatic recovery for crashed processes
- 30-second check intervals
- Detailed logging
- Systemd service: `dm2500i-monitor.service`

## 📊 Monitoring

### PM2 Dashboard
```bash
pm2 monit              # Interactive dashboard
pm2 list               # Process list
pm2 show dm2500i-api   # Detailed process info
```

### System Logs
```bash
# Startup logs
ls -la /home/dmi/inam/logs/startup/

# Monitor logs
tail -f /home/dmi/inam/logs/monitor-dm2500i-*.log

# PM2 logs
pm2 logs dm2500i-api --lines 100
```

### Health Checks
```bash
# API health endpoint
curl http://localhost:3002/api/system/health

# Check running processes
ps aux | grep -E "(DM520|chromium|node)" | grep -v grep

# Port status
netstat -tlnp | grep :3002
```

## 🔧 Troubleshooting

### Common Issues

1. **Black screen after boot**
   ```bash
   sudo /home/dmi/inam/startupscreen/integrate-plymouth.sh
   systemctl restart nodm
   ```

2. **API not responding**
   ```bash
   pm2 restart dm2500i-api
   pm2 logs dm2500i-api --err
   ```

3. **Database connection issues**
   ```bash
   # Check PostgreSQL status
   systemctl status postgresql
   
   # Test connection
   psql -U dmi -d dm2500i_db -c "SELECT 1;"
   ```

4. **Chromium not starting**
   ```bash
   # Check X display
   echo $DISPLAY
   
   # Restart display manager
   systemctl restart nodm
   ```

### Log Locations
- Startup: `/home/dmi/inam/logs/startup/`
- Monitor: `/home/dmi/inam/logs/monitor-dm2500i-*.log`
- PM2: `~/.pm2/logs/`
- System: `/var/log/syslog`

### Emergency Recovery
```bash
# Full system restart
sudo /home/dmi/inam/scripts/startup/start-dm2500i.sh

# Rollback to getty (if NoDM fails)
sudo systemctl disable nodm
sudo systemctl enable getty@tty1
```

## 👥 Development

### API Development
```bash
cd software/2500i_api_ui
npm run dev    # Development mode with nodemon
npm test       # Run tests
```

### Frontend Development
The frontend is built and served from the `public/` directory.

### Adding New Features
1. Create feature branch
2. Implement changes
3. Test thoroughly
4. Update documentation
5. Submit pull request

### Database Schema
Located in `software/2500i_api_ui/lib/db/schema.sql`

## 🔒 Security Considerations

- API runs on localhost only (port 3002)
- PostgreSQL secured with user authentication
- Automatic login configured for kiosk user only
- No external network access by default

## 📝 License

Proprietary - DMI Systems

## 🤝 Support

For issues or questions:
- Check logs in `/home/dmi/inam/logs/`
- Review troubleshooting section
- Contact DMI support team

---

**Version**: 1.0.0  
**Last Updated**: August 2025  
**Maintained by**: DMI IoT Team
