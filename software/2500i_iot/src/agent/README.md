# 📁 agent/

**Purpose:** Bootstraps and coordinates device initialization, database connection, WebSocket setup, and watchdog recovery.

## 📄 Files

| File       | Summary                                                        |
| ---------- | -------------------------------------------------------------- |
| `index.js` | Main entry point that runs init logic, connects, and monitors. |

## 🔗 Responsibilities

- Initialize local database
- Attempt and retry device registration
- Connect WebSocket with token
- Start watchdog loop with recovery logic

## 🧪 Notes

- Retries device initialization every 60 seconds on failure
- Handles token refresh and reconnect automatically via watchdog
