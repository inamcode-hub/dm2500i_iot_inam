# DMI System Boot Configuration

## Overview
This document contains the current boot configuration for the DMI system, including GRUB settings, Plymouth themes, systemd targets, and autologin configuration.

## 1. GRUB Bootloader Configuration

**File**: `/etc/default/grub`

```bash
GRUB_DEFAULT=0
GRUB_TIMEOUT_STYLE=menu
GRUB_TIMEOUT=3
GRUB_DISTRIBUTOR=`lsb_release -i -s 2> /dev/null || echo Debian`
GRUB_CMDLINE_LINUX_DEFAULT=""
GRUB_GFXMODE=1024x768
GRUB_GFXPAYLOAD_LINUX=keep
GRUB_RECORDFAIL_TIMEOUT=0
```

### Key Settings:
- **Boot timeout**: 3 seconds (visible menu)
- **Default boot entry**: 0 (first entry)
- **Graphics mode**: 1024x768
- **Kernel parameters**: None set (no quiet/splash)

## 2. Plymouth Boot Animation

### Installed Packages:
- libplymouth5:amd64
- plymouth
- plymouth-label
- plymouth-theme-spinner
- plymouth-theme-ubuntu-text
- plymouth-themes

### Available Themes:
- bgrt
- details
- dryermaster
- dryer_master_theme (priority 200)
- fade-in
- glow
- script
- solar
- spinfinity
- spinner (priority 70)
- text
- tribar
- ubuntu-text

### Current Configuration:
- **Active theme**: spinner
- **Highest priority theme**: dryer_master_theme

## 3. Systemd Boot Target

```bash
$ systemctl get-default
graphical.target
```

The system is configured to boot into graphical mode (full GUI environment).

## 4. TTY1 Autologin Configuration

**File**: `/etc/systemd/system/getty@tty1.service.d/override.conf`

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin dmi --noclear tty1 38400 linux
StandardOutput=null
StandardError=null
```

### Configuration Details:
- **Autologin user**: dmi
- **Terminal**: tty1
- **Output**: Redirected to null (silent)
- **Clear screen**: Disabled (--noclear)

## 5. X Server Startup Configuration

Shell configuration files checked:
- **~/.profile**: No startx/xinit commands
- **~/.bashrc**: No startx/xinit commands

The X server is started by the system's display manager, not through user shell configuration.

## Current Boot Sequence

1. **GRUB** shows menu for 3 seconds
2. **Kernel** boots without quiet/splash parameters (shows boot messages)
3. **Plymouth** displays spinner animation
4. **Systemd** targets graphical.target
5. **TTY1** automatically logs in user "dmi" (silent)
6. **Display Manager** starts X server and desktop environment

## Recommendations for Kiosk Mode

To create a clean kiosk boot experience:

1. **Hide boot messages**: Add `quiet splash` to `GRUB_CMDLINE_LINUX_DEFAULT`
2. **Remove GRUB menu**: Set `GRUB_TIMEOUT=0`
3. **Use custom Plymouth theme**: Consider using dryer_master_theme or creating custom
4. **Configure X session**: Set up automatic kiosk application launch
5. **Disable unnecessary services**: Streamline boot process

## Files to Modify for Kiosk Setup

1. `/etc/default/grub` - Boot parameters
2. `/etc/default/plymouth` - Boot animation
3. `/home/dmi/.xsessionrc` or `/home/dmi/.xinitrc` - X session startup
4. `/etc/systemd/system/getty@tty1.service.d/override.conf` - Already configured
5. `/etc/X11/default-display-manager` - Display manager selection