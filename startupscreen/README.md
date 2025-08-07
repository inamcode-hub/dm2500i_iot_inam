# DMI Startup Screen Configuration

## Overview
This folder contains the Plymouth boot splash configuration for DMI system. The goal is to provide a clean, professional boot experience showing only the DMI logo from power-on until the Chromium kiosk interface appears.

## Why Plymouth?
Plymouth provides a graphical boot splash that hides all Linux boot messages. It bridges the gap between GRUB bootloader and X session startup, maintaining visual continuity with our logo.

## System Architecture

### Existing Services (Already in Place)
1. **`autologin@dmi.service`** - Handles automatic login and X startup
   - Located at: `/etc/systemd/system/autologin@.service`
   - Auto-logs in user 'dmi' without password
   - Automatically starts X session with `startx`
   - Runs at `graphical.target`

2. **`.xinitrc`** - Defines what runs in X session
   - Located at: `/home/dmi/.xinitrc`
   - Launches Chromium in kiosk mode

### Boot Flow
```
Power On → BIOS → GRUB (0 timeout) → Kernel + Plymouth (shows logo) → 
systemd services → autologin@dmi.service → startx → .xinitrc → Chromium
```

## What integrate-plymouth.sh Does

### 1. GRUB Configuration
- Sets `GRUB_TIMEOUT=0` (instant boot)
- Sets `GRUB_CMDLINE_LINUX_DEFAULT="quiet splash"` (hide boot messages)
- Creates backup at `/etc/default/grub.backup`

### 2. Plymouth Theme Setup
- Creates custom theme at `/usr/share/plymouth/themes/dmi-logo/`
- Installs DMI logo as boot splash
- Sets as default Plymouth theme

### 3. Service Integration
- Updates `autologin@.service` to remove early Plymouth termination
- Adds Plymouth quit handling to `.xinitrc` for smooth transition
- Ensures Plymouth stays visible until X is ready

### 4. System Updates
- Runs `update-grub` to apply GRUB changes
- Runs `update-initramfs -u` to include Plymouth theme in boot image

## Files in This Folder
- `logo1.png` - The DMI logo displayed during boot
- `integrate-plymouth.sh` - One-time setup script
- `README.md` - This documentation

## Usage
Run once as root to configure the system:
```bash
sudo ./integrate-plymouth.sh
```

Then reboot. The system will permanently boot with:
- No GRUB menu
- DMI logo throughout boot
- Automatic transition to Chromium kiosk

## Troubleshooting

### Black Screen Issues
If you see a black screen between logo and Chromium:
```bash
# Check if autologin service is running
systemctl status autologin@dmi.service

# Check X session logs
journalctl -u autologin@dmi.service
```

### Logo Not Showing
```bash
# Verify Plymouth theme is active
plymouth-set-default-theme
# Should show: dmi-logo

# Test Plymouth manually
sudo plymouthd && sudo plymouth --show-splash
# Press Ctrl+Alt+F2 to exit
```

### Reverting Changes
To restore original boot behavior:
```bash
# Restore GRUB
sudo cp /etc/default/grub.backup /etc/default/grub
sudo update-grub

# Reset Plymouth to default
sudo update-alternatives --set default.plymouth /usr/share/plymouth/themes/bgrt/bgrt.plymouth
sudo update-initramfs -u

# Reboot
sudo reboot
```

## Technical Details
- Plymouth theme uses script module for flexibility
- Logo is centered on screen dynamically
- Black background matches Chromium loading screen
- Uses `plymouth quit --retain-splash` for smooth transition
- Service dependencies ensure proper startup order