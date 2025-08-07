# 📁 network/

**Purpose**: Handles all aspects of network monitoring, WebSocket lifecycle, retry logic, and reconnection strategies.

---

## 📄 Files

| File                  | Summary                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `internetCheck.js`    | Performs DNS + HTTP checks to detect internet connectivity             |
| `webSocketClient.js`  | Connects to WebSocket, handles lifecycle events, and updates state     |
| `watchdog.js`         | Continuously monitors connection health and triggers recovery          |
| `reconnectHandler.js` | Orchestrates what happens after recovery (disconnect + reconnect flow) |
| `retry.js`            | Generic retry wrapper with exponential backoff and 429 handling        |

---

## 🔗 Responsibilities

- Detect online/offline status via DNS and HTTP fallback
- Maintain resilient WebSocket connection to server
- Automatically reinitialize agent after connectivity is restored
- Retry any action using smart exponential backoff
- Separate logic for handling recovery (WebSocket reconnect, resuming flow)

---

## 🧠 Function Highlights

### `internetCheck.js`

- `hasInternetConnection()`: Checks DNS (Google) first, falls back to HTTP HEAD checks
- `getOfflineDuration()`: Returns how long the device has been offline

### `webSocketClient.js`

- `connect(token)`: Authenticates and opens WebSocket; binds listeners for message, error, close
- `disconnect()`: Closes socket cleanly and updates memory state

### `watchdog.js`

- `startWatchdog({ onReconnected })`: Interval-based polling of internet + socket status
- Detects need for recovery and triggers `reinitialize()` followed by callback
- `stopWatchdog()`: Clears the watchdog interval loop

### `reconnectHandler.js`

- `handleReconnect(device)`: Disconnects old socket and reconnects with new token

### `retry.js`

- `retry(fn, retries, actionLabel)`: Runs async function with retry, doubling delay each time
- Handles 429 “Too Many Requests” with respect to `retry-after` header if present

---

## 🥪 Notes

- Test `internetCheck.js` by unplugging/disabling internet to observe fallback logic
- Simulate WebSocket errors to test `watchdog` recovery
- Wrap flaky or rate-limited API calls with `retry()`
