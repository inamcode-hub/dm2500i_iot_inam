#!/bin/bash
# Test NoDM configuration without rebooting

echo "Testing NoDM configuration..."
echo "1. Checking nodm.conf syntax:"
grep -E "^[^#]" /etc/nodm.conf

echo -e "\n2. Checking .xsession permissions:"
ls -la /home/dmi/.xsession

echo -e "\n3. Checking service dependencies:"
systemctl list-dependencies nodm.service | head -20

echo -e "\n4. To test without reboot, run:"
echo "   sudo systemctl stop plymouth-quit-wait.service"
echo "   sudo systemctl start nodm.service"
echo ""
echo "5. To revert to getty, run:"
echo "   sudo systemctl disable nodm.service"
echo "   sudo systemctl enable getty@tty1.service"
