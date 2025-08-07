module.exports = {
  // Data collection settings
  collection: {
    enabled: true,
    sampleIntervalMs: 1000,        // Collect data every second
    aggregationWindowSeconds: 60,   // Create record every 60 seconds
    minSamplesRequired: 30,         // Minimum samples for valid record (50% of window)
    
    // Sensor validation ranges
    sensorRanges: {
      inlet_moisture: { min: 0, max: 100 },
      outlet_moisture: { min: 0, max: 100 },
      inlet_temperature: { min: -50, max: 500 },
      outlet_temperature: { min: -50, max: 500 },
      discharge_rate: { min: 0, max: 20000 },
      moisture_target: { min: 0, max: 100 },
      apt: { min: 0, max: 700 }
    },
    
    // Outlier detection
    outlierDetection: {
      enabled: true,
      method: 'iqr',              // Interquartile range method
      iqrMultiplier: 1.5         // Standard IQR multiplier
    }
  },

  // Storage settings
  storage: {
    // Partition management
    partitionInterval: 'monthly',   // 'daily', 'weekly', 'monthly'
    createFuturePartitions: 2,      // Number of future partitions to maintain
    
    // Data retention (in days)
    retention: {
      raw_data: 90,                 // Keep raw data for 90 days
      sync_failed: 180,             // Keep failed sync records longer
      compression_after: 7          // Compress partitions older than 7 days
    },
    
    // Cleanup schedule
    cleanup: {
      enabled: true,
      cronSchedule: '0 2 * * *',    // Run at 2 AM daily
      batchSize: 1000               // Records per cleanup batch
    }
  },

  // Sync configuration
  sync: {
    enabled: true,
    
    // Batch settings
    batch: {
      maxSize: 1000,                // Maximum records per sync batch
      minSize: 10,                  // Minimum records to trigger sync
      compressionEnabled: true,     // Compress data before sending
      compressionType: 'gzip'       // 'gzip' or 'brotli'
    },
    
    // Retry settings
    retry: {
      maxAttempts: 3,
      initialDelayMs: 30000,        // 30 seconds
      maxDelayMs: 300000,           // 5 minutes
      backoffMultiplier: 2          // Exponential backoff
    },
    
    // Sync intervals
    intervals: {
      normalSyncMinutes: 5,         // Regular sync interval
      failedRetryMinutes: 15,       // Retry failed syncs
      maxSyncDurationMs: 120000     // 2 minute timeout per sync
    }
  },

  // Monitoring and alerts
  monitoring: {
    // Data quality thresholds
    quality: {
      minAcceptable: 80,            // Minimum acceptable data quality %
      warnThreshold: 90,            // Warning if quality drops below this
      criticalThreshold: 70         // Critical alert threshold
    },
    
    // Gap detection
    gaps: {
      enabled: true,
      maxGapMinutes: 5,             // Alert if no data for 5 minutes
      checkIntervalMinutes: 1       // Check for gaps every minute
    },
    
    // Performance metrics
    performance: {
      trackMetrics: true,
      metricsRetentionDays: 7,
      slowQueryThresholdMs: 1000   // Log queries slower than 1 second
    }
  },

  // Device-specific overrides (can be configured per device)
  deviceOverrides: {
    // Example: Special settings for specific devices
    // 'dm2500i-001': {
    //   collection: {
    //     aggregationWindowSeconds: 30
    //   }
    // }
  },

  // Database connection pool settings
  database: {
    pool: {
      max: 10,                      // Maximum connections
      idleTimeoutMillis: 30000,     // Close idle connections after 30s
      connectionTimeoutMillis: 2000,
      statementTimeout: 30000       // 30 second query timeout
    }
  },

  // Feature flags
  features: {
    enablePartitioning: true,
    enableCompression: true,
    enableOutlierDetection: true,
    enableAutoCleanup: true,
    enableSyncStatusTracking: true,
    enableDataQualityMetrics: true
  }
};