// network/ws/ackTracker.js
const logger = require('@utils/logger');
const { enqueue } = require('./outgoingQueue');
const EventEmitter = require('events');

const pendingAcks = new Map(); // commandId → ackMessage
const pendingMessages = new Map(); // messageId → { message, timeout, retryCount, timestamp, retrySender }

// ACK tracking configuration
const ACK_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

const ackTracker = new EventEmitter();

function queueAck(commandId, ackMessage) {
  pendingAcks.set(commandId, ackMessage);
  logger.debug(`[AckTracker] Queued ack for ${commandId}`);
}

function markAckSent(commandId) {
  if (pendingAcks.has(commandId)) {
    pendingAcks.delete(commandId);
    logger.debug(`[AckTracker] Cleared ack for ${commandId}`);
  }
}

function flushPending(socket) {
  for (const [commandId, ack] of pendingAcks.entries()) {
    if (socket && socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(ack));
      logger.info(`[AckTracker] Retried ack for ${commandId}`);
      pendingAcks.delete(commandId);
    } else {
      enqueue(ack); // back up again
    }
  }
}

/**
 * Track a message that expects an ACK from the cloud
 * @param {string} messageId - Unique message ID
 * @param {Object} message - The full message object
 * @param {Function} retrySender - Function to call for retry
 */
function trackMessage(messageId, message, retrySender) {
  if (pendingMessages.has(messageId)) {
    logger.warn(`[AckTracker] Message ${messageId} already being tracked`);
    return;
  }

  const timeout = setTimeout(() => {
    handleTimeout(messageId, message, retrySender);
  }, ACK_TIMEOUT);

  pendingMessages.set(messageId, {
    message,
    timeout,
    retryCount: 0,
    timestamp: Date.now(),
    retrySender
  });

  logger.debug(`[AckTracker] Tracking message ${messageId} for ACK`);
}

/**
 * Mark a message as acknowledged by the cloud
 * @param {string} messageId - The message ID that was acknowledged
 */
function acknowledgeMessage(messageId) {
  const pending = pendingMessages.get(messageId);
  
  if (!pending) {
    logger.debug(`[AckTracker] Received ACK for unknown message: ${messageId}`);
    return;
  }

  // Clear the timeout
  clearTimeout(pending.timeout);
  
  // Remove from pending
  pendingMessages.delete(messageId);
  
  const duration = Date.now() - pending.timestamp;
  logger.info(`[AckTracker] Message ${messageId} acknowledged after ${duration}ms`);
  
  // Emit event for successful ACK
  ackTracker.emit('acknowledged', {
    messageId,
    duration,
    retryCount: pending.retryCount
  });
}

/**
 * Handle timeout for a message that didn't receive ACK
 * @param {string} messageId - The message ID that timed out
 * @param {Object} message - The original message
 * @param {Function} retrySender - Function to retry sending
 */
function handleTimeout(messageId, message, retrySender) {
  const pending = pendingMessages.get(messageId);
  
  if (!pending) {
    return; // Already acknowledged
  }

  pending.retryCount++;
  
  if (pending.retryCount <= MAX_RETRIES) {
    logger.warn(`[AckTracker] Message ${messageId} timed out, retrying (${pending.retryCount}/${MAX_RETRIES})`, {
      messageType: message.type,
      alarmId: message.data?.alarm?.id
    });
    
    // Schedule retry
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        // Update timeout for next retry
        const newTimeout = setTimeout(() => {
          handleTimeout(messageId, message, retrySender);
        }, ACK_TIMEOUT);
        
        pending.timeout = newTimeout;
        
        // Attempt retry
        retrySender(message);
        
        // Emit retry event
        ackTracker.emit('retry', {
          messageId,
          retryCount: pending.retryCount,
          message
        });
      }
    }, RETRY_DELAY);
    
  } else {
    // Max retries exceeded
    logger.error(`[AckTracker] Message ${messageId} failed after ${MAX_RETRIES} retries`, {
      messageType: message.type,
      alarmId: message.data?.alarm?.id
    });
    
    // Clear from pending
    pendingMessages.delete(messageId);
    
    // Emit failure event
    ackTracker.emit('failed', {
      messageId,
      message,
      reason: 'max_retries_exceeded'
    });
  }
}

/**
 * Get current pending message count
 */
function getPendingCount() {
  return pendingMessages.size;
}

/**
 * Clear all pending messages (useful for cleanup on disconnect)
 */
function clearAllPending() {
  for (const [messageId, pending] of pendingMessages) {
    clearTimeout(pending.timeout);
  }
  pendingMessages.clear();
  logger.info('[AckTracker] Cleared all pending messages');
}

module.exports = {
  queueAck,
  markAckSent,
  flushPending,
  trackMessage,
  acknowledgeMessage,
  getPendingCount,
  clearAllPending,
  events: ackTracker
};
