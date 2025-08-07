const axios = require('axios');
const sendAck = require('@network/ws/sender/sendAck');
const logger = require('@utils/logger');

// Load environment variable for local API base URL - fallback to our new API
const LOCAL_API_BASE = process.env.LOCAL_API_URL || `http://localhost:${process.env.API_PORT || 3003}/api/v1`;

/**
 * Handles the `update_api` WebSocket action by routing updates to REST endpoints.
 *
 * @param {Object} message - The message received over WebSocket.
 * @param {string} message.commandId - Command identifier for ack correlation.
 * @param {string} message.topic - Topic like "home".
 * @param {Array} message.updates - Array of { path, value } to apply.
 * @param {WebSocket} socket - The WebSocket to send the ACK to.
 */
const handleUpdateApi = async (message, socket) => {
  const { commandId, updates, topic } = message;

  logger.info('[UpdateApi] 🔧 Starting update...');
  logger.info(`[UpdateApi] 🔗 Using API URL: ${LOCAL_API_BASE}`);
  logger.debug(`[UpdateApi] 📩 Message received: ${JSON.stringify(message)}`);
  logger.debug(`[UpdateApi] 🔗 LOCAL_API_BASE: ${LOCAL_API_BASE}`);

  try {
    for (const { path, value } of updates) {
      let url = '';
      const payload = { value };

      // Determine the API endpoint based on the path
      if (path === 'mode') {
        url = `${LOCAL_API_BASE}/updates/mode_controller`;
        logger.debug(`[UpdateApi] 🧭 Special route for "mode" → ${url}`);
      } else {
        url = `${LOCAL_API_BASE}/updates/keypad_updates/${path}`;
        logger.debug(`[UpdateApi] 📬 Standard route → ${url}`);
      }

      try {
        logger.debug(`[UpdateApi] 📤 Posting to ${url} with payload:`, payload);
        await axios.post(url, payload);
        logger.info(
          `[UpdateApi] ✅ Successfully updated "${path}" with value: ${value}`
        );
      } catch (err) {
        logger.error(`[UpdateApi] ❌ Failed to update "${path}"`, {
          message: err.message,
          code: err.code,
          url: url,
          payload: payload,
          errno: err.errno,
          syscall: err.syscall,
          address: err.address,
          port: err.port,
          response: err.response?.data,
          status: err.response?.status
        });
      }
    }

    // Send ACK back to UI/device once all updates are processed
    sendAck(socket, commandId);
    logger.debug(`[UpdateApi] 📨 ACK sent for commandId ${commandId}`);
  } catch (error) {
    logger.error(
      '[UpdateApi] ❗ Unexpected error during update handling:',
      error
    );
  }
};

module.exports = {
  handleUpdateApi,
};
