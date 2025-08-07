const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');
const { createSSHTunnel, closeSSHTunnel } = require('./sshTunnel');

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.join(__dirname, '../../', envFile) });

let pool = null;
let tunnelProcess = null;

function createPool() {
  if (pool) return pool;

  const config = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
    // Connection pool configuration
    max: 5,                     // Max 5 connections (enough for embedded device)
    idleTimeoutMillis: 30000,   // Close idle connections after 30s
    connectionTimeoutMillis: 5000, // Fail if can't connect in 5s
  };

  pool = new Pool(config);

  // Pool event monitoring - only log errors
  pool.on('error', (err) => {
    console.error('Unexpected pool error:', err);
  });

  console.log(`Database pool created for ${process.env.NODE_ENV} environment`);
  return pool;
}

// Execute a query with automatic connection management
async function query(text, params) {
  const pool = createPool();
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  }
}

// Get a client for transactions
async function getClient() {
  const pool = createPool();
  const client = await pool.connect();
  return client;
}

// Initialize connection with SSH tunnel if needed
async function initializeConnection() {
  if (process.env.NODE_ENV === 'development' && process.env.SSH_HOST) {
    tunnelProcess = await createSSHTunnel();
  }
}

// Gracefully close the pool
async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  await closeSSHTunnel();
}

// Get pool statistics
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

module.exports = {
  query,
  getClient,
  closePool,
  createPool,
  initializeConnection,
  getPoolStats
};