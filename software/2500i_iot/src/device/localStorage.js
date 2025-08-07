// device/localStorage.js - DB interaction layer

const { query } = require('../db/pool');
const logger = require('@utils/logger');
async function loadDeviceFromDB() {
  try {
    const result = await query(
      `SELECT id, serial, "registerPassword", token, "cloudConnection", 
              "lastConnected", "createdAt", "updatedAt"
       FROM device_inam 
       LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      const device = result.rows[0];
      logger.info(`[Storage] Loaded device from DB: ${device.serial}`);
      return device;
    }
    return null;
  } catch (err) {
    logger.error(`[Storage] Failed to load device: ${err.message}`);
    return null;
  }
}

async function saveDeviceToDB({ serial, registerPassword, token }) {
  try {
    const result = await query(
      `INSERT INTO device_inam (serial, "registerPassword", token, "cloudConnection", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, serial, "registerPassword", token, "cloudConnection", 
                 "lastConnected", "createdAt", "updatedAt"`,
      [serial, registerPassword, token]
    );
    
    if (result.rows.length > 0) {
      logger.info(`[Storage] Device saved to DB: ${serial}`);
      return result.rows[0];
    }
    return null;
  } catch (err) {
    logger.error(`[Storage] Failed to save device: ${err.message}`);
    return null;
  }
}

async function updateDeviceTokenInDB(serial, token) {
  if (!serial || !token) {
    logger.error('[Storage] updateDeviceTokenInDB: Missing serial or token');
    return null;
  }

  try {
    const result = await query(
      `UPDATE device_inam 
       SET token = $1,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE serial = $2
       RETURNING id, serial, "registerPassword", token, "cloudConnection", 
                 "lastConnected", "createdAt", "updatedAt"`,
      [token, serial]
    );

    if (result.rows.length === 0) {
      logger.warn(`[Storage] Device not found: ${serial}`);
      return null;
    }

    logger.info(`[Storage] Updated token for device: ${serial}`);
    return result.rows[0];
  } catch (err) {
    logger.error(`[Storage] Failed to update token: ${err.message}`);
    return null;
  }
}

module.exports = {
  loadDeviceFromDB,
  saveDeviceToDB,
  updateDeviceTokenInDB,
};
