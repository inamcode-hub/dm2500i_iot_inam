// network/ws/senders/sendSyncState.js
const logger = require('@utils/logger');
const { enqueue } = require('../outgoingQueue');
const { query } = require('../../../db/pool');
const { getDeviceInfo } = require('../../../services/deviceDatabase');

/**
 * Send device sync state to cloud
 */
async function sendSyncState() {
  try {
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = deviceInfo?.serial;
    
    if (!deviceSerial) {
      logger.error('[SendSyncState] Device serial not found');
      return;
    }
    
    // Get sync statistics
    const syncStatsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_records,
        COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_records,
        COUNT(*) FILTER (WHERE sync_status = 'syncing') as syncing_records,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_records,
        COUNT(*) as total_records,
        MIN(recorded_at) FILTER (WHERE sync_status = 'pending') as oldest_pending,
        MAX(recorded_at) FILTER (WHERE sync_status = 'pending') as newest_pending,
        MAX(synced_at) as last_sync_time
      FROM history_iot_inam
      WHERE device_serial = $1
    `;
    
    const result = await query(syncStatsQuery, [deviceSerial]);
    const stats = result.rows[0];
    
    // Calculate sync progress
    const syncProgress = stats.total_records > 0 
      ? Math.round((parseInt(stats.synced_records) / parseInt(stats.total_records)) * 100) 
      : 0;
    
    // Prepare sync state message
    const syncState = {
      type: 'device_sync_states',
      deviceSerial,  // Include device serial number
      payload: {
        pendingRecords: parseInt(stats.pending_records) || 0,
        syncedRecords: parseInt(stats.synced_records) || 0,
        syncingRecords: parseInt(stats.syncing_records) || 0,
        failedRecords: parseInt(stats.failed_records) || 0,
        totalRecords: parseInt(stats.total_records) || 0,
        oldestPending: stats.oldest_pending,
        newestPending: stats.newest_pending,
        lastSyncTime: stats.last_sync_time,
        syncProgress,
        timestamp: new Date().toISOString()
      }
    };
    
    logger.debug(`[SendSyncState] Sending sync state for ${deviceSerial}: ${stats.pending_records} pending`);
    enqueue(syncState);
    
  } catch (error) {
    logger.error('[SendSyncState] Error sending sync state:', error);
  }
}

module.exports = { sendSyncState };