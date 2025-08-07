#!/bin/bash
# Network stability fix script

echo "Fixing network stability issues..."

# 1. Disable the unused network interface
echo "Disabling unused enp2s0 interface..."
sudo ip link set enp2s0 down

# 2. Create a more stable netplan configuration
sudo cat > /tmp/99-network-fix.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    enp2s0:
      dhcp4: false
      optional: true
    enp3s0:
      dhcp4: true
      dhcp4-overrides:
        use-dns: true
        use-routes: true
        route-metric: 100
      optional: false
      nameservers:
        addresses: [8.8.8.8, 8.8.4.4]
        search: [lan]
EOF

# 3. Backup current config and apply new one
sudo cp /etc/netplan/*.yaml /etc/netplan/backup-netplan.yaml.bak
sudo mv /tmp/99-network-fix.yaml /etc/netplan/

# 4. Fix DNS resolution
echo "Configuring stable DNS..."
sudo mkdir -p /etc/systemd/resolved.conf.d/
sudo cat > /tmp/dns-fix.conf << 'EOF'
[Resolve]
DNS=8.8.8.8 8.8.4.4
FallbackDNS=1.1.1.1 1.0.0.1
DNSStubListener=yes
DNSSEC=no
DNSOverTLS=no
Cache=yes
EOF
sudo mv /tmp/dns-fix.conf /etc/systemd/resolved.conf.d/

# 5. Restart services
echo "Applying network configuration..."
sudo netplan apply
sudo systemctl restart systemd-resolved

# 6. Show status
echo "Network status:"
ip addr show enp3s0
resolvectl status

echo "Done! Monitor for stability over the next hour."