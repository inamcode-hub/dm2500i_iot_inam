// server.js - Main API server
const express = require('express');
const { closeDatabase: closeHomeDatabase } = require('./home');
const { closeDatabase: closeValueUpdatesDatabase } = require('./valueUpdates');
const { API_PORT } = require('./config/constants');
const logger = require('../utils/logger');

// Middleware
const corsMiddleware = require('./middleware/cors');
const loggingMiddleware = require('./middleware/logging');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const homeRoutes = require('./routes/homeRoutes');
const updateRoutes = require('./routes/updateRoutes');
const healthRoutes = require('./routes/healthRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const diagnosticsRoutes = require('./routes/diagnosticsRoutes');
const alarmsRoutes = require('./routes/alarmsRoutes');
const historyRoutes = require('./routes/historyRoutes');

// Initialize Express application
const app = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(corsMiddleware);

// Request logging middleware
app.use(loggingMiddleware);

// =============================================================================
// ROUTES SETUP
// =============================================================================

// API Routes
app.use('/api/v1/home', homeRoutes);
app.use('/api/v1/updates', updateRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/diagnostics', diagnosticsRoutes);
app.use('/api/v1/alarms', alarmsRoutes);
app.use('/api/v1/history', historyRoutes);

// API Info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'IoT Device API',
    version: '1.0.0',
    description: 'Comprehensive REST API for IoT device monitoring, control, and data management',
    endpoints: {
      health: '/api/v1/health',
      home: {
        data: '/api/v1/home/data',
        chart: '/api/v1/home/chart',
      },
      updates: {
        keypad: '/api/v1/updates/keypad_updates/:name',
        mode: '/api/v1/updates/mode_controller',
        parameters: '/api/v1/updates/parameters',
        modes: '/api/v1/updates/modes',
      },
      settings: {
        list: '/api/v1/settings',
        categories: '/api/v1/settings/categories',
        get: '/api/v1/settings/:name',
        update: '/api/v1/settings/:name',
        batch_update: '/api/v1/settings',
        reset: '/api/v1/settings/:name/reset',
      },
      diagnostics: {
        list: '/api/v1/diagnostics',
        categories: '/api/v1/diagnostics/categories',
        health: '/api/v1/diagnostics/health',
        get: '/api/v1/diagnostics/:name',
      },
      alarms: {
        active: '/api/v1/alarms',
        history: '/api/v1/alarms/history',
        config: '/api/v1/alarms/config',
        acknowledge: '/api/v1/alarms/:id/acknowledge',
        support: '/api/v1/alarms/support',
      },
      history: {
        status: '/api/v1/history/status',
        availability: '/api/v1/history/availability',
        recent: '/api/v1/history/recent',
        statistics: '/api/v1/history/statistics',
        partitions: '/api/v1/history/partitions',
        collector: {
          start: '/api/v1/history/collector/start',
          stop: '/api/v1/history/collector/stop',
        },
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'IoT Device API Server',
    version: '1.0.0',
    status: 'running',
    docs: '/api/v1',
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// =============================================================================
// SERVER MANAGEMENT
// =============================================================================

let server = null;

/**
 * Start the API server
 * @param {number} port - Port number (defaults to API_PORT from config)
 * @returns {Promise<Server>} Express server instance
 */
async function startServer(port = API_PORT) {
  try {
    // Database is initialized by the agent
    // No need to check status here anymore
    logger.debug('[API Server] Database initialization handled by agent');
    
    // Start server
    server = app.listen(port, () => {
      logger.info(`[API Server] ✅ Server running on port ${port}`);
      logger.info(`[API Server] 📚 API Documentation: http://localhost:${port}/api/v1`);
      logger.info(`[API Server] 🏥 Health Check: http://localhost:${port}/api/v1/health`);
    });
    
    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`[API Server] ❌ Port ${port} is already in use`);
      } else {
        logger.error(`[API Server] ❌ Server error: ${error.message}`);
      }
      throw error;
    });
    
    return server;
    
  } catch (error) {
    logger.error(`[API Server] ❌ Failed to start server: ${error.message}`);
    throw error;
  }
}

/**
 * Stop the API server gracefully
 * @returns {Promise<void>}
 */
async function stopServer() {
  if (server) {
    logger.info('[API Server] 🛑 Stopping server...');
    
    // Close individual API database connections (delegated to central service)
    await Promise.all([
      closeHomeDatabase(),
      closeValueUpdatesDatabase(),
    ]);
    
    // Close server
    return new Promise((resolve) => {
      server.close(() => {
        logger.info('[API Server] 🔌 Server stopped gracefully');
        server = null;
        resolve();
      });
    });
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function gracefulShutdown(signal) {
  logger.info(`[API Server] 📨 Received ${signal}, shutting down gracefully...`);
  
  try {
    await stopServer();
    process.exit(0);
  } catch (error) {
    logger.error(`[API Server] ❌ Error during shutdown: ${error.message}`);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('[API Server] 💥 Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[API Server] 🚫 Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  app,
  startServer,
  stopServer,
};