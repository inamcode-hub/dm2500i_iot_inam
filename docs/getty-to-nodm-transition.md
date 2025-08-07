# Getty to NoDM Transition Documentation

## Why We're Moving from Getty to NoDM

### Current Setup Problems (Getty + startx)

1. **Getty Service Issues**
   - The `getty@tty1.service` is failing to start properly
   - Autologin mechanism through getty is unreliable
   - Creates race conditions with Plymouth quit timing

2. **X Server Permission Problems**
   - X server requires console user permissions
   - Without proper getty login, X cannot start
   - Error: "Only console users are allowed to run the X server"

3. **Complex Boot Chain**
   - Plymouth → Getty → Autologin → User Session → startx → Chromium
   - Too many handoffs = more failure points
   - Difficult to debug when something breaks

### How Getty + startx Works

```
Boot Process:
1. Kernel boots, starts systemd
2. Plymouth shows boot splash (logo1.png)
3. systemd reaches multi-user.target
4. getty@tty1.service starts (console login)
5. Autologin triggers for user 'dmi'
6. User's .xinitrc or .xsession runs
7. startx launches X server
8. X session runs chromium kiosk
```

### Why NoDM is Better

1. **Simpler Boot Chain**
   - Plymouth → NoDM → X + Chromium
   - Fewer services = fewer failure points

2. **Built for Kiosks**
   - Designed specifically for autologin scenarios
   - No console login required
   - Handles X server permissions automatically

3. **Direct X Launch**
   - NoDM starts X server directly
   - No need for startx or user session scripts
   - Cleaner Plymouth transition

4. **Better Integration**
   - Works well with systemd
   - Proper dependencies with graphical.target
   - Reliable service management

## How NoDM Works

```
Boot Process with NoDM:
1. Kernel boots, starts systemd
2. Plymouth shows boot splash (logo1.png)
3. systemd reaches graphical.target
4. nodm.service starts
5. NoDM automatically:
   - Logs in as configured user (dmi)
   - Starts X server
   - Runs configured X session (chromium)
6. Plymouth quits cleanly when X is ready
```

## Benefits for DMI System

- **Reliability**: No more getty failures blocking boot
- **Speed**: Faster boot with fewer services
- **Simplicity**: Single service to manage instead of multiple
- **Logging**: Easier to track issues with single service
- **Professional**: Cleaner transition from logo to application

## Configuration Files

- Getty setup: `/etc/systemd/system/autologin@dmi.service` (to be removed)
- NoDM config: `/etc/nodm.conf` (to be created)
- X session: `/home/dmi/.xsession` (for chromium launch)