// deviceDatabase.js - Database operations for device management
const { query } = require('../db/pool');
const logger = require('../utils/logger');

// Function to update device connection state in database
async function updateDeviceConnectionState(cloudConnection, lastConnected = null) {
  try {
    const timestampValue = lastConnected ? new Date(lastConnected) : new Date();
    
    const result = await query(
      `UPDATE device_inam 
       SET "cloudConnection" = $1, 
           "lastConnected" = $2,
           "updatedAt" = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM device_inam LIMIT 1)
       RETURNING id`,
      [cloudConnection, timestampValue]
    );
    
    logger.info(`[DeviceDB] Updated connection state: cloudConnection=${cloudConnection}, lastConnected=${timestampValue.toLocaleString()}`);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('[DeviceDB] Failed to update connection state:', error.message);
    return false;
  }
}

// Function to get device info from database
async function getDeviceInfo() {
  try {
    const result = await query(
      `SELECT serial, "registerPassword", "cloudConnection", "lastConnected" 
       FROM device_inam 
       LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      const device = result.rows[0];
      return {
        serial: device.serial,
        registerPassword: device.registerPassword,
        cloudConnection: device.cloudConnection,
        lastConnected: device.lastConnected,
      };
    }
    return null;
  } catch (error) {
    logger.error('[DeviceDB] Failed to get device info:', error.message);
    return null;
  }
}

// Function to reset connection state on service startup
async function resetConnectionStateOnStartup() {
  try {
    const result = await query(
      `UPDATE device_inam 
       SET "cloudConnection" = false,
           "updatedAt" = CURRENT_TIMESTAMP
       RETURNING id`
    );
    
    logger.info(`[DeviceDB] Reset connection state on startup: cloudConnection=false`);
    return result.rowCount > 0;
  } catch (error) {
    logger.error('[DeviceDB] Failed to reset connection state on startup:', error.message);
    return false;
  }
}

module.exports = {
  updateDeviceConnectionState,
  getDeviceInfo,
  resetConnectionStateOnStartup,
};