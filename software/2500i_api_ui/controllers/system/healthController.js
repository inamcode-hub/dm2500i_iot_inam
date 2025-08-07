const db = require('../../lib/db/pool');
const os = require('os');
const { getTaskHealth } = require('../../lib/utils/taskHealth');

const health = async (req, res) => {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      loadAverage: os.loadavg()
    },
    database: {
      status: 'unknown',
      pool: {}
    }
  };

  try {
    // Test database connection
    const startTime = Date.now();
    await db.query('SELECT 1');
    const queryTime = Date.now() - startTime;
    
    // Get pool statistics
    const poolStats = db.getPoolStats();
    healthStatus.database = {
      status: 'connected',
      responseTime: `${queryTime}ms`,
      pool: poolStats
    };

    // Check table sizes
    const tableSizes = await db.query(`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('history_inam', 'alarms_inam', 'device_inam', 'alarms_status_inam')
      ORDER BY tablename;
    `);
    
    healthStatus.database.tables = tableSizes.rows;
    
    // Add background task health
    healthStatus.backgroundTasks = getTaskHealth();

  } catch (error) {
    healthStatus.status = 'unhealthy';
    healthStatus.database = {
      status: 'disconnected',
      error: error.message
    };
    
    return res.status(503).json(healthStatus);
  }

  res.json(healthStatus);
};

// Lightweight health check for load balancers
const ping = async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).send('OK');
  } catch (error) {
    res.status(503).send('Database connection failed');
  }
};

module.exports = {
  health,
  ping
};