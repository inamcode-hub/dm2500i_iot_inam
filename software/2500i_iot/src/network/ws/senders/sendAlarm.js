const logger = require('../../../utils/logger');
const { enqueue } = require('../outgoingQueue');
const { isSocketConnected } = require('../connectionState');
const ackTracker = require('../ackTracker');

// We need to get the socket from the client module
let socket = null;

// This will be called by the client when socket is ready
function setSocket(ws) {
  socket = ws;
}

/**
 * Send alarm notification to cloud
 * @param {Object} alarmData - The alarm data to send
 * @param {string} alarmData.action - 'new', 'update', or 'cleared'
 * @param {Object} alarmData.alarm - The alarm object with all details
 * @param {string} alarmData.timestamp - ISO timestamp of the event
 * @returns {Promise<boolean>} - Success status
 */
async function sendAlarm(alarmData) {
  try {
    const message = {
      id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'alarm',
      data: {
        action: alarmData.action,
        alarm: alarmData.alarm,
        timestamp: alarmData.timestamp,
        deviceInfo: {
          deviceId: alarmData.alarm.deviceId,
          serialNumber: alarmData.alarm.serialNumber,
          model: alarmData.alarm.model
        }
      },
      priority: determinePriority(alarmData.alarm),
      timestamp: new Date().toISOString()
    };

    logger.info(`Sending ${alarmData.action} alarm to cloud`, {
      alarmId: alarmData.alarm.id,
      type: alarmData.alarm.type,
      severity: alarmData.alarm.severity
    });

    // Check if socket is connected
    if (!isSocketConnected() || !socket || socket.readyState !== socket.OPEN) {
      logger.warn('WebSocket not connected, queuing alarm', {
        alarmId: alarmData.alarm.id
      });
      
      queueAlarm(message);
      return false;
    }

    // Send via WebSocket
    const messageStr = JSON.stringify(message);
    socket.send(messageStr);
    
    // Track message for ACK with retry capability
    ackTracker.trackMessage(message.id, message, (retryMessage) => {
      if (socket && socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(retryMessage));
        logger.info(`[Retry] Alarm resent: ${retryMessage.id}`, {
          alarmId: retryMessage.data.alarm.id,
          action: retryMessage.data.action
        });
      } else {
        // If socket is down during retry, queue it
        queueAlarm(retryMessage);
      }
    });
    
    logger.info('Alarm sent successfully via WebSocket', {
      alarmId: alarmData.alarm.id,
      action: alarmData.action,
      type: alarmData.alarm.type,
      severity: alarmData.alarm.severity,
      message: alarmData.alarm.message,
      messageSize: messageStr.length,
      messageId: message.id
    });

    return true;
  } catch (error) {
    logger.error('Error sending alarm:', error);
    
    // Try to queue the alarm
    try {
      queueAlarm({
        type: 'alarm',
        data: alarmData,
        timestamp: new Date().toISOString()
      });
    } catch (queueError) {
      logger.error('Failed to queue alarm:', queueError);
    }
    
    return false;
  }
}

/**
 * Queue alarm for later delivery
 * @param {Object} alarmMessage - The formatted alarm message
 */
function queueAlarm(alarmMessage) {
  // Add alarm metadata for queue processing
  const queuedMessage = {
    ...alarmMessage,
    queueMetadata: {
      type: 'alarm',
      priority: alarmMessage.priority || 'high',
      retryCount: 0,
      maxRetries: 5,
      queuedAt: new Date().toISOString()
    }
  };
  
  // Use the existing outgoing queue
  enqueue(queuedMessage);
  
  logger.info('Alarm queued for later delivery', {
    alarmId: alarmMessage.data?.alarm?.id,
    priority: queuedMessage.queueMetadata.priority
  });
}

/**
 * Determine message priority based on alarm severity
 * @param {Object} alarm - The alarm object
 * @returns {string} - Priority level
 */
function determinePriority(alarm) {
  const severityPriority = {
    'critical': 'urgent',
    'fault': 'urgent',
    'warning': 'high',
    'normal': 'medium'
  };

  return severityPriority[alarm.severity] || 'high';
}

/**
 * Send batch of alarms (for recovery after reconnection)
 * @param {Array} alarms - Array of alarm data objects
 * @returns {Promise<Object>} - Results of batch send
 */
async function sendAlarmBatch(alarms) {
  const results = {
    sent: 0,
    failed: 0,
    alarms: []
  };

  for (const alarmData of alarms) {
    try {
      const success = await sendAlarm(alarmData);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
      results.alarms.push({
        alarmId: alarmData.alarm.id,
        success
      });
    } catch (error) {
      logger.error('Error sending alarm in batch:', error);
      results.failed++;
      results.alarms.push({
        alarmId: alarmData.alarm?.id || 'unknown',
        success: false,
        error: error.message
      });
    }
  }

  logger.info('Alarm batch send completed', results);
  return results;
}

module.exports = {
  sendAlarm,
  sendAlarmBatch,
  setSocket
};