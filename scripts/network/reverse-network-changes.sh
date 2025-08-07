#!/bin/bash
# Script to reverse network changes and enable both interfaces

echo "Reversing network configuration changes..."

# 1. Check current network configuration
echo "Current network interfaces:"
ip link show

# 2. Enable both network interfaces
echo "Enabling both enp2s0 and enp3s0..."
sudo ip link set enp2s0 up
sudo ip link set enp3s0 up

# 3. Backup current netplan config
echo "Backing up current netplan configuration..."
sudo cp /etc/netplan/*.yaml /etc/netplan/backup-$(date +%Y%m%d_%H%M%S).yaml

# 4. Create new netplan configuration for both interfaces
echo "Creating new netplan configuration..."
sudo cat > /tmp/99-both-interfaces.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    enp2s0:
      dhcp4: true
      dhcp4-overrides:
        use-dns: true
        use-routes: true
        route-metric: 200
      optional: true
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        use-dns: true
        use-routes: true
        route-metric: 100
      optional: true
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
EOF

# 5. Remove old network fix configuration if exists
if [ -f /etc/netplan/99-network-fix.yaml ]; then
    echo "Removing old network fix configuration..."
    sudo rm /etc/netplan/99-network-fix.yaml
fi

# 6. Apply new configuration
sudo mv /tmp/99-both-interfaces.yaml /etc/netplan/
echo "Applying new network configuration..."
sudo netplan apply

# 7. Re-enable IPv6 (if it was disabled)
echo "Re-enabling IPv6..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Remove IPv6 disable entries from sysctl.conf
sudo sed -i '/net.ipv6.conf.all.disable_ipv6/d' /etc/sysctl.conf
sudo sed -i '/net.ipv6.conf.default.disable_ipv6/d' /etc/sysctl.conf

# 8. Reset DNS configuration to default
echo "Resetting DNS configuration..."
if [ -d /etc/systemd/resolved.conf.d/ ]; then
    sudo rm -f /etc/systemd/resolved.conf.d/dns-fix.conf
    sudo rm -f /etc/systemd/resolved.conf.d/vpn-fix.conf
fi

# 9. Restart systemd-resolved
sudo systemctl restart systemd-resolved

# 10. Show new network status
echo ""
echo "New network configuration status:"
echo "================================"
ip addr show
echo ""
echo "Route table:"
ip route show
echo ""
echo "DNS configuration:"
resolvectl status

echo ""
echo "Both network interfaces are now enabled!"
echo "- enp2s0: metric 200 (lower priority)"
echo "- enp3s0: metric 100 (higher priority)"
echo ""
echo "The system will use enp3s0 by default, but will failover to enp2s0 if needed."