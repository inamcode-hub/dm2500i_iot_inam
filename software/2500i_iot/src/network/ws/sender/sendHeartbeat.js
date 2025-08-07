// network/ws/sender/sendHeartbeat.js
const logger = require('@utils/logger');

function sendHeartbeat(socket) {
  if (!socket || socket.readyState !== socket.OPEN) return;

  const message = {
    type: 'heartbeat',
    timestamp: Date.now(),
  };

  socket.send(JSON.stringify(message));
  logger.debug('[sendHeartbeat] Sent heartbeat to server');
}

module.exports = sendHeartbeat;
