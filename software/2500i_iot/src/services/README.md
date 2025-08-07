# 📁 services/

**Purpose**: Interfaces with external systems: the backend server for API calls and the local database for storage.

---

## 📄 Files

| File                    | Summary                                                             |
| ----------------------- | ------------------------------------------------------------------- |
| `database.js`           | Initializes Sequelize connection to PostgreSQL DB using .env values |
| `serverApi.js`          | Registers and renews device token via signed HTTP requests          |
| `models/deviceModel.js` | Defines Sequelize schema for storing device serial, token, password |

---

## 🔗 Responsibilities

- Authenticate DB connection and expose instance to the app
- Interact securely with backend server using HMAC-signed requests
- Register device with UUID and renew token when needed
- Define device model schema with Sequelize ORM

---

## 🧠 Function Highlights

### `database.js`

- Exports configured Sequelize instance with credentials from `.env`
- Uses `postgres` dialect with `DB_HOST`, `DB_USER`, `DB_PASSWORD`, etc.

### `serverApi.js`

- `registerDeviceAPI(payload)`: Signs payload and POSTs to `/devices/register`
- `renewTokenAPI(serial, token)`: Signs serial + token, POSTs to `/devices/renew-token`
- Uses retry wrapper for automatic backoff on errors like 429/500

### `deviceModel.js`

- Sequelize model for `Device` table with:
  - `serial` (unique ID)
  - `registerPassword` (one-time registration key)
  - `token` (JWT string)
- Uses `timestamps: true` for automatic `createdAt`/`updatedAt`

---

## 🥪 Notes

- Modify `.env` to test DB failures and API fallback
- Add indexes or constraints to `deviceModel` if scaling beyond single device
- Extend `serverApi.js` with more endpoints as needed
