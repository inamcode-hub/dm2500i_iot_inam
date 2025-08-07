# 📁 utils/

**Purpose**: Provides low-level utility functions for logging, cryptographic signatures, hardware ID generation, and time operations.

---

## 📄 Files

| File              | Summary                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `logger.js`       | Configures Winston logger with daily file rotation + console output  |
| `signature.js`    | HMAC-SHA256 signer for payload integrity/authentication              |
| `hardwareInfo.js` | Gathers machine UUID from hostname, MAC, disk UUID, and version info |
| `time.js`         | (Placeholder) Date/time helpers                                      |

---

## 🔗 Responsibilities

- Standardized logging across modules with timestamps
- Sign and verify secure API requests using shared secret
- Collect hardware identifiers for unique device registration
- Provide utilities for token expiry or uptime calculations

---

## 🧠 Function Highlights

### `logger.js`

- Creates rotating logs named by date in `logs/`
- Supports `.env`-configurable log level (`LOG_LEVEL`)
- Timestamps and formats all logs consistently【160†source】

### `signature.js`

- `signPayload(payload, secret)`: Returns hex-encoded HMAC for signed payload validation【161†source】

### `hardwareInfo.js`

- `getHardwareInfo()`: Returns `{ hostname, mac, diskUUID, deviceUUID, softwareVersion }`
- Uses Linux commands and SHA-256 to fingerprint the device【159†source】

### `time.js`

- Intended for helpers like `isTokenExpiring()`, `dateDiffInMinutes()`, etc. (expand later)

---

## 🥪 Notes

- Verify signature correctness by recomputing manually using the same secret
- Add more utilities to `time.js` as needed for scheduling, logging, or timeout checks
