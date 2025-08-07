const express = require('express');
const router = express.Router();
const historyCollector = require('../../services/historyCollector');
const { query } = require('../../db/pool');
const { getDeviceInfo } = require('../../services/deviceDatabase');
const logger = require('../../utils/logger');

/**
 * @route GET /api/v1/history/status
 * @desc Get history collection and sync status
 */
router.get('/status', async (req, res) => {
  try {
    const collectorStatus = await historyCollector.getStatus();
    
    // Get sync status if available
    let syncStatus = {};
    if (global.historySync) {
      syncStatus = await global.historySync.getStatus();
    }

    res.json({
      success: true,
      data: {
        collector: collectorStatus,
        sync: syncStatus
      }
    });
  } catch (error) {
    logger.error('Error getting history status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/history/collector/start
 * @desc Start history collection
 */
router.post('/collector/start', async (req, res) => {
  try {
    await historyCollector.start();
    res.json({
      success: true,
      message: 'History collection started'
    });
  } catch (error) {
    logger.error('Error starting history collection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/history/collector/stop
 * @desc Stop history collection
 */
router.post('/collector/stop', async (req, res) => {
  try {
    historyCollector.stop();
    res.json({
      success: true,
      message: 'History collection stopped'
    });
  } catch (error) {
    logger.error('Error stopping history collection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/history/availability
 * @desc Get data availability for sync
 */
router.get('/availability', async (req, res) => {
  try {
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = req.query.deviceSerial || deviceInfo?.serial;
    
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
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error getting data availability:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/history/batch
 * @desc Get batch of history records for sync
 */
router.post('/batch', async (req, res) => {
  try {
    const { startTime, endTime, limit = 1000 } = req.body;
    const deviceSerial = req.body.deviceSerial || (await getDeviceInfo())?.serial;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'startTime and endTime are required'
      });
    }

    const queryText = `
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
      WHERE device_serial = $1
      AND recorded_at > $2
      AND recorded_at <= $3
      AND sync_status = 'pending'
      ORDER BY recorded_at ASC
      LIMIT $4
    `;

    const result = await query(queryText, [
      deviceSerial,
      startTime,
      endTime,
      limit
    ]);

    res.json({
      success: true,
      data: {
        deviceSerial,
        recordCount: result.rows.length,
        records: result.rows
      }
    });
  } catch (error) {
    logger.error('Error getting history batch:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/history/recent
 * @desc Get recent history records
 */
router.get('/recent', async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const deviceSerial = req.query.deviceSerial || (await getDeviceInfo())?.serial;

    const queryText = `
      SELECT 
        recorded_at,
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
        sync_status
      FROM history_iot_inam
      WHERE device_serial = $1
      AND recorded_at > CURRENT_TIMESTAMP - INTERVAL '${parseInt(hours)} hours'
      ORDER BY recorded_at DESC
      LIMIT $2
    `;

    const result = await query(queryText, [deviceSerial, limit]);

    res.json({
      success: true,
      data: {
        deviceSerial,
        recordCount: result.rows.length,
        records: result.rows
      }
    });
  } catch (error) {
    logger.error('Error getting recent history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/history/statistics
 * @desc Get history statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const deviceSerial = req.query.deviceSerial || (await getDeviceInfo())?.serial;

    const queryText = `
      SELECT 
        DATE(recorded_at) as date,
        COUNT(*) as record_count,
        AVG(inlet_moisture) as avg_inlet_moisture,
        AVG(outlet_moisture) as avg_outlet_moisture,
        AVG(discharge_rate) as avg_discharge_rate,
        AVG(data_quality) as avg_data_quality,
        COUNT(*) FILTER (WHERE sync_status = 'synced') as synced_count,
        COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_count
      FROM history_iot_inam
      WHERE device_serial = $1
      AND recorded_at > CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
    `;

    const result = await query(queryText, [deviceSerial]);

    res.json({
      success: true,
      data: {
        deviceSerial,
        days: parseInt(days),
        statistics: result.rows
      }
    });
  } catch (error) {
    logger.error('Error getting history statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/history/cleanup
 * @desc Manually trigger partition cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    await historyCollector.cleanupOldPartitions();
    
    res.json({
      success: true,
      message: 'Partition cleanup completed'
    });
  } catch (error) {
    logger.error('Error running cleanup:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/history/partitions
 * @desc Get partition information
 */
router.get('/partitions', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables
      WHERE tablename LIKE 'history_iot_%'
      AND tablename ~ '\\d{4}_\\d{2}$'
      AND tablename NOT LIKE '%_inam%'
      ORDER BY tablename
    `;

    const result = await query(queryText);

    res.json({
      success: true,
      data: {
        partitionCount: result.rows.length,
        partitions: result.rows
      }
    });
  } catch (error) {
    logger.error('Error getting partition info:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/history/sync-status
 * @desc Get comprehensive sync status for this device
 */
router.get('/sync-status', async (req, res) => {
  try {
    const deviceInfo = await getDeviceInfo();
    const deviceSerial = deviceInfo?.serial;
    
    if (!deviceSerial) {
      return res.status(400).json({
        success: false,
        error: 'Device serial not found'
      });
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
    
    const syncStats = await query(syncStatsQuery, [deviceSerial]);
    const stats = syncStats.rows[0];
    
    // Get sync history
    const syncHistoryQuery = `
      SELECT 
        batch_id,
        sync_start,
        sync_end,
        records_synced,
        status,
        error_message,
        EXTRACT(EPOCH FROM (sync_end - sync_start)) * 1000 as duration_ms
      FROM history_sync_log_inam
      WHERE batch_id LIKE $1
      ORDER BY sync_end DESC
      LIMIT 10
    `;
    
    const syncHistory = await query(syncHistoryQuery, [`${deviceSerial}%`]);
    
    // Get data by date breakdown
    const dateBreakdownQuery = `
      SELECT 
        DATE(recorded_at) as date,
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE sync_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
        COUNT(*) FILTER (WHERE sync_status = 'failed') as failed
      FROM history_iot_inam
      WHERE device_serial = $1
        AND recorded_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(recorded_at)
      ORDER BY date DESC
    `;
    
    const dateBreakdown = await query(dateBreakdownQuery, [deviceSerial]);
    
    // Calculate sync performance metrics
    const performanceQuery = `
      SELECT 
        AVG(records_synced) as avg_batch_size,
        AVG(EXTRACT(EPOCH FROM (sync_end - sync_start))) as avg_sync_duration,
        SUM(records_synced) FILTER (WHERE sync_end > NOW() - INTERVAL '24 hours') as last_24h_synced,
        COUNT(*) FILTER (WHERE status = 'success' AND sync_end > NOW() - INTERVAL '24 hours') as last_24h_batches
      FROM history_sync_log_inam
      WHERE batch_id LIKE $1
        AND sync_end > NOW() - INTERVAL '7 days'
    `;
    
    const performance = await query(performanceQuery, [`${deviceSerial}%`]);
    const perfMetrics = performance.rows[0];
    
    // Check WebSocket connection status
    const wsClient = require('../../network/ws/wsClientWrapper');
    const isConnected = wsClient.isConnected();
    const connectionState = wsClient.getStatus();
    
    // Get offline queue status
    const offlineQueue = require('../../network/ws/persistentQueue');
    const queueData = offlineQueue.load() || [];
    const queueStatus = {
      size: queueData.length,
      oldest: queueData.length > 0 ? queueData[0].timestamp : null,
      newest: queueData.length > 0 ? queueData[queueData.length - 1].timestamp : null
    };
    
    res.json({
      success: true,
      data: {
        deviceSerial,
        connectionStatus: {
          websocket: isConnected,
          state: connectionState.readyState,
          connected: connectionState.connected,
          url: connectionState.url
        },
        syncStatistics: {
          pendingRecords: parseInt(stats.pending_records) || 0,
          syncedRecords: parseInt(stats.synced_records) || 0,
          syncingRecords: parseInt(stats.syncing_records) || 0,
          failedRecords: parseInt(stats.failed_records) || 0,
          totalRecords: parseInt(stats.total_records) || 0,
          oldestPending: stats.oldest_pending,
          newestPending: stats.newest_pending,
          lastSyncTime: stats.last_sync_time,
          syncProgress: stats.total_records > 0 ? 
            Math.round((parseInt(stats.synced_records) / parseInt(stats.total_records)) * 100) : 0
        },
        performance: {
          avgBatchSize: Math.round(parseFloat(perfMetrics.avg_batch_size) || 0),
          avgSyncDuration: parseFloat(perfMetrics.avg_sync_duration) || 0,
          last24Hours: {
            recordsSynced: parseInt(perfMetrics.last_24h_synced) || 0,
            batches: parseInt(perfMetrics.last_24h_batches) || 0,
            avgRecordsPerHour: Math.round((parseInt(perfMetrics.last_24h_synced) || 0) / 24)
          }
        },
        queueStatus: {
          size: queueStatus.size || 0,
          oldest: queueStatus.oldest,
          newest: queueStatus.newest
        },
        recentSync: syncHistory.rows.map(row => ({
          batchId: row.batch_id,
          startTime: row.sync_start,
          endTime: row.sync_end,
          duration: parseInt(row.duration_ms) || 0,
          recordsSynced: parseInt(row.records_synced) || 0,
          status: row.status,
          error: row.error_message
        })),
        dateBreakdown: dateBreakdown.rows.map(row => ({
          date: row.date,
          total: parseInt(row.total_records) || 0,
          pending: parseInt(row.pending) || 0,
          synced: parseInt(row.synced) || 0,
          failed: parseInt(row.failed) || 0,
          syncRate: row.total_records > 0 ? 
            Math.round((parseInt(row.synced) / parseInt(row.total_records)) * 100) : 0
        })),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;