// valueUpdates.js - Value update API for IoT device (Legacy - Use UpdateService instead)
const { query } = require('../db/pool');
const updateService = require('./services/updateService');
const { KEYPAD_PARAMETERS, MODE_PARAMETERS, DEVICE_MODES, ALARM_PARAMETERS } = require('./config/keypadData');
const logger = require('../utils/logger');

// Use configuration from config files
const keypadData = KEYPAD_PARAMETERS;
const modeData = MODE_PARAMETERS;

// Check if parameter is alarm-related
function isAlarmParam(param) {
  return ALARM_PARAMETERS.includes(param);
}

// Validate alarm limits
async function validateAlarmLimits(param, value) {
  try {
    const paramConfig = keypadData.find(item => item.name === param);
    if (!paramConfig) {
      return 'Invalid parameter';
    }
    
    // Get current alarm limits
    const queryText = `SELECT hal, lal, hwl, lwl FROM ${paramConfig.table} WHERE channum = $1`;
    const result = await query(queryText, [paramConfig.channum]);
    
    if (result.rows.length === 0) {
      return 'Parameter not found';
    }
    
    const { hal, lal, hwl, lwl } = result.rows[0];
    
    // Validate against alarm limits
    if (hal && value > hal) {
      return `Value exceeds high alarm limit (${hal})`;
    }
    if (lal && value < lal) {
      return `Value below low alarm limit (${lal})`;
    }
    if (hwl && value > hwl) {
      return `Value exceeds high warning limit (${hwl})`;
    }
    if (lwl && value < lwl) {
      return `Value below low warning limit (${lwl})`;
    }
    
    return null; // No validation error
  } catch (error) {
    logger.error('[Value Updates API] Alarm validation error:', error.message);
    return 'Validation error';
  }
}

// Update keypad parameter (Legacy wrapper - Use UpdateService directly)
async function updateKeypadParameter(param, value) {
  try {
    logger.info(`[Value Updates API] Updating ${param} to ${value} (using UpdateService)`);
    
    const result = await updateService.updateParameter(param, value);
    
    if (result.success) {
      return {
        status: 'success',
        message: 'Value Updated Successfully!',
        detailMessage: {
          name: result.paramName,
          channum: result.channum,
          sztag: result.sztag,
          column: result.column,
          value: result.value,
          table: result.table,
        },
        result: 1,
      };
    } else {
      return {
        status: 'error',
        message: result.error,
      };
    }
  } catch (error) {
    logger.error('[Value Updates API] Update error:', error.message);
    return {
      status: 'error',
      message: error.message,
    };
  }
}

// Update mode controller (Legacy wrapper - Use UpdateService directly)
async function updateModeController(mode) {
  try {
    logger.info(`[Value Updates API] Changing mode to ${mode} (using UpdateService)`);
    
    const result = await updateService.updateMode(mode);
    
    if (result.success) {
      return {
        status: 'success',
        message: 'Mode Changed Successfully!',
        detailMessage: {
          mode: result.mode,
          updates: result.channels,
        },
        updates: result.updates.map(u => ({
          channum: u.channum,
          updated: u.success,
        })),
      };
    } else {
      return {
        status: 'error',
        message: result.error,
      };
    }
  } catch (error) {
    logger.error('[Value Updates API] Mode update error:', error.message);
    return {
      status: 'error',
      message: error.message,
    };
  }
}

// Get available keypad parameters
function getAvailableParameters() {
  return keypadData.map(param => ({
    name: param.name,
    channum: param.channum,
    sztag: param.sztag,
    table: param.table,
    minRange: param.minRange,
    maxRange: param.maxRange,
    description: param.description,
    unit: param.unit,
  }));
}

// Get available modes
function getAvailableModes() {
  return DEVICE_MODES.map(mode => ({
    name: mode.name,
    description: mode.description,
    channels: mode.channels,
  }));
}

// Graceful shutdown (delegated to centralized database service)
async function closeDatabase() {
  // Database closing is handled by centralDatabase service
  logger.info('[Value Updates API] 🔌 Database connection cleanup requested');
}

module.exports = {
  updateKeypadParameter,
  updateModeController,
  getAvailableParameters,
  getAvailableModes,
  closeDatabase,
};