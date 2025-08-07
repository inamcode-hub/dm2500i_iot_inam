# 📁 device/

**Purpose**: Manages the device’s lifecycle: registration, token renewal, DB persistence, and in-memory state.

---

## 📄 Files

| File               | Summary                                                                               |
| ------------------ | ------------------------------------------------------------------------------------- |
| `deviceManager.js` | Initializes device from DB or via registration; manages reinitialize on recovery      |
| `register.js`      | Collects hardware info, checks connectivity, and registers the device with the server |
| `token.js`         | Decodes JWT token, checks expiry, renews if needed; updates DB and memory on success  |
| `localStorage.js`  | Provides DB access methods for reading, writing, and updating device entries          |
| `state.js`         | In-memory snapshot of device state: serial, token, socket connection flags            |

---

## 🔗 Responsibilities

- Load existing device from DB or trigger full registration
- Renew token if nearing expiry threshold
- Persist device info using Sequelize model
- Store active state in memory for fast reuse by other modules

---

## 🧠 Function Highlights

### `deviceManager.js`

- `initialize()`: Checks DB, renews token if valid, or calls registration and saves result
- `reinitialize()`: Wrapper to rerun `initialize()` (used after recovery)

### `register.js`

- `registerDevice()`: Combines hardware info + device type and sends to backend via `registerDeviceAPI()`
- Skips if no internet; handles API failure gracefully

### `token.js`

- `renewIfExpiring(device)`: Decodes JWT, compares expiry to threshold, calls `renewTokenAPI()` if needed
- Updates both DB (`updateDeviceTokenInDB`) and memory (`state.set()`)

### `localStorage.js`

- `loadDeviceFromDB()`: Reads first available device record
- `saveDeviceToDB()`: Creates and stores a new record after registration
- `updateDeviceTokenInDB()`: Updates token in-place using serial match

### `state.js`

- `set() / get() / clear()`: Manage current serial and token in memory
- `setConnectionStatus()` / `isSocketConnected()`: Track socket-level status

---

## 🥪 Notes

- Simulate JWT expiry to test renewal path in `token.js`
- Mock `registerDevice()` to simulate network or API failure
- Use `state.clear()` in tests to mimic cold-start behavior
