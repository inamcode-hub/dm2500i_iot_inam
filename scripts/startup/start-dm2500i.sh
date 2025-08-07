#!/bin/bash
# Unified DM2500i Startup Script - All-in-one solution
# This script handles X server, autologin, and all services

LOG_FILE="/home/dmi/inam/logs/start-dm2500i-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_FILE")
exec 2>&1

echo "[$(date +%H:%M:%S)] === Starting DM2500i System ==="

# Plymouth theme background color
PLYMOUTH_BG_COLOR="#203967"

# Function to handle Plymouth transition
handle_plymouth_transition() {
    echo "[$(date +%H:%M:%S)] Handling Plymouth transition..."
    
    # Check if Plymouth is still running
    if plymouth --ping 2>/dev/null; then
        echo "[$(date +%H:%M:%S)] Plymouth is running, preparing smooth transition"
        # Tell Plymouth to prepare for quit but keep the splash
        sudo plymouth deactivate 2>/dev/null || true
        
        # Don't quit Plymouth yet - we'll do it after X is ready
        PLYMOUTH_WAS_RUNNING=true
    else
        echo "[$(date +%H:%M:%S)] Plymouth not running"
        PLYMOUTH_WAS_RUNNING=false
    fi
}

# Function to show boot logo on VT
show_boot_logo() {
    # Only use fbi if X is not running yet
    if [ -z "$DISPLAY" ] || ! xset q &>/dev/null 2>&1; then
        if [ -e /dev/fb0 ] && command -v fbi >/dev/null 2>&1; then
            echo "[$(date +%H:%M:%S)] Showing boot logo on framebuffer"
            # Use fb0 explicitly and suppress errors
            sudo fbi -d /dev/fb0 -T 7 -noverbose -a /home/dmi/inam/boot-logo/logo.png 2>/dev/null &
            BOOT_LOGO_PID=$!
        fi
    fi
}

# Function to start X and run kiosk
start_x_session() {
    echo "[$(date +%H:%M:%S)] Starting X server..."
    
    # Kill any existing X server
    sudo pkill -f "Xorg :0"
    sleep 1
    
    # Start X server on VT7
    sudo X :0 vt7 -ac -nolisten tcp &
    X_PID=$!
    
    # Wait for X to be ready
    for i in {1..10}; do
        if xset q &>/dev/null; then
            echo "[$(date +%H:%M:%S)] X server ready"
            break
        fi
        sleep 0.5
    done
    
    # Set display for all child processes
    export DISPLAY=:0
    export XAUTHORITY=/home/dmi/.Xauthority
}

# Function to setup environment
setup_environment() {
    echo "[$(date +%H:%M:%S)] Setting up environment..."
    
    # Node environment
    export NVM_DIR="/home/dmi/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    export PATH="/home/dmi/.nvm/versions/node/v18.17.1/bin:$PATH"
    export PM2_HOME="/home/dmi/.pm2"
    
    # X11 settings (only if X is running)
    if xset q &>/dev/null 2>&1; then
        xset s off -dpms 2>/dev/null
        xset s noblank 2>/dev/null
        # Hide cursor
        unclutter -idle 0.01 -root &
    fi
}

# Function to start services
start_services() {
    echo "[$(date +%H:%M:%S)] Starting background services..."
    
    # Ensure PostgreSQL is running
    sudo systemctl start postgresql 2>/dev/null
    
    # Kill any existing processes
    pkill -f firefox
    pkill -f firefox-esr
    pkill -f DM520
    pm2 kill 2>/dev/null
    
    # Start DM520 controller
    echo "[$(date +%H:%M:%S)] Starting DM520 controller..."
    cd /home/dmi/control && ./DM520_NEW &
    DM520_PID=$!
    
    # Start API with PM2 using npm script
    echo "[$(date +%H:%M:%S)] Starting PM2 API service..."
    cd /home/dmi/inam/software/2500i_api_ui
    npm run pm2:start
    
    # Start IoT device service with PM2
    echo "[$(date +%H:%M:%S)] Starting PM2 IoT device service..."
    cd /home/dmi/inam/software/2500i_iot
    npm run pm2:start
    
    # Wait for API to be ready
    echo "[$(date +%H:%M:%S)] Waiting for API on port 3002..."
    for i in {1..30}; do
        if nc -z localhost 3002 2>/dev/null; then
            echo "[$(date +%H:%M:%S)] API ready after $i seconds"
            break
        fi
        sleep 1
    done
}

