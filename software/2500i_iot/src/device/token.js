const jwt = require('jsonwebtoken');
const { renewTokenAPI } = require('../services/serverApi');
const { updateDeviceTokenInDB } = require('./localStorage'); // ✅ Import the missing function
const state = require('./state');

const constants = require('../config/constants');
const logger = require('@utils/logger');

async function renewIfExpiring(device) {
  const serial = device.serial || state.get().serial;
  try {
    const decoded = jwt.decode(device.token);
    if (!decoded || !decoded.exp) {
      logger.warn('[Token] Invalid token structure');
      return device;
    }

    const expiry = new Date(decoded.exp * 1000);
    const now = new Date();
    const diff = expiry - now;
    const threshold = constants.TOKEN_RENEWAL_THRESHOLD_DAYS * 86400 * 1000;

    if (diff > threshold) {
      logger.info(`[Token] Token is valid until ${expiry.toISOString()}`);
      return device;
    }

    logger.info('[Token] Token nearing expiry, attempting renewal...');
    const updated = await renewTokenAPI(serial, device.token);
    logger.info(`[Token] Updated token response: ${JSON.stringify(updated)}`);

    if (updated && updated.token) {
      const newDevice = { serial, token: updated.token };
      logger.info(`[Token] newDevice: ${JSON.stringify(newDevice)}`);

      // ✅ Update local DB
      await updateDeviceTokenInDB(serial, newDevice.token);

      // ✅ Update in-memory state
      state.set(newDevice);

      logger.info('[Token] Token renewed and updated successfully');
      return newDevice;
    }

    logger.warn('[Token] Token renewal failed');
    return device;
  } catch (err) {
    logger.error(`[Token] Error during renewal: ${err.message}`);
    return device;
  }
}

module.exports = { renewIfExpiring };
