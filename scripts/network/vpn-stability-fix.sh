#!/bin/bash
# VPN Stability Fix Script

echo "Applying VPN stability fixes..."

# 1. Prevent DNS conflicts
echo "Fixing DNS configuration..."
sudo cat > /tmp/resolved-vpn-fix.conf << 'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSStubListener=yes
DNSSEC=no
DNSOverTLS=no
Cache=yes
# Prevent VPN from completely taking over DNS
Domains=~.
EOF
sudo mv /tmp/resolved-vpn-fix.conf /etc/systemd/resolved.conf.d/vpn-fix.conf

# 2. Add connection keepalive for OpenVPN (if using config file)
echo "If you're using OpenVPN config files, add these lines to your .ovpn file:"
echo "keepalive 10 60"
echo "persist-key"
echo "persist-tun"
echo "nobind"

# 3. Disable IPv6 to prevent leaks
echo "Disabling IPv6 to prevent VPN issues..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1

# Make it permanent
echo "net.ipv6.conf.all.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 1" | sudo tee -a /etc/sysctl.conf

# 4. Set up connection monitoring
cat > /home/dmi/monitor-connection.sh << 'SCRIPT'
#!/bin/bash
# Monitor and log connection drops

LOG="/home/dmi/connection-monitor.log"
while true; do
    if ! ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        echo "[$(date)] Connection lost" >> "$LOG"
        # Log current routes and interfaces
        echo "Routes:" >> "$LOG"
        ip route >> "$LOG"
        echo "Interfaces:" >> "$LOG"
        ip addr >> "$LOG"
        echo "---" >> "$LOG"
    fi
    sleep 30
done
SCRIPT
chmod +x /home/dmi/monitor-connection.sh

# 5. Restart resolved
sudo systemctl restart systemd-resolved

echo "Done! To monitor connection drops, run:"
echo "./monitor-connection.sh &"
echo ""
echo "Check connection log with:"
echo "tail -f connection-monitor.log"