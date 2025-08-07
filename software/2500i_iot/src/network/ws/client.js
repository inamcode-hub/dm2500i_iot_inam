// network/ws/client.js
const WebSocket = require('ws');
const logger = require('@utils/logger');
const { setSocketConnected } = require('./connectionState');
const { startHeartbeat, stopHeartbeat } = require('./heartbeat');
const { flush, enqueue, setSocket } = require('./outgoingQueue');
const { load: loadPersistentQueue } = require('./persistentQueue');
const { startAllJobs, stopAllJobs } = require('./scheduler');
const { flushPending, clearAllPending } = require('./ackTracker');
const dispatch = require('./dispatcher');
const { stopAll } = require('./stream/streamManager');
const { updateDeviceConnectionState } = require('../../services/deviceDatabase');
const { setSocket: setAlarmSocket } = require('./senders/sendAlarm');
const wsClientWrapper = require('./wsClientWrapper');

let socket = null;

// Load any persisted messages on startup
const persistedMessages = loadPersistentQueue();
if (persistedMessages && persistedMessages.length > 0) {
  logger.info(`[WebSocket] Loading ${persistedMessages.length} persisted messages from queue`);
  persistedMessages.forEach(msg => enqueue(msg));
}

function connect(token) {
  const url = `${process.env.SERVER_URL.replace(/^http/, 'ws').replace(
    /\/+$/,
    ''
  )}/ws?token=${token}`;
  logger.info(`[WebSocket] Connecting to ${url}...`);
  socket = new WebSocket(url);

  socket.on('open', async () => {
    logger.info('[WebSocket] Connected');
    setSocketConnected(true);
    // Update database with connection state
    updateDeviceConnectionState(true).catch(err => {
      logger.error('[WebSocket] Failed to update database on connect:', err.message);
    });
    setAlarmSocket(socket); // Set socket for alarm sender
    wsClientWrapper.setSocket(socket); // Set socket for wrapper
    setSocket(socket); // Set socket for outgoing queue
    
    startHeartbeat(socket);
    startAllJobs(); // ✅ Start background jobs
    flush(socket); // ✅ Send any pending messages
    flushPending(socket);
  });

  socket.on('close', () => {
    logger.warn('[WebSocket] Disconnected');
    stopHeartbeat();
    setSocketConnected(false);
    clearAllPending(); // Clear pending ACK messages
    
    // Update database with disconnection state
    updateDeviceConnectionState(false).catch(err => {
      logger.error('[WebSocket] Failed to update database on disconnect:', err.message);
    });
    stopAllJobs(); // ✅ Clean up
    stopAll(); // ✅ Stop all streams
  });

  socket.on('error', (err) => {
    logger.error(`[WebSocket] Error: ${err.message}`);
    stopHeartbeat();
    setSocketConnected(false);
    clearAllPending(); // Clear pending ACK messages
    // Update database with error/disconnection state
    updateDeviceConnectionState(false).catch(dbErr => {
      logger.error('[WebSocket] Failed to update database on error:', dbErr.message);
    });
    stopAllJobs(); // ✅ Clean up on error
    stopAll(); // ✅ Stop all streams
  });

  socket.on('message', (msg) => {
    logger.debug(`[WebSocket] Message received: ${msg}`);
    // Phase 2: Will handle message dispatch here
    dispatch(msg, socket); // ✅ clean routing
  });
}

function disconnect() {
  if (socket) {
    socket.close();
    socket = null;
    stopHeartbeat();
    setSocketConnected(false);
    clearAllPending(); // Clear pending ACK messages
    // Update database with manual disconnection state
    updateDeviceConnectionState(false).catch(err => {
      logger.error('[WebSocket] Failed to update database on manual disconnect:', err.message);
    });
    stopAllJobs(); // ✅ Clean up
    stopAll(); // ✅ Stop all streams
    
    logger.info('[WebSocket] Disconnected manually');
  }
}

module.exports = { connect, disconnect };
