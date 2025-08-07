const { v4: uuidv4 } = require('uuid');
const zlib = require('zlib');
const { promisify } = require('util');
const db = require('../config/database');
const logger = require('../utils/logger');
const config = require('../config/historyConfig');
const { getDeviceSerial } = require('../utils/deviceInfo');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

class HistorySync {
  constructor(websocketClient) {
    this.wsClient = websocketClient;
    this.deviceSerial = null;
    this.isSyncing = false;
    this.syncInterval = null;
    this.retryInterval = null;
    this.currentBatch = null;
  }

  async initialize() {
    try {
      this.deviceSerial = await getDeviceSerial();
      if (!this.deviceSerial) {
        throw new Error('No device serial found for history sync');
      }

      // Register WebSocket message handlers
      this.registerMessageHandlers();

      logger.info(`History sync initialized for device: ${this.deviceSerial}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize history sync:', error);
      throw error;
    }
  }

  registerMessageHandlers() {
    if (!this.wsClient) return;

    // Handle history availability request
    this.wsClient.on('request-history-availability', async (data) => {
      const availability = await this.getDataAvailability();
      this.wsClient.send({
        type: 'history-availability',
        deviceId: this.deviceSerial,
        data: availability
      });
    });

    // Handle history batch request
    this.wsClient.on('request-history-batch', async (data) => {
      await this.sendBatchToCloud(data);
    });

    // Handle sync control commands
    this.wsClient.on('history-sync-control', (data) => {
      if (data.command === 'pause') {
        this.pauseSync();
      } else if (data.command === 'resume') {
        this.resumeSync();
      }
    });
  }

  async getDataAvailability() {
    try {
      const query = `
        SELECT 
          MIN(recorded_at) as oldest_record,
          MAX(recorded_at) as newest_record,
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_records,
          COUNT(*) FILTER (WHERE sync_status = 'failed' AND sync_attempts < 3) as retry_records
        FROM history_iot
        WHERE device_serial = $1
      `;

      const result = await db.query(query, [this.deviceSerial]);
      const data = result.rows[0];

      return {
        oldestRecord: data.oldest_record,
        newestRecord: data.newest_record,
        totalRecords: parseInt(data.total_records),
        pendingRecords: parseInt(data.pending_records),
        retryRecords: parseInt(data.retry_records),
        deviceTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    } catch (error) {
      logger.error('Error getting data availability:', error);
      throw error;
    }
  }

  async getPendingRecords(startTime, endTime, limit) {
    try {
      const query = `
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
        FROM history_iot
        WHERE device_serial = $1
        AND recorded_at > $2
        AND recorded_at <= $3
        AND (sync_status = 'pending' OR (sync_status = 'failed' AND sync_attempts < 3))
        ORDER BY recorded_at ASC
        LIMIT $4
        FOR UPDATE SKIP LOCKED
      `;

      const result = await db.query(query, [
        this.deviceSerial,
        startTime,
        endTime,
        limit
      ]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting pending records:', error);
      throw error;
    }
  }

  async markRecordsAsSyncing(syncIds, batchId) {
    try {
      const query = `
        UPDATE history_iot
        SET 
          sync_status = 'syncing',
          sync_batch_id = $1,
          sync_attempts = sync_attempts + 1
        WHERE sync_id = ANY($2::uuid[])
      `;

      await db.query(query, [batchId, syncIds]);
    } catch (error) {
      logger.error('Error marking records as syncing:', error);
      throw error;
    }
  }

  async markRecordsAsSynced(batchId) {
    try {
      const query = `
        UPDATE history_iot
        SET 
          sync_status = 'synced',
          synced_at = CURRENT_TIMESTAMP
        WHERE sync_batch_id = $1
      `;

      await db.query(query, [batchId]);
    } catch (error) {
      logger.error('Error marking records as synced:', error);
      throw error;
    }
  }

  async markRecordsAsFailed(batchId, errorMessage) {
    try {
      const query = `
        UPDATE history_iot
        SET 
          sync_status = CASE
            WHEN sync_attempts >= 3 THEN 'failed'
            ELSE 'pending'
          END
        WHERE sync_batch_id = $1
      `;

      await db.query(query, [batchId]);

      // Log sync failure
      await this.logSyncAttempt(batchId, 'failed', errorMessage);
    } catch (error) {
      logger.error('Error marking records as failed:', error);
      throw error;
    }
  }

  async logSyncAttempt(batchId, status, errorMessage = null) {
    try {
      const query = `
        INSERT INTO history_sync_log (
          device_serial, sync_batch_id, status, error_message
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (sync_batch_id) DO UPDATE
        SET 
          status = $3,
          error_message = $4,
          completed_at = CASE WHEN $3 IN ('completed', 'failed') THEN CURRENT_TIMESTAMP ELSE NULL END
      `;

      await db.query(query, [this.deviceSerial, batchId, status, errorMessage]);
    } catch (error) {
      logger.error('Error logging sync attempt:', error);
    }
  }

  async compressData(data) {
    try {
      const jsonString = JSON.stringify(data);
      const compressed = await gzip(jsonString);
      return compressed.toString('base64');
    } catch (error) {
      logger.error('Error compressing data:', error);
      throw error;
    }
  }

  async sendBatchToCloud(request) {
    const batchId = `BATCH_${this.deviceSerial}_${Date.now()}`;
    
    try {
      // Get records to sync
      const records = await this.getPendingRecords(
        request.startTime,
        request.endTime,
        request.maxRecords || config.sync.batch.maxSize
      );

      if (records.length === 0) {
        logger.info('No records to sync');
        return;
      }

      // Mark records as syncing
      const syncIds = records.map(r => r.sync_id);
      await this.markRecordsAsSyncing(syncIds, batchId);

      // Log sync start
      await this.logSyncAttempt(batchId, 'started');

      // Prepare data for cloud
      const payload = {
        deviceId: this.deviceSerial,
        batchId: batchId,
        recordCount: records.length,
        compressed: config.sync.batch.compressionEnabled,
        data: records
      };

      // Compress if enabled
      if (config.sync.batch.compressionEnabled) {
        payload.data = await this.compressData(records);
      }

      // Send to cloud via WebSocket
      this.wsClient.send({
        type: 'history-batch',
        deviceId: this.deviceSerial,
        data: payload
      });

      // Wait for acknowledgment (with timeout)
      const ackTimeout = setTimeout(async () => {
        await this.markRecordsAsFailed(batchId, 'Acknowledgment timeout');
      }, config.sync.intervals.maxSyncDurationMs);

      // Store timeout for cleanup
      this.currentBatch = { batchId, ackTimeout };

      logger.info(`Sent batch ${batchId} with ${records.length} records`);
    } catch (error) {
      logger.error(`Error sending batch ${batchId}:`, error);
      await this.markRecordsAsFailed(batchId, error.message);
    }
  }

  async handleBatchAcknowledgment(ack) {
    if (!this.currentBatch || ack.batchId !== this.currentBatch.batchId) {
      logger.warn(`Received ack for unknown batch: ${ack.batchId}`);
      return;
    }

    // Clear timeout
    clearTimeout(this.currentBatch.ackTimeout);

    if (ack.success) {
      await this.markRecordsAsSynced(ack.batchId);
      await this.logSyncAttempt(ack.batchId, 'completed');
      logger.info(`Batch ${ack.batchId} successfully synced`);
    } else {
      await this.markRecordsAsFailed(ack.batchId, ack.error);
      logger.error(`Batch ${ack.batchId} sync failed: ${ack.error}`);
    }

    this.currentBatch = null;
  }

  async performSync() {
    if (this.isSyncing) {
      logger.debug('Sync already in progress, skipping');
      return;
    }

    this.isSyncing = true;

    try {
      // Report data availability
      const availability = await this.getDataAvailability();
      
      if (availability.pendingRecords < config.sync.batch.minSize) {
        logger.debug('Not enough records for sync');
        return;
      }

      // Request sync from cloud
      this.wsClient.send({
        type: 'request-history-sync',
        deviceId: this.deviceSerial,
        data: availability
      });
    } catch (error) {
      logger.error('Error performing sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  start() {
    if (!config.sync.enabled) {
      logger.info('History sync is disabled in configuration');
      return;
    }

    // Start regular sync interval
    this.syncInterval = setInterval(
      () => this.performSync(),
      config.sync.intervals.normalSyncMinutes * 60 * 1000
    );

    // Start retry interval for failed records
    this.retryInterval = setInterval(
      () => this.retryFailedRecords(),
      config.sync.intervals.failedRetryMinutes * 60 * 1000
    );

    logger.info('History sync started');
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }

    if (this.currentBatch) {
      clearTimeout(this.currentBatch.ackTimeout);
      this.currentBatch = null;
    }

    logger.info('History sync stopped');
  }

  pauseSync() {
    this.stop();
    logger.info('History sync paused');
  }

  resumeSync() {
    this.start();
    logger.info('History sync resumed');
  }

  async retryFailedRecords() {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM history_iot
        WHERE device_serial = $1
        AND sync_status = 'failed'
        AND sync_attempts < 3
      `;

      const result = await db.query(query, [this.deviceSerial]);
      const failedCount = parseInt(result.rows[0].count);

      if (failedCount > 0) {
        logger.info(`Retrying ${failedCount} failed records`);
        
        // Reset failed records to pending for retry
        await db.query(`
          UPDATE history_iot
          SET sync_status = 'pending'
          WHERE device_serial = $1
          AND sync_status = 'failed'
          AND sync_attempts < 3
        `, [this.deviceSerial]);

        // Trigger sync
        await this.performSync();
      }
    } catch (error) {
      logger.error('Error retrying failed records:', error);
    }
  }

  async getStatus() {
    try {
      const statusQuery = `
        SELECT 
          sync_status,
          COUNT(*) as count,
          MIN(recorded_at) as oldest,
          MAX(recorded_at) as newest
        FROM history_iot
        WHERE device_serial = $1
        GROUP BY sync_status
      `;

      const result = await db.query(statusQuery, [this.deviceSerial]);
      
      const status = {
        isRunning: !!this.syncInterval,
        isSyncing: this.isSyncing,
        currentBatch: this.currentBatch?.batchId,
        breakdown: {}
      };

      result.rows.forEach(row => {
        status.breakdown[row.sync_status] = {
          count: parseInt(row.count),
          oldest: row.oldest,
          newest: row.newest
        };
      });

      return status;
    } catch (error) {
      logger.error('Error getting sync status:', error);
      return { error: error.message };
    }
  }
}

module.exports = HistorySync;