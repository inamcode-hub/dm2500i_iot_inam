#!/bin/bash
# Integrate Plymouth with existing X startup system
# Version: 2.0 - Fixed TTY allocation for X server
# This properly configures autologin with agetty for console access

set -e

# Setup logging
LOG_DIR="/home/dmi/inam/logs/startup"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/plymouth-integration-$(date +%Y%m%d_%H%M%S).log"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log and execute commands
log_exec() {
    log "Executing: $1"
    if eval "$1" 2>&1 | tee -a "$LOG_FILE"; then
        log "✓ Success: $1"
        return 0
    else
        log "✗ Failed: $1"
        return 1
    fi
}

log "Starting Plymouth Integration Script v2.0"

if [ "$EUID" -ne 0 ]; then 
    log "ERROR: Not running as root"
    echo "Please run as root (use sudo)"
    exit 1
fi

echo "Plymouth Integration v2.0 - Enhanced Version"
echo "==========================================="
echo "Log file: $LOG_FILE"

# Stop any existing services that might interfere
log "Stopping existing services"
systemctl stop autologin@dmi.service 2>/dev/null || true
systemctl stop plymouth-quit-wait.service 2>/dev/null || true
pkill -f plymouth 2>/dev/null || true

# 1. Configure GRUB for silent boot
log "Step 1: Configuring GRUB for silent boot"
echo "1. Configuring GRUB..."
log_exec "cp /etc/default/grub /etc/default/grub.backup"
log "GRUB backup created"
log_exec "sed -i 's/GRUB_TIMEOUT=.*/GRUB_TIMEOUT=0/' /etc/default/grub"
log_exec "sed -i 's/GRUB_CMDLINE_LINUX_DEFAULT=.*/GRUB_CMDLINE_LINUX_DEFAULT=\"quiet splash\"/' /etc/default/grub"
log_exec "update-grub"

# 2. Setup Plymouth theme
log "Step 2: Setting up Plymouth theme"
echo "2. Setting up Plymouth theme..."
log_exec "mkdir -p /usr/share/plymouth/themes/dmi-logo"
log_exec "cp /home/dmi/inam/startupscreen/logo1.png /usr/share/plymouth/themes/dmi-logo/logo.png"

cat > /usr/share/plymouth/themes/dmi-logo/dmi-logo.script << 'EOF'
# DMI Logo Theme - Full screen logo
logo.image = Image("logo.png");

# Get screen dimensions
screen_width = Window.GetWidth();
screen_height = Window.GetHeight();

# Scale logo to fill entire screen
# Logo is 1200x800, target screen is 1280x800
# Since logo is almost same size as screen, scale to fit width
scale = screen_width / 1200.0;

# Create scaled sprite
logo.sprite = Sprite(logo.image);

# For 1280x800 screen with 1200x800 logo:
# scale = 1280/1200 = 1.067
# This will make logo 1280x853, slightly taller than screen
# But it will fill the width completely
logo.sprite.SetScale(scale, scale);

# Position at top-left since we're filling the screen
logo.sprite.SetPosition(0, 0, 0);

# Black background (in case of any gaps)
Window.SetBackgroundTopColor(0, 0, 0);
Window.SetBackgroundBottomColor(0, 0, 0);

# Keep logo visible during quit
fun quit_callback() {
    logo.sprite.SetOpacity(1);
}
Plymouth.SetQuitFunction(quit_callback);
EOF

cat > /usr/share/plymouth/themes/dmi-logo/dmi-logo.plymouth << 'EOF'
[Plymouth Theme]
Name=DMI Logo
Description=DMI boot logo
ModuleName=script

[script]
ImageDir=/usr/share/plymouth/themes/dmi-logo
ScriptFile=/usr/share/plymouth/themes/dmi-logo/dmi-logo.script
EOF

# Set Plymouth theme
log "Installing Plymouth theme as default"
log_exec "update-alternatives --install /usr/share/plymouth/themes/default.plymouth default.plymouth /usr/share/plymouth/themes/dmi-logo/dmi-logo.plymouth 100"
log_exec "update-alternatives --set default.plymouth /usr/share/plymouth/themes/dmi-logo/dmi-logo.plymouth"

# 3. Update your existing autologin service to handle Plymouth better
log "Step 3: Updating autologin service"
echo "3. Updating autologin service for smooth transition..."
cat > /etc/systemd/system/autologin@.service << 'EOF'
[Unit]
Description=Automatic login and startx for %i
After=systemd-user-sessions.service plymouth-quit.service
Conflicts=getty@tty1.service

[Service]
Type=idle
ExecStart=-/sbin/agetty --autologin %i --noclear tty1 $TERM
StandardInput=tty
StandardOutput=tty
StandardError=tty
TTYPath=/dev/tty1
TTYReset=yes
TTYVHangup=yes

[Install]
WantedBy=graphical.target
EOF

# Create .bash_profile for auto-starting X
log "Creating .bash_profile for X startup"
cat > /home/dmi/.bash_profile << 'EOF'
# If running on tty1, start X
if [[ -z "$DISPLAY" ]] && [[ $(tty) = /dev/tty1 ]]; then
    # Wait a moment for Plymouth to finish
    sleep 1
    # Quit Plymouth if still running
    plymouth quit 2>/dev/null || true
    # Start X
    exec startx
fi
EOF
log_exec "chown dmi:dmi /home/dmi/.bash_profile"

# 4. Update .xinitrc to handle Plymouth properly
log "Step 4: Updating .xinitrc"
echo "4. Updating .xinitrc for smooth transition..."
cat > /home/dmi/.xinitrc << 'EOF'
#!/bin/sh
# Set black background
xsetroot -solid "#000000" 2>/dev/null || true

# Start Chromium
exec chromium --kiosk
EOF
log_exec "chown dmi:dmi /home/dmi/.xinitrc"
log_exec "chmod +x /home/dmi/.xinitrc"

# 5. Remove old plymouth-quit-wait service if exists
log "Step 5: Cleaning up old Plymouth services"
echo "5. Cleaning up old services..."
if [ -f /etc/systemd/system/plymouth-quit-wait.service ]; then
    log "Removing old plymouth-quit-wait.service"
    rm -f /etc/systemd/system/plymouth-quit-wait.service
fi

# 6. Update initramfs with new Plymouth theme
log "Step 6: Updating initramfs"
echo "6. Updating initramfs..."
log_exec "update-initramfs -u"

# Enable services
log "Enabling systemd services"
log_exec "systemctl daemon-reload"
log_exec "systemctl enable autologin@dmi.service"

log "Plymouth integration completed successfully"
echo ""
echo "Done! Plymouth integration v2.0 completed."
echo ""
echo "Changes in v2.0:"
echo "- Fixed X server TTY allocation issue"
echo "- Uses agetty for proper console login"
echo "- Plymouth quit handled in .bash_profile"
echo "- Removed problematic plymouth-quit-wait service"
echo ""
echo "The boot flow will be:"
echo "1. GRUB (instant) → Plymouth logo"
echo "2. Auto-login via agetty on tty1"
echo "3. .bash_profile starts X session"
echo "4. Chromium launches in kiosk mode"
echo ""
echo "Log saved to: $LOG_FILE"
echo "Please reboot to test."