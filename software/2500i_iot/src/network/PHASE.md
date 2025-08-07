# 📘 Device-Side WebSocket Architecture – Phase Summary

---

## ✅ Phase 1: WebSocket + Heartbeat + Connection State

**Purpose:** Establish WebSocket connection, monitor status, and send heartbeat.

**Key Files:**

```
network/ws/
├── client.js               // Connects to WebSocket, manages events
├── heartbeat.js            // Sends heartbeat every 30s
├── connectionState.js      // Uses device/state to track socket status
├── index.js                // Public entry point for connect/disconnect
```

---

## ✅ Phase 2: Dispatcher + Command Routing

**Purpose:** Route incoming messages to handlers based on their type.

**Key Files:**

```
network/ws/dispatcher/
├── index.js                // Dispatches messages to type handlers
└── types/
    ├── command.js          // Handles 'command' type (e.g. reboot)
    ├── heartbeat.js        // Handles 'heartbeat' type
```

---

## ✅ Phase 3: Scheduler + Periodic History Upload

**Purpose:** Run background jobs, like uploading logs or telemetry at intervals.

**Key Files:**

```
network/ws/scheduler/
├── index.js                // Starts/stops all jobs
├── historyJob.js           // Periodic job to send history
```

**Also Used:**

```
network/ws/sender/sendHistory.js  // Sends history data to server
```

---

## ✅ Phase 4: Outgoing Messaging + Retry Queue

**Purpose:** Queue messages if socket is offline; retry on reconnect.

**Key Files:**

```
network/ws/
├── outgoingQueue.js        // In-memory message queue with flush logic

network/ws/sender/
├── sendAck.js              // Sends ACKs with queue fallback
├── sendTelemetry.js        // Telemetry sender (uses queue)
```

---

## ✅ Phase 5: OTA Update + SSH Access Handling

**Purpose:** Handle update and SSH access triggers from the server.

**Key Files:**

```
network/ws/dispatcher/types/
├── softwareUpdate.js       // Executes update logic
├── sshAccess.js            // Enables SSH temporarily with time/token
```

---

## ✅ Phase 6: Config Push + Telemetry Batching + Command Validation

**Purpose:** Push config from server, batch telemetry data, validate commands.

**Key Files:**

```
network/ws/dispatcher/types/
├── config.js               // Accepts and saves runtime config

network/ws/sender/
├── sendTelemetry.js        // Collects telemetry in batches

utils/
├── validator.js            // Joi schema validation for commands
```

---

## ✅ Phase 7: Persistent Queue + Offline Replay

**Purpose:** Store unsent messages on disk and replay them after reconnect.

**Key Files:**

```
network/ws/
├── persistentQueue.js      // Disk-based storage for queued messages
├── outgoingQueue.js        // Updated to save/load via persistent queue

network/ws/sender/
├── replayOffline.js        // Replays stored messages after reconnect
```

---

## ✅ Phase 8: ACK Tracking + Retry

**Purpose:** Ensure that all command ACKs are reliably delivered (with retry support).

**Key Files:**

```
network/ws/
├── ackTracker.js           // Tracks and retries unsent ACKs

network/ws/sender/
├── sendAck.js              // Sends ACK + integrates with tracker

network/ws/dispatcher/types/
├── command.js              // Sends ACK with unique command ID
```

---

## 🧩 Integration Entry Points

- `agent/index.js`: boot sequence
- `watchdog.js`: reconnection triggers
- `webSocketClient.js`: replaced by `ws/client.js`

---

## 🗂️ Folder Structure

```
network/
└── ws/
    ├── ackTracker.js
    ├── client.js
    ├── connectionState.js
    ├── heartbeat.js
    ├── index.js
    ├── outgoingQueue.js
    ├── persistentQueue.js
    ├── reconnect.js
    ├── dispatcher/
    │   ├── index.js
    │   └── types/
    │       ├── command.js
    │       ├── config.js
    │       ├── heartbeat.js
    │       ├── historyRequest.js
    │       ├── softwareUpdate.js
    │       └── sshAccess.js
    ├── scheduler/
    │   ├── index.js
    │   ├── historyJob.js
    │   └── otaCheck.js // missing at the moment not required.
    └── sender/
        ├── replayOffline.js
        ├── sendAck.js
        ├── sendHeartbeat.js
        ├── sendHistory.js
        └── sendTelemetry.js
```
