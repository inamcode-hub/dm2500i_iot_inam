// controllers/healthController.js - Health check controller
const { query, getPoolStats } = require('../../db/pool');
const { STATUS, HTTP_STATUS } = require('../config/constants');
const logger = require('../../utils/logger');

/**
 * Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function healthCheck(req, res) {
  try {
    logger.debug('[HealthController] Health check requested');
    
    const health = {
      status: STATUS.SUCCESS,
      message: 'IoT Device API is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
    
    // Check database connection
    try {
      const status = getPoolStats();
      if (status.status === 'active') {
        await query('SELECT 1');
        health.database = 'connected';
        health.databaseDetails = {
          total: status.total,
          idle: status.idle,
          waiting: status.waiting,
          max: status.max,
          environment: status.environment
        };
      } else {
        health.database = 'not_initialized';
      }
    } catch (dbError) {
      logger.warn('[HealthController] Database check failed:', dbError.message);
      health.database = 'error';
      health.databaseError = dbError.message;
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
      used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
    };
    
    // Overall health status
    const isHealthy = health.database === 'connected';
    
    res.status(HTTP_STATUS.OK).json({
      ...health,
      healthy: isHealthy,
    });
    
  } catch (error) {
    logger.error('[HealthController] Health check error:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      healthy: false,
    });
  }
}

module.exports = {
  healthCheck,
};