// network/ws/dispatcher/index.js
const logger = require('@utils/logger');
const handleHeartbeat = require('./types/heartbeat');
const handleCommand = require('./types/command');
const handleSoftwareUpdate = require('./types/softwareUpdate');
const { handleSshAccess } = require('./types/sshAccess');
const { handleTerminalAccess } = require('./types/terminalAccess');
const handleStreamControl = require('../stream/router');
const { handleUpdateApi } = require('./types/updateApi');
const handleAck = require('./types/ack');
const handleHistory = require('./types/history');

function dispatch(message, socket) {
  try {
    const str = Buffer.isBuffer(message) ? message.toString() : message;
    const parsed = typeof str === 'string' ? JSON.parse(str) : str;

    // logger.debug(`[Dispatcher] Dispatching message: ${JSON.stringify(parsed)}`);

    if (!parsed.type) {
      logger.warn('[Dispatcher] Message missing "type" field');
      return;
    }

    switch (parsed.type) {
      case 'heartbeat':
      case 'ping':
        return handleHeartbeat(parsed, socket);

      case 'start_stream':
      case 'stop_stream':
        return handleStreamControl(parsed, socket);
      case 'update_api':
        return handleUpdateApi(parsed, socket);
      case 'command':
        return handleCommand(parsed, socket);
      case 'softwareUpdate':
        return handleSoftwareUpdate(parsed);
      case 'sshAccess':
        return handleSshAccess(parsed);
      case 'terminalAccess':
        return handleTerminalAccess(parsed, socket);
      case 'ack':
        return handleAck(parsed);
      case 'history.request-availability':
      case 'history.request-batch':
      case 'history.batch-ack':
        return handleHistory(parsed, socket);
      default:
        logger.warn(`[Dispatcher] Unknown message type: ${parsed.type}`);
    }
  } catch (err) {
    logger.error(`[Dispatcher] Failed to parse message: ${err.message}`);
  }
}

module.exports = dispatch;
