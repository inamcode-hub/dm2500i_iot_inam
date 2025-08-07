// device/deviceManager.js - Main plug to initialize or reinitialize device

const { loadDeviceFromDB, saveDeviceToDB } = require('./localStorage');
const { renewIfExpiring } = require('./token');
const registerDevice = require('./register');
const state = require('./state');
const logger = require('@utils/logger');
async function initialize() {
  logger.info('[deviceManager] Initializing device...');

  try {
    let device = await loadDeviceFromDB();

    if (device) {
      device = await renewIfExpiring(device);
    } else {
      device = await registerDevice();
      if (device) await saveDeviceToDB(device);
    }

    if (device) {
      state.set(device);
      return device;
    } else {
      throw new Error('Device registration returned null');
    }
  } catch (err) {
    logger.error(`[deviceManager] Initialization failed: ${err.message}`);
    return null;
  }
}

async function reinitialize() {
  logger.info('[deviceManager] Re-initializing after recovery...');
  return initialize(); // reuse same logic
}

module.exports = {
  initialize,
  reinitialize,
};
