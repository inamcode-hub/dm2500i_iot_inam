const { registerDeviceAPI } = require('../services/serverApi');
const logger = require('@utils/logger');
const { hasInternetConnection } = require('../network/internetCheck');
const getHardwareInfo = require('../utils/hardwareInfo');

async function registerDevice() {
  try {
    logger.info('[Register] Attempting device registration...');

    const hardware = getHardwareInfo();

    const payload = {
      deviceType: process.env.DEVICE_TYPE,
      hardware,
    };

    const online = await hasInternetConnection();
    if (!online) {
      logger.warn('[Register] Internet unavailable. Skipping registration.');
      return null;
    }

    const result = await registerDeviceAPI(payload);

    if (!result?.serial || !result?.token) {
      throw new Error('Invalid registration response');
    }

    logger.info(`[Register] Registered with serial: ${result.serial}`);
    return result;
  } catch (err) {
    logger.error(`[Register] Registration failed: ${err.message}`);
    return null;
  }
}

module.exports = registerDevice;
