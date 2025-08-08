#!/bin/bash
# Kill X session and return to terminal for testing

# Create stop flags to prevent auto-restart
touch /tmp/no-startx
touch /tmp/dm2500i-stop

# FIRST: Kill the startup script to stop firefox from restarting
pkill -9 -f "start-dm2500i.sh"
sleep 0.5  # Give it time to die

# THEN: Kill browser processes
pkill -9 -f firefox-esr
pkill -9 -f firefox

# Kill other services
pkill -9 -f DM520
pm2 kill 2>/dev/null

# Kill unclutter
pkill -9 unclutter

# Kill window managers
pkill -9 openbox
pkill -9 xbindkeys

# Kill X server completely to return to terminal
pkill -9 xinit
pkill -9 Xorg

echo "Kiosk stopped. To restart:"
echo "  rm /tmp/no-startx && startx"