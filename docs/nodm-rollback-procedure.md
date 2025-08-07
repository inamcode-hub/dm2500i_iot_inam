# NoDM Rollback Procedure

If NoDM doesn't work correctly, follow these steps to revert to getty+startx:

## Quick Rollback Commands

```bash
# 1. Disable NoDM
sudo systemctl disable nodm.service
sudo systemctl stop nodm.service

# 2. Re-enable getty
sudo systemctl enable getty@tty1.service
sudo systemctl enable autologin@dmi.service

# 3. Restore Plymouth configuration
sudo rm /etc/systemd/system/plymouth-quit-wait.service.d/nodm-override.conf
sudo rm /etc/systemd/system/plymouth-quit.service.d/nodm-trigger.conf

# 4. Reload systemd
sudo systemctl daemon-reload

# 5. Reboot
sudo reboot
```

## Full Rollback Script

A complete rollback script is available at:
`/home/dmi/inam/scripts/rollback-to-getty.sh`

## Backup Locations

All original configurations are backed up in:
`/home/dmi/inam/backups/[timestamp]/`

Including:
- autologin@dmi.service
- getty@tty1.service.d/override.conf
- Plymouth service configurations

## Emergency Boot

If system won't boot:
1. Press Ctrl+Alt+F2 to switch to TTY2
2. Login as root or use recovery mode
3. Run: `sudo systemctl disable nodm.service`
4. Reboot