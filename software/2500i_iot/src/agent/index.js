// agent/index.js - Main system orchestrator

const { initialize, reinitialize } = require('../device/deviceManager');
const webSocketClient = require('../network/ws/client');
const { startWatchdog } = require('../network/watchDog');
const handleReconnect = require('../network/ws/reconnectHandler');
const { initializeDatabase } = require('../db/init-db');
const { closePool } = require('../db/pool');
const { resetConnectionStateOnStartup } = require('../services/deviceDatabase');
const { startServer, stopServer } = require('../api/server');
const alarmMonitor = require('../services/alarmMonitor');
const { sendAlarm } = require('../network/ws/senders/sendAlarm');
const historyCollector = require('../services/historyCollector');
const logger = require('@utils/logger');

async function startAgent() {
  logger.info('[Agent] Booting device agent...');
  
  // Initialize database (includes SSH tunnel and schema setup)
  await initializeDatabase();

  // Reset connection state on startup to ensure clean state
  await resetConnectionStateOnStartup();

  let device = null;

  while (!device) {
    device = await initialize();
    if (!device) {
      logger.warn('[Agent] Initialization failed. Retrying in 60s...');
      await new Promise((r) => setTimeout(r, 60000));
    }
  }

  // Start API server
  try {
    const apiPort = process.env.API_PORT || 3003;
    await startServer(apiPort);
  } catch (error) {
    logger.error('[Agent] Failed to start API server:', error.message);
    logger.info('[Agent] Continuing without API server...');
  }
  
  // Start alarm monitoring service
  try {
    alarmMonitor.on('alarm', async (alarmData) => {
      logger.info('[Agent] Alarm event detected:', alarmData.action);
      await sendAlarm(alarmData);
    });
    
    await alarmMonitor.start(device.serial);
    logger.info('[Agent] Alarm monitoring service started with device serial:', device.serial);
  } catch (error) {
    logger.error('[Agent] Failed to start alarm monitor:', error);
  }
  
  // Start history collector service
  try {
    await historyCollector.start();
    logger.info('[Agent] History IoT collector started');
  } catch (error) {
    logger.error('[Agent] Failed to start history collector:', error);
    logger.info('[Agent] Continuing without history collection...');
  }
  
  webSocketClient.connect(device.token);
  startWatchdog({
    onReconnected: (newDevice) => handleReconnect(newDevice),
  });
}

// Graceful shutdown
async function shutdown() {
  logger.info('[Agent] Shutting down gracefully...');
  alarmMonitor.stop();
  historyCollector.stop();
  await stopServer();
  await closePool();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = { startAgent };
