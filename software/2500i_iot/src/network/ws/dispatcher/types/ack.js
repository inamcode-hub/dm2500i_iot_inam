// network/ws/dispatcher/types/ack.js
const logger = require('@utils/logger');
const ackTracker = require('../../ackTracker');

/**
 * Handle acknowledgment messages from the cloud
 * @param {Object} message - ACK message
 * @param {string} message.type - 'ack'
 * @param {string} message.commandId - Original command ID being acknowledged
 * @param {number} message.timestamp - Timestamp of acknowledgment
 * @param {Object} [message.data] - Additional acknowledgment data
 */
function handleAck(message) {
  try {
    const { commandId, timestamp, data } = message;
    
    logger.info(`[ACK Handler] Received acknowledgment for command: ${commandId}`, {
      commandId,
      timestamp: new Date(timestamp).toISOString(),
      data
    });
    
    // Mark the message as acknowledged in the ACK tracker
    ackTracker.acknowledgeMessage(commandId);
    
    // Extract the message type from commandId (e.g., "alarm_1752333101277_02z80ti1x" -> "alarm")
    const messageType = commandId ? commandId.split('_')[0] : 'unknown';
    
    switch (messageType) {
      case 'alarm':
        logger.info('[ACK Handler] Alarm acknowledged by cloud', {
          commandId,
          acknowledgedAt: new Date(timestamp).toISOString()
        });
        break;
        
      case 'command':
        logger.info('[ACK Handler] Command acknowledged by cloud', {
          commandId,
          acknowledgedAt: new Date(timestamp).toISOString()
        });
        break;
        
      default:
        logger.debug('[ACK Handler] Generic acknowledgment received', {
          commandId,
          messageType
        });
    }
    
  } catch (error) {
    logger.error('[ACK Handler] Error processing acknowledgment:', error);
  }
}

module.exports = handleAck;