## 🚀 Project Scope: Real-Time IoT Device Data Communication Layer

---

### 🌐 Overview

Build a next-generation WebSocket communication layer for IoT devices—engineered for **real-time**, **secure**, and **seamless** data exchange between devices and backend services. The architecture is **modular**, **reliable**, and **future-proof**, supporting live telemetry, database-driven updates, and a wide range of device actions.

---

### ✨ Key Features

- **⚡ Live Data Streaming:** Instantly transmit sensor readings and runtime metrics from devices to the backend.
- **🗄️ Database-Driven Updates:** Push configuration changes, software updates, and historical data from the device database to the server.
- **🔌 Plug-and-Play Integration:** Simple API for connecting/disconnecting; all internals (heartbeat, reconnection, message routing) are fully encapsulated.
- **🔄 Connection Management:** Automatic reconnection, connection state tracking, and heartbeat monitoring for persistent, healthy links.
- **📬 Message Routing:** Central dispatcher for incoming messages—easily extensible for new message types and actions.
- **⏰ Scheduler:** Timed jobs for periodic tasks like history uploads and OTA checks.
- **🧩 Extensibility:** Effortlessly add new features (SSH access, OTA updates, authentication) by dropping in new handlers or senders.

---

### 💡 Example Use Cases

- **Live Telemetry:** Devices stream real-time sensor data for monitoring and analytics.
- **Remote Configuration:** Backend pushes new settings to devices, applied and acknowledged instantly.
- **Software Updates:** Trigger OTA updates or binary patches from server to device.
- **Historical Data Upload:** Devices periodically upload logs or records from their local database.
- **Secure Authentication:** Establish secure sessions and validate tokens.

---

### 🗂️ File Structure Highlights

| File/Folder             | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `client.js`, `index.js` | Manage WebSocket lifecycle (connect, disconnect, handlers)               |
| `connectionState.js`    | Track connection health and state                                        |
| `heartbeat.js`          | Monitor and maintain connection liveness                                 |
| `reconnect.js`          | Handle automatic reconnection attempts                                   |
| `dispatcher/`           | Route incoming messages by type; easily extendable                       |
| `sender/`               | Modular senders for telemetry, heartbeats, acknowledgements, and history |
| `scheduler/`            | Timed jobs for uploads and checks                                        |

```
network/
└── ws/
    ├── client.js                  # WebSocket lifecycle (connect, disconnect, handlers)
    ├── index.js                   # External interface for connect/disconnect
    ├── connectionState.js         # Tracks socket connection status
    ├── heartbeat.js               # Periodic heartbeat sender
    ├── reconnect.js               # Reconnection logic used by watchdog
    ├── outgoingQueue.js           # Queue for storing messages during disconnection

    ├── dispatcher/                # Core dispatcher that routes incoming messages
    │   ├── index.js               # Main dispatcher: routes by message.type
    │   └── types/                 # Per-message-type handler files
    │       ├── heartbeat.js       # Server-to-device ping/pong or liveness checks
    │       ├── command.js         # Commands like reboot, reload config
    │       ├── config.js          # Push new config to DB
    │       ├── softwareUpdate.js  # Trigger OTA update or binary patching
    │       ├── historyRequest.js  # Trigger data upload (e.g., last 1 hour logs)
    │       └── sshAccess.js       # Accept temporary SSH session window or token

    ├── sender/                    # Helpers to send messages TO server
    │   ├── sendTelemetry.js       # Send sensor or runtime metrics
    │   ├── sendHeartbeat.js       # Manual heartbeat trigger
    │   ├── sendAck.js             # Acknowledge received commands
    │   └── sendHistory.js         # Push historical DB records periodically

    ├── scheduler/                 # Timed jobs (can use cron or simple intervals)
    │   ├── index.js               # Start and stop all jobs
    │   ├── historyJob.js          # Send history to server every X mins
    │   └── otaCheck.js            # Optional: Poll server for OTA updates

```