# Function to show splash screen with Plymouth background color
show_splash_screen() {
    echo "[$(date +%H:%M:%S)] Showing splash screen with background $PLYMOUTH_BG_COLOR"
    
    # Kill any existing feh instances first
    pkill -f feh 2>/dev/null
    
    # Show splash with matching Plymouth background color
    feh --fullscreen \
        --hide-pointer \
        --no-menus \
        --image-bg "$PLYMOUTH_BG_COLOR" \
        --bg-center \
        /home/dmi/inam/boot-logo/logo.png &
    SPLASH_PID=$!
}

# Function to quit Plymouth smoothly
quit_plymouth_smoothly() {
    if [ "$PLYMOUTH_WAS_RUNNING" = true ]; then
        echo "[$(date +%H:%M:%S)] Quitting Plymouth smoothly..."
        # Quit Plymouth without clearing the screen
        sudo plymouth quit --retain-splash 2>/dev/null || true
    fi
}

# Function to start kiosk browser
start_kiosk() {
    echo "[$(date +%H:%M:%S)] Starting Firefox ESR kiosk..."
    
    # Start Firefox ESR in kiosk mode
    firefox-esr \
        --kiosk \
        --new-instance \
        --width=1280 \
        --height=800 \
        http://localhost:3002 &
    FIREFOX_PID=$!
    
    # Wait for Firefox to fully load
    echo "[$(date +%H:%M:%S)] Waiting for Firefox to fully load..."
    for i in {1..20}; do
        if xwininfo -name "Mozilla Firefox" >/dev/null 2>&1; then
            # Firefox window is ready, wait a bit more for content
            sleep 2
            echo "[$(date +%H:%M:%S)] Firefox loaded after $((i+2)) seconds"
            break
        fi
        sleep 0.5
    done
    
    # Kill splash screen after Firefox is ready
    if [ ! -z "$SPLASH_PID" ]; then
        echo "[$(date +%H:%M:%S)] Removing splash screen"
        kill $SPLASH_PID 2>/dev/null
    fi
    
    # Kill boot logo if still running
    if [ ! -z "$BOOT_LOGO_PID" ]; then
        sudo kill $BOOT_LOGO_PID 2>/dev/null
    fi
    
    echo "[$(date +%H:%M:%S)] System startup complete!"
    echo "[$(date +%H:%M:%S)] Firefox PID: $FIREFOX_PID"
}

# Main execution
main() {
    # Handle Plymouth transition first
    handle_plymouth_transition
    
    # Check if we need to start X or just the services
    if [ -z "$DISPLAY" ] || ! xset q &>/dev/null 2>&1; then
        # X not running, start it
        start_x_session
    else
        echo "[$(date +%H:%M:%S)] X server already running on $DISPLAY"
    fi
    
    # Now that X is ready, show splash screen
    if [ ! -z "$DISPLAY" ] && xset q &>/dev/null 2>&1; then
        show_splash_screen
        # Small delay to ensure splash is visible
        sleep 0.5
        # Now quit Plymouth after splash is showing
        quit_plymouth_smoothly
    else
        # If X failed, try framebuffer logo
        show_boot_logo
        quit_plymouth_smoothly
    fi
    
    # Setup environment
    setup_environment
    
    # Start all services
    start_services
    
    # Start kiosk browser
    start_kiosk
    
    # Wait for Firefox to keep script running
    wait $FIREFOX_PID
}

# Run main function
main