const logger = require('@utils/logger');
const sendHeartbeat = require('./sender/sendHeartbeat');
const { DEVICE_HEARTBEAT_INTERVAL } = require('../../config/constants');

let interval = null;

// Read heartbeat interval from config or use default

function startHeartbeat(socket) {
  if (interval) return; // avoid duplicate intervals
  interval = setInterval(() => {
    sendHeartbeat(socket);
  }, DEVICE_HEARTBEAT_INTERVAL);

  logger.debug(
    `[Heartbeat] Started heartbeat interval (${DEVICE_HEARTBEAT_INTERVAL} ms)`
  );
}

function stopHeartbeat() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    logger.debug('[Heartbeat] Stopped heartbeat interval');
  }
}

module.exports = { startHeartbeat, stopHeartbeat };
