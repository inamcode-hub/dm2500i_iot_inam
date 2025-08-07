const fs = require('fs');
const path = require('path');
const { query, closePool, initializeConnection } = require('./pool');
const logger = require('../utils/logger');

/**
 * Initialize database schema
 */
async function initializeDatabase() {
  try {
    logger.info('[DB Init] Initializing database schema...');
    
    // Initialize connection (SSH tunnel if needed)
    await initializeConnection();
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await query(schema);
    
    logger.info('[DB Init] Database schema initialized successfully');
    logger.info('[DB Init] Created tables: device_inam, history_iot_inam, history_sync_log_inam, data_retention_policy_inam');
    logger.info('[DB Init] Created functions: create_monthly_partition_inam, cleanup_old_partitions_inam');
    
    // Ensure current and next month partitions exist
    await ensurePartitions();
    
    return true;
  } catch (error) {
    logger.error('[DB Init] Error initializing database:', error);
    throw error;
  }
}

/**
 * Ensure partitions exist for current and next month
 */
async function ensurePartitions() {
  try {
    await query('SELECT create_monthly_partition_inam()');
    logger.info('[DB Init] Monthly partitions checked/created');
  } catch (error) {
    logger.error('[DB Init] Error ensuring partitions:', error.message);
  }
}

/**
 * Check if database is initialized
 */
async function isDatabaseInitialized() {
  try {
    // Check if critical tables exist
    const result = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('device_inam', 'history_iot_inam')
    `);
    
    return result.rows[0].count >= 2;
  } catch (error) {
    logger.error('[DB Init] Error checking database initialization:', error);
    return false;
  }
}


// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(async () => {
      logger.info('[DB Init] Database initialization complete');
      await closePool();
      process.exit(0);
    })
    .catch(async (error) => {
      logger.error('[DB Init] Database initialization failed:', error);
      await closePool();
      process.exit(1);
    });
}

module.exports = { 
  initializeDatabase,
  isDatabaseInitialized,
  ensurePartitions
};