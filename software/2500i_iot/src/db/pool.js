const { Pool } = require('pg');
const { createSSHTunnel, closeSSHTunnel } = require('./sshTunnel');
const logger = require('../utils/logger');
require('dotenv').config();

let pool = null;

/**
 * Create PostgreSQL connection pool
 */
function createPool() {
  if (pool) return pool;

  // Use tunnel port if SSH tunnel is enabled
  const dbPort = process.env.SSH_HOST && process.env.NODE_ENV !== 'production' 
    ? (process.env.SSH_TUNNEL_PORT || 5433)
    : (process.env.DB_PORT || 5432);

  const config = {
    user: process.env.DB_USER || 'dmi',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'dm',
    password: process.env.DB_PASSWORD || 'dmi',
    port: dbPort,
    // Connection pool configuration
    max: 20,                      // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,     // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
    acquireTimeoutMillis: 10000,   // Max time to acquire connection from pool
  };

  pool = new Pool(config);

  // Pool event monitoring
  pool.on('error', (err) => {
    logger.error('[DB Pool] Unexpected pool error:', err);
  });

  pool.on('connect', () => {
    logger.debug('[DB Pool] Client connected to pool');
  });

  pool.on('remove', () => {
    logger.debug('[DB Pool] Client removed from pool');
  });

  logger.info(`[DB Pool] Database pool created (port: ${dbPort}, max: ${config.max})`);
  return pool;
}

/**
 * Execute a query with automatic connection management
 */
async function query(text, params) {
  const pool = createPool();
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`[DB Pool] Slow query (${duration}ms): ${text.substring(0, 100)}...`);
    }
    return result;
  } catch (err) {
    logger.error('[DB Pool] Query error:', err.message);
    logger.error('[DB Pool] Query text:', text);
    throw err;
  }
}

/**
 * Get a client for transactions
 */
async function getClient() {
  const pool = createPool();
  const client = await pool.connect();
  
  // Add query tracking to client
  const originalQuery = client.query.bind(client);
  client.query = async (text, params) => {
    const start = Date.now();
    const result = await originalQuery(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn(`[DB Pool] Slow transaction query (${duration}ms): ${text.substring(0, 100)}...`);
    }
    return result;
  };
  
  return client;
}


/**
 * Initialize connection with SSH tunnel if needed
 */
async function initializeConnection() {
  await createSSHTunnel();
}

/**
 * Gracefully close the pool
 */
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('[DB Pool] Connection pool closed');
  }
  await closeSSHTunnel();
}

/**
 * Get pool statistics
 */
function getPoolStats() {
  if (!pool) {
    return {
      status: 'not_initialized',
      total: 0,
      idle: 0,
      waiting: 0
    };
  }
  
  return {
    status: 'active',
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: pool.options.max,
    environment: process.env.NODE_ENV
  };
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    logger.error('[DB Pool] Connection test failed:', error.message);
    return false;
  }
}

module.exports = {
  query,
  getClient,
  closePool,
  createPool,
  initializeConnection,
  getPoolStats,
  testConnection
};