const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/pool');
const logger = require('../utils/logger');
const { getDeviceInfo } = require('./deviceDatabase');

// Channel mapping for sensor data
const SENSOR_CHANNELS = {
  inlet_moisture: { channum: 300, table: 'io_table', column: 'pv', min: 0, max: 100 },
  outlet_moisture: { channum: 301, table: 'io_table', column: 'pv', min: 0, max: 100 },
  inlet_temperature: { channum: 308, table: 'io_table', column: 'pv', min: 0, max: 450 },
  outlet_temperature: { channum: 307, table: 'io_table', column: 'pv', min: 0, max: 450 },
  discharge_rate: { channum: 49, table: 'io_table', column: 'pv', min: 0, max: 20000 },
  moisture_target: { channum: 20, table: 'io_table', column: 'pv', min: 0, max: 100 },
  apt: { channum: 50, table: 'io_table', column: 'pv', min: -700, max: 700 },
  mode: { channum: 121, table: 'cdp_table', column: 'pv' },
  dryer_state: { channum: 105, table: 'cdp_table', column: 'pv' }
};

class HistoryCollector {
  constructor() {
    this.intervalId = null;
    this.tempStorage = {};
    this.deviceSerial = null;
    this.isRunning = false;
    this.samplesCollected = 0;
    this.aggregationStart = null;
  }

  async initialize() {
    try {
      // Get device info
      const deviceInfo = await getDeviceInfo();
      if (!deviceInfo || !deviceInfo.serial) {
        throw new Error('No device serial found. History collection requires device registration.');
      }
      
      this.deviceSerial = deviceInfo.serial;

      // Initialize temp storage
      this.resetTempStorage();
      
      // Ensure partitions exist
      await this.ensurePartitions();
      
      logger.info(`History collector initialized for device: ${this.deviceSerial}`);
      return true;
    } catch (error) {
      logger.error('Failed to initialize history collector:', error);
      throw error;
    }
  }

  resetTempStorage() {
    this.tempStorage = {};
    Object.keys(SENSOR_CHANNELS).forEach(key => {
      this.tempStorage[key] = [];
    });
    this.samplesCollected = 0;
    this.aggregationStart = new Date();
  }

  async ensurePartitions() {
    try {
      // Create current and next month partitions if they don't exist
      await query('SELECT create_monthly_partition_inam()');
      logger.info('Checked/created monthly partitions');
    } catch (error) {
      logger.error('Error ensuring partitions:', error);
    }
  }

  async fetchSensorData() {
    const results = {};
    
    // Group channels by table for efficient querying
    const tableGroups = {};
    Object.entries(SENSOR_CHANNELS).forEach(([key, config]) => {
      if (!tableGroups[config.table]) {
        tableGroups[config.table] = [];
      }
      tableGroups[config.table].push({ key, ...config });
    });

    // Query each table
    for (const [table, channels] of Object.entries(tableGroups)) {
      const channums = channels.map(c => c.channum);
      const queryText = `SELECT channum, ${channels[0].column} as value FROM ${table} WHERE channum = ANY($1::integer[])`;
      
      try {
        const result = await query(queryText, [channums]);
        
        result.rows.forEach(row => {
          const channel = channels.find(c => c.channum === row.channum);
          if (channel && row.value !== null) {
            results[channel.key] = parseFloat(row.value);
          }
        });
      } catch (error) {
        logger.error(`Error fetching data from ${table}:`, error);
      }
    }

    return results;
  }

