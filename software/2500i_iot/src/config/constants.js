// config/constants.js - Central constants for timeouts, thresholds, etc.

module.exports = {
  TOKEN_RENEWAL_THRESHOLD_DAYS: 30,
  TOKEN_CHECK_INTERVAL_MS: 24 * 60 * 60 * 1000,
  INTERNET_CHECK_INTERVAL_MS: 10000, // 10 seconds
  RECOVERY_COOLDOWN_MS: 30000,
  RETRY_BACKOFF_BASE_MS: 1000, // 1 second
  RETRY_BACKOFF_MAX_MS: 30000, // 30 seconds
  WEBSOCKET_RECONNECT_DELAY_MS: 1000, // 5 seconds
  DEVICE_HEARTBEAT_INTERVAL: 30000, // 30 seconds
};
