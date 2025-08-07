// network/ws/dispatcher/types/history.js
const logger = require('@utils/logger');
const { query } = require('../../../../db/pool');
const { getDeviceInfo } = require('../../../../services/deviceDatabase');
const { enqueue } = require('../../outgoingQueue');
const zlib = require('zlib');
const { promisify } = require('util');
const gzip = promisify(zlib.gzip);

// Helper to send acknowledgment
function sendAck(messageId, socket, success, errorMessage) {
  const ack = {
    type: 'ack',
    messageId,
    success,
    error: errorMessage,
    timestamp: new Date().toISOString()
  };
  enqueue(ack);
}

/**
 * Handle history-related WebSocket commands from cloud
 */
async function handleHistory(message, socket) {
  const { type, messageId, payload = {} } = message;
  
  try {
    switch (type) {
      case 'history.request-availability':
        await handleAvailabilityRequest(messageId, socket);
        break;
        
      case 'history.request-batch':
        await handleBatchRequest(messageId, payload, socket);
        break;
        
      case 'history.batch-ack':
        await handleBatchAck(messageId, payload, socket);
        break;
        
      default:
        logger.warn(`[History] Unknown history command: ${type}`);
        sendAck(messageId, socket, false, 'Unknown history command');
    }
  } catch (error) {
    logger.error(`[History] Error handling ${type}:`, error);
    sendAck(messageId, socket, false, error.message);
  }
}

/**
 * Report data availability to cloud
 */
async function handleAvailabilityRequest(messageId, socket) {
  try {
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = deviceInfo?.serial;
    
    if (!deviceSerial) {
      throw new Error('Device serial not found');
    }
    
    const queryText = `
      SELECT 
        MIN(recorded_at) as oldest_record,
        MAX(recorded_at) as newest_record,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_sync,
        COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed
      FROM history_iot_inam
      WHERE device_serial = $1
    `;
    
    const result = await query(queryText, [deviceSerial]);
    const availability = result.rows[0];
    
    // Send availability report
    const report = {
      type: 'history.availability-report',
      messageId,
      payload: {
        deviceSerial,
        availability: {
          oldestRecord: availability.oldest_record,
          newestRecord: availability.newest_record,
          totalRecords: parseInt(availability.total_records),
          pendingSync: parseInt(availability.pending_sync),
          synced: parseInt(availability.synced),
          failed: parseInt(availability.failed)
        },
        timestamp: new Date().toISOString()
      }
    };
    
    logger.info(`[History] Sending availability report: ${availability.pending_sync} records pending`);
    enqueue(report);
    sendAck(messageId, socket, true);
    
  } catch (error) {
    logger.error('[History] Error getting availability:', error);
    sendAck(messageId, socket, false, error.message);
  }
}

/**
 * Send batch of history records to cloud
 */
async function handleBatchRequest(messageId, payload, socket) {
  try {
    const { startTime, endTime, maxRecords = 200 } = payload;
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = deviceInfo?.serial;
    
    if (!deviceSerial) {
      throw new Error('Device serial not found');
    }
    
    if (!startTime || !endTime) {
      throw new Error('startTime and endTime are required');
    }
    
    // Mark records as syncing
    const updateQuery = `
      UPDATE history_iot_inam
      SET sync_status = 'syncing'
      WHERE device_serial = $1
      AND recorded_at >= $2
      AND recorded_at <= $3
      AND sync_status = 'pending'
      AND sync_id IN (
        SELECT sync_id FROM history_iot_inam
        WHERE device_serial = $1
        AND recorded_at >= $2
        AND recorded_at <= $3
        AND sync_status = 'pending'
        ORDER BY recorded_at ASC
        LIMIT $4
      )
      RETURNING sync_id
    `;
    
    const updateResult = await query(updateQuery, [
      deviceSerial,
      startTime,
      endTime,
      maxRecords
    ]);
    
    const syncIds = updateResult.rows.map(row => row.sync_id);
    
    // Fetch the records being synced
    const fetchQuery = `
      SELECT 
        sync_id,
        recorded_at,
        aggregation_start,
        aggregation_end,
        product,
        mode,
        dryer_state,
        inlet_moisture,
        outlet_moisture,
        inlet_temperature,
        outlet_temperature,
        discharge_rate,
        moisture_target,
        apt,
        sample_count,
        data_quality,
        created_at
      FROM history_iot_inam
      WHERE sync_id = ANY($1)
      ORDER BY recorded_at ASC
    `;
    
    const fetchResult = await query(fetchQuery, [syncIds]);
    const records = fetchResult.rows;
    
    logger.info(`[History] Sending batch of ${records.length} records`);
    
    // Compress the data
    const dataBuffer = Buffer.from(JSON.stringify(records));
    const compressed = await gzip(dataBuffer);
    const compressionRatio = (1 - compressed.length / dataBuffer.length) * 100;
    
    logger.debug(`[History] Compression ratio: ${compressionRatio.toFixed(1)}%`);
    
    // Send batch data
    const batchData = {
      type: 'history.batch-data',
      messageId,
      payload: {
        deviceSerial,
        batchId: `${deviceSerial}_${Date.now()}`,
        recordCount: records.length,
        syncIds,
        compressed: true,
        data: compressed.toString('base64'),
        startTime: records[0]?.recorded_at,
        endTime: records[records.length - 1]?.recorded_at,
        timestamp: new Date().toISOString()
      }
    };
    
    enqueue(batchData);
    sendAck(messageId, socket, true);
    
  } catch (error) {
    logger.error('[History] Error sending batch:', error);
    sendAck(messageId, socket, false, error.message);
  }
}

/**
 * Handle batch acknowledgment from cloud
 */
async function handleBatchAck(messageId, payload, socket) {
  try {
    const { syncIds, status, error } = payload;
    
    if (!syncIds || !Array.isArray(syncIds)) {
      throw new Error('syncIds array is required');
    }
    
    // Get device serial
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = deviceInfo?.serial;
    
    if (!deviceSerial) {
      throw new Error('Device serial not found');
    }
    
    const newStatus = status === 'success' ? 'synced' : 'failed';
    
    // Update sync status
    const updateQuery = `
      UPDATE history_iot_inam
      SET 
        sync_status = $1,
        synced_at = CURRENT_TIMESTAMP,
        sync_batch_id = $3
      WHERE sync_id = ANY($2)
    `;
    
    const result = await query(updateQuery, [
      newStatus,
      syncIds,
      payload.batchId || `batch_${Date.now()}`
    ]);
    
    logger.info(`[History] Batch acknowledged: ${result.rowCount} records marked as ${newStatus}`);
    
    // Log sync event
    const logQuery = `
      INSERT INTO history_sync_log_inam (
        device_serial,
        batch_id,
        sync_start,
        sync_end,
        records_synced,
        status,
        error_message
      ) VALUES ($1, $2, CURRENT_TIMESTAMP - INTERVAL '1 minute', CURRENT_TIMESTAMP, $3, $4, $5)
    `;
    
    await query(logQuery, [
      deviceSerial,
      payload.batchId || `${deviceSerial}_${Date.now()}`,
      syncIds.length,
      status === 'success' ? 'success' : 'failed',
      error || null
    ]);
    
    sendAck(messageId, socket, true);
    
  } catch (error) {
    logger.error('[History] Error handling batch ack:', error);
    sendAck(messageId, socket, false, error.message);
  }
}

module.exports = handleHistory;