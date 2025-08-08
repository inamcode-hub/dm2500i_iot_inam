#!/bin/bash
# Cleanup script to remove old startup files after switching to unified system

echo "Cleaning up old startup configuration..."

# Create archive directory with timestamp
ARCHIVE_DIR="/home/dmi/inam/scripts/.old-scripts/archived-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

# Archive old X session files
if [ -f /home/dmi/.xsession ]; then
    echo "Archiving .xsession..."
    mv /home/dmi/.xsession "$ARCHIVE_DIR/"
fi

if [ -f /home/dmi/.xinitrc ]; then
    echo "Archiving .xinitrc..."
    mv /home/dmi/.xinitrc "$ARCHIVE_DIR/"
fi

# Archive any old startup scripts from logs
if [ -d /home/dmi/inam/scripts/.old-scripts ]; then
    echo "Old scripts already in archive folder"
else
    mkdir -p /home/dmi/inam/scripts/.old-scripts
fi

# List what was cleaned up
echo ""
echo "Cleanup complete! Archived files to: $ARCHIVE_DIR"
echo ""
echo "The following are NO LONGER NEEDED with the unified setup:"
echo "- .xsession (was used by nodm)"
echo "- .xinitrc (was alternative X init)"
echo "- nodm service (replaced by dm2500i-kiosk.service)"
echo "- Multiple startup scripts (everything is now in start-dm2500i.sh)"
echo ""
echo "The new setup uses:"
echo "- /home/dmi/inam/scripts/start-dm2500i.sh (main unified script)"
echo "- /etc/systemd/system/dm2500i-kiosk.service (systemd service)"
echo ""
echo "To verify the old files are gone:"
echo "ls -la ~/.xsession ~/.xinitrc 2>/dev/null"