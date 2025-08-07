const logger = require('@utils/logger');
const { save } = require('./persistentQueue');

const memoryQueue = [];
let activeSocket = null;

function setSocket(socket) {
  activeSocket = socket;
}

function enqueue(message) {
  // If socket is connected and ready, send immediately
  if (activeSocket && activeSocket.readyState === activeSocket.OPEN) {
    try {
      const messageStr = JSON.stringify(message);
      activeSocket.send(messageStr);
      logger.debug('[Queue] Message sent immediately:', {
        type: message.type,
        size: messageStr.length
      });
      return;
    } catch (error) {
      logger.error('[Queue] Error sending message immediately:', error);
      // Fall through to queue the message
    }
  }
  
  // Otherwise queue for later
  memoryQueue.push(message);
  save([...memoryQueue]); // Keep disk in sync
  logger.debug('[Queue] Message queued in memory and persisted');
}

function flush(socket) {
  if (!socket || socket.readyState !== socket.OPEN) {
    logger.debug('[Queue] Cannot flush — socket not open');
    return;
  }

  logger.info(`[Queue] Flushing ${memoryQueue.length} queued messages`);
  while (memoryQueue.length > 0) {
    const msg = memoryQueue.shift();
    
    // Log the full message for debugging
    logger.info('[Queue] Processing queued message:', JSON.stringify(msg, null, 2));
    
    try {
      const messageStr = JSON.stringify(msg);
      socket.send(messageStr);
      
      logger.info('[Queue] Successfully sent queued message:', {
        type: msg.type,
        id: msg.id,
        priority: msg.priority,
        size: messageStr.length
      });
    } catch (error) {
      logger.error('[Queue] Error sending queued message:', error);
    }
  }

  save([]); // Clear persistent queue
}

module.exports = { enqueue, flush, setSocket };
