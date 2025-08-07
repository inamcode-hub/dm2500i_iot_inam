// network/ws/dispatcher/types/heartbeat.js
const logger = require('@utils/logger');
const sendHeartbeat = require('../../sender/sendHeartbeat');

function handleHeartbeat(message, socket) {
  logger.debug(
    `[Heartbeat Handler] Ping received from server at ${new Date(
      message.timestamp
    ).toISOString()}`
  );

  // Respond with a heartbeat
  sendHeartbeat(socket);
}

module.exports = handleHeartbeat;