  validateSensorValue(value, min, max) {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }
    if (min !== undefined && value < min) {
      return null;
    }
    if (max !== undefined && value > max) {
      return null;
    }
    return value;
  }

  calculateRobustAverage(values) {
    if (!values || values.length === 0) {
      return null;
    }

    // Remove null/undefined values
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    
    if (validValues.length === 0) {
      return null;
    }

    // Simple IQR-based outlier removal
    const sorted = [...validValues].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    const filtered = validValues.filter(v => v >= lowerBound && v <= upperBound);
    
    if (filtered.length === 0) {
      return null;
    }

    const average = filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
    return Math.round(average * 100) / 100;
  }

  interpretMode(modeValue) {
    const mode = Math.round(modeValue || 0);
    switch (mode) {
      case 10: return 'local';
      case 11: return 'manual';
      case 12: return 'automatic';
      default: return 'unknown';
    }
  }

  interpretDryerState(stateValue) {
    const state = Math.round(stateValue || 0);
    switch (state) {
      case 0: return 'standby';
      case 1: return 'primed';
      case 2: return 'idle run';
      case 3: return 'preheat';
      case 4: return 'running';
      case 5: return 'unloading';
      default: return 'unknown';
    }
  }

  async collectSample() {
    try {
      const sensorData = await this.fetchSensorData();
      
      // Store each sensor value with validation
      Object.entries(sensorData).forEach(([key, value]) => {
        const config = SENSOR_CHANNELS[key];
        const validatedValue = this.validateSensorValue(value, config.min, config.max);
        if (validatedValue !== null) {
          this.tempStorage[key].push(validatedValue);
        }
      });

      this.samplesCollected++;
    } catch (error) {
      logger.error('Error collecting sample:', error);
    }
  }

  async createHistoryRecord() {
    const aggregationEnd = new Date();
    const dataQuality = Math.round((this.samplesCollected / 60) * 100);

    // Calculate averages
    const averages = {};
    Object.keys(SENSOR_CHANNELS).forEach(key => {
      averages[key] = this.calculateRobustAverage(this.tempStorage[key]);
    });

    const record = {
      device_serial: this.deviceSerial,
      sync_id: uuidv4(),
      recorded_at: aggregationEnd,
      aggregation_start: this.aggregationStart,
      aggregation_end: aggregationEnd,
      product: 'corn', // Default, can be made configurable
      mode: this.interpretMode(averages.mode),
      dryer_state: this.interpretDryerState(averages.dryer_state),
      inlet_moisture: averages.inlet_moisture,
      outlet_moisture: averages.outlet_moisture,
      inlet_temperature: averages.inlet_temperature,
      outlet_temperature: averages.outlet_temperature,
      discharge_rate: averages.discharge_rate,
      moisture_target: averages.moisture_target,
      apt: averages.apt,
      sample_count: this.samplesCollected,
      data_quality: dataQuality
    };

    try {
      const queryText = `
        INSERT INTO history_iot_inam (
          device_serial, sync_id, recorded_at, aggregation_start, aggregation_end,
          product, mode, dryer_state, inlet_moisture, outlet_moisture,
          inlet_temperature, outlet_temperature, discharge_rate, moisture_target, apt,
          sample_count, data_quality
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING id;
      `;

      const values = [
        record.device_serial,
        record.sync_id,
        record.recorded_at,
        record.aggregation_start,
        record.aggregation_end,
        record.product,
        record.mode,
        record.dryer_state,
        record.inlet_moisture,
        record.outlet_moisture,
        record.inlet_temperature,
        record.outlet_temperature,
        record.discharge_rate,
        record.moisture_target,
        record.apt,
        record.sample_count,
        record.data_quality
      ];

      const result = await query(queryText, values);
      
      if (result.rows.length > 0) {
        logger.info(`History record created: ${record.sync_id} with quality ${dataQuality}%`);
      }

      // Reset for next collection cycle
      this.resetTempStorage();
    } catch (error) {
      logger.error('Error creating history record:', error);
    }
  }

  async start() {
    if (this.isRunning) {
      logger.warn('History collector is already running');
      return;
    }

    try {
      await this.initialize();
      this.isRunning = true;

      // Collect samples every second
      this.intervalId = setInterval(async () => {
        await this.collectSample();

        // Create record after 60 samples
        if (this.samplesCollected >= 60) {
          await this.createHistoryRecord();
        }
      }, 1000);

      logger.info('History collector started');
    } catch (error) {
      logger.error('Failed to start history collector:', error);
      this.isRunning = false;
      throw error;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('History collector stopped');
  }

  async getStatus() {
    try {
      const statusQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_sync,
          COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
          COUNT(*) FILTER (WHERE sync_status = 'failed') as failed,
          AVG(data_quality) as avg_quality,
          MAX(recorded_at) as last_record
        FROM history_iot_inam
        WHERE device_serial = $1
        AND recorded_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `;

      const result = await query(statusQuery, [this.deviceSerial]);
      
      return {
        isRunning: this.isRunning,
        deviceSerial: this.deviceSerial,
        currentSamples: this.samplesCollected,
        aggregationStart: this.aggregationStart,
        ...result.rows[0]
      };
    } catch (error) {
      logger.error('Error getting history status:', error);
      return {
        isRunning: this.isRunning,
        error: error.message
      };
    }
  }

  // Cleanup old partitions based on retention policy
  async cleanupOldPartitions() {
    try {
      await query('SELECT cleanup_old_partitions_inam()');
      logger.info('Old partitions cleanup completed');
    } catch (error) {
      logger.error('Error cleaning up old partitions:', error);
    }
  }
}

// Create singleton instance
const historyCollector = new HistoryCollector();

// Handle process termination
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, stopping history collector');
  historyCollector.stop();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, stopping history collector');
  historyCollector.stop();
});

module.exports = historyCollector;