#!/bin/bash
# Setup script for unified DM2500i kiosk system

echo "Setting up unified DM2500i kiosk system..."

# Make startup script executable
chmod +x /home/dmi/inam/scripts/start-dm2500i.sh

# Copy service file to systemd
sudo cp /home/dmi/inam/scripts/dm2500i-kiosk.service /etc/systemd/system/

# Disable conflicting services
echo "Disabling conflicting services..."
sudo systemctl disable nodm.service 2>/dev/null
sudo systemctl disable getty@tty1.service 2>/dev/null
sudo systemctl disable getty@tty7.service 2>/dev/null

# Remove old startup files
echo "Removing old startup files..."
rm -f /home/dmi/.xsession
rm -f /home/dmi/.xinitrc

# Create sudoers entry for passwordless X server start
echo "Setting up sudoers for X server..."
echo "dmi ALL=(ALL) NOPASSWD: /usr/bin/X, /usr/bin/pkill, /usr/bin/fbi, /usr/bin/kill, /bin/systemctl start postgresql" | sudo tee /etc/sudoers.d/dm2500i-kiosk

# Enable and start our service
echo "Enabling DM2500i kiosk service..."
sudo systemctl daemon-reload
sudo systemctl enable dm2500i-kiosk.service

# Create startup log directory if needed
mkdir -p /home/dmi/inam/logs

echo "Setup complete!"
echo ""
echo "The system will now:"
echo "1. Boot directly to the DM2500i kiosk without any login prompt"
echo "2. Show boot logo immediately"
echo "3. Start X server, all services, and Firefox automatically"
echo "4. Everything is handled by a single script and systemd service"
echo ""
echo "To start the service now: sudo systemctl start dm2500i-kiosk.service"
echo "To check status: sudo systemctl status dm2500i-kiosk.service"
echo "To view logs: journalctl -u dm2500i-kiosk.service -f"
echo ""
echo "Please reboot to test the new setup!"