# 📁 config/

**Purpose:** Loads and validates environment variables; centralizes shared constants.

---

## 📄 Files

| File           | Summary                                           |
| -------------- | ------------------------------------------------- |
| `index.js`     | Loads and validates `.env` values; exits on fail  |
| `constants.js` | Provides reusable timeout/backoff constant values |

---

## 🔗 Responsibilities

- Ensures critical env vars exist before boot
- Defines tunable values for retry timing, delays, thresholds

---

## 🧪 Notes

- Test failure by deleting an env var (e.g. `DB_HOST`)
- Temporarily lower constants for fast retry tests
