// network/reconnectHandler.js - What to do on recovery (restart socket etc.)

const webSocketClient = require('./client');
const logger = require('@utils/logger');
function handleReconnect(device) {
  logger.info('[ReconnectHandler] Executing recovery flow...');

  webSocketClient.disconnect();
  webSocketClient.connect(device.token);

  // Optional: resume queued jobs, heartbeat, etc.
}

module.exports = handleReconnect;
