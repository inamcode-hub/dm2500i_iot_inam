// network/ws/sender/sendAck.js
const logger = require('@utils/logger');
const { enqueue } = require('../outgoingQueue');
const { queueAck, markAckSent } = require('../ackTracker');

function sendAck(socket, commandId) {
  const ack = {
    type: 'ack',
    commandId,
    timestamp: Date.now(),
  };

  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(ack));
    markAckSent(commandId);
    logger.debug(`[Ack] Sent for command: ${commandId}`);
  } else {
    enqueue(ack);
    queueAck(commandId, ack);
    logger.warn(`[Ack] Queued (socket closed): ${commandId}`);
  }
}

module.exports = sendAck;
