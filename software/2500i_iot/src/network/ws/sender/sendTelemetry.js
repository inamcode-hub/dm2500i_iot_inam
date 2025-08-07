// network/ws/sender/sendTelemetry.js
const logger = require('@utils/logger');
const { enqueue } = require('../outgoingQueue');

let buffer = [];
const MAX_BATCH_SIZE = 10;

function collectTelemetry(data) {
  buffer.push(data);

  if (buffer.length >= MAX_BATCH_SIZE) {
    flushTelemetry();
  }
}

function flushTelemetry(socket) {
  if (buffer.length === 0) return;

  const message = {
    type: 'telemetry',
    payload: [...buffer],
    timestamp: Date.now(),
  };

  if (socket && socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
    logger.debug(`[Telemetry] Batch of ${buffer.length} sent`);
  } else {
    enqueue(message);
    logger.warn('[Telemetry] Batch queued (socket not open)');
  }

  buffer = []; // Clear buffer
}

module.exports = {
  collectTelemetry,
  flushTelemetry,
};
