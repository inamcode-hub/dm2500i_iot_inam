const {
  hasInternetConnection,
  getOfflineDuration,
} = require('./internetCheck');
const { reinitialize } = require('../device/deviceManager');
const { renewIfExpiring } = require('../device/token');
const logger = require('@utils/logger');
const state = require('../device/state');
const constants = require('../config/constants');
const { loadDeviceFromDB } = require('../device/localStorage');

let interval = null;
let previouslyOffline = false;
let lastRecovery = 0;
let lastTokenCheck = 0;

function startWatchdog({ onReconnected }) {
  logger.info('[watchdog] Starting watchdog...');

  interval = setInterval(async () => {
    // logger.debug('[watchdog] Checking internet status...');
    const online = await hasInternetConnection();
    const socketConnected = state.isSocketConnected();
    const now = Date.now();

    // logger.debug(
    //   `[watchdog] Internet: ${online}, WebSocket: ${socketConnected}`
    // );

    // Token renewal logic (every 24h or configured interval)
    const tokenCheckInterval = constants.TOKEN_CHECK_INTERVAL_MS;
    const shouldCheckToken = now - lastTokenCheck > tokenCheckInterval;

    if (online && shouldCheckToken) {
      logger.info('[watchdog] Performing scheduled token expiry check...');
      const device = await loadDeviceFromDB();
      if (device) {
        await renewIfExpiring(device);
        lastTokenCheck = now;
      } else {
        logger.warn('[watchdog] No device found during token check.');
      }
    }

    // Internet lost
    if (!online) {
      const offlineMs = getOfflineDuration();
      logger.warn(
        `[watchdog] Still offline. Duration: ${(offlineMs / 1000).toFixed(1)}s`
      );
      if (!previouslyOffline) {
        logger.warn('[watchdog] Internet is offline. Waiting for recovery...');
        previouslyOffline = true;
      }
      return;
    }

    // Internet is online
    const needsRecovery = previouslyOffline || !socketConnected;
    const cooldownPassed = now - lastRecovery >= constants.RECOVERY_COOLDOWN_MS;

    if (needsRecovery && cooldownPassed) {
      logger.info(
        '[watchdog] Reconnection needed. Starting reinitialization...'
      );
      previouslyOffline = false;
      lastRecovery = now;

      const device = await reinitialize();
      if (device && typeof onReconnected === 'function') {
        logger.info('[watchdog] Triggering onReconnected handler...');
        onReconnected(device);
      }
    } else if (needsRecovery && !cooldownPassed) {
      logger.debug('[watchdog] Waiting for recovery cooldown to pass...');
    } else {
      // logger.debug(
      //   '[watchdog] Internet and WebSocket both healthy. No action needed.'
      // );
    }
  }, constants.INTERNET_CHECK_INTERVAL_MS);
}

function stopWatchdog() {
  if (interval) {
    clearInterval(interval);
    logger.info('[watchdog] Stopped');
  }
}

module.exports = { startWatchdog, stopWatchdog };
