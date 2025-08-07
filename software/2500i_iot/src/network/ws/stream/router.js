// network/ws/stream/router.js
const streamManager = require('./streamManager');
const sendAck = require('../sender/sendAck');
const logger = require('@utils/logger');

function handleStreamControl(message, socket) {
  const { type, commandId, streamType } = message;

  if (!commandId || !streamType) {
    logger.warn(`[StreamRouter] Missing commandId or streamType`);
    return;
  }

  if (type === 'start_stream') {
    streamManager.start(streamType, socket);
    sendAck(socket, commandId);
    return;
  }

  if (type === 'stop_stream') {
    streamManager.stop(streamType);
    sendAck(socket, commandId);
    return;
  }

  logger.warn(`[StreamRouter] Unknown stream control type: ${type}`);
}

module.exports = handleStreamControl;
