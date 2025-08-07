const logger = require('@utils/logger');
const sendAck = require('../../sender/sendAck');

function handleCommand(message, socket) {
  const commandType = message.commandType || message.command;
  
  if (!commandType || !message.id) {
    logger.warn('[Command] Missing commandType/command or id');
    return;
  }

  logger.info(`[Command] Received: ${commandType} (ID: ${message.id})`);
  sendAck(socket, message.id); // ACK is tracked automatically

  // Handle command
  switch (commandType) {
    case 'reboot':
      logger.warn('[Command] Executing reboot');
      break;
    case 'reload_config':
      logger.info('[Command] Reloading config...');
      break;
    case 'terminalAccess':
      logger.info('[Command] Handling terminalAccess command');
      const { handleTerminalAccess } = require('./terminalAccess');
      return handleTerminalAccess(message, socket);
    default:
      logger.warn(`[Command] Unknown command: ${commandType}`);
  }
}

module.exports = handleCommand;
