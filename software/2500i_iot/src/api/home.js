// home.js - Direct database access for home data
const { query } = require('../db/pool');
const logger = require('../utils/logger');
const { getDeviceInfo } = require('../services/deviceDatabase');

// Home data configuration (copied from 2500i_embedded)
const homeDataConfig = [
  {
    name: 'discharge_rate_setpoint',
    channum: 271,
    sztag: 'DAO_DISCHRG_RATE_SP',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: null,
    maxRange: null,
  },
  {
    name: 'moisture_setpoint',
    channum: 20,
    sztag: 'DAI_MOISTURE_SP',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 1,
    maxRange: 50,
  },
  {
    name: 'drying_temperature',
    channum: 50,
    sztag: 'DAI_APT_TEMP',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: -700,
    maxRange: 700,
  },
  {
    name: 'not_ready_reason',
    channum: 277,
    sztag: 'DAO_NOT_READY_REASON',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: null,
    maxRange: null,
  },
  {
    name: 'discharge_rate',
    channum: 49,
    sztag: 'DAI_DISPLAY_RATE',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 20000,
  },
  {
    name: 'residence_time',
    channum: 268,
    sztag: 'DAO_RESIDENCE_T',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 86400,
  },
  {
    name: 'suggested_rate',
    channum: 184,
    sztag: 'CDP_SUGGEST_RATE',
    column: 'pv',
    value: 0,
    table: 'cdp_table',
    minRange: 0,
    maxRange: 20000,
  },
  {
    name: 'outlet_moisture',
    channum: 301,
    sztag: 'DAI_OUTLET_MOISTURE',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 50,
  },
  {
    name: 'outlet_temperature',
    channum: 307,
    sztag: 'DAI_OUTLET_TEMP',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 450,
  },
  {
    name: 'outlet_state',
    channum: 353,
    sztag: 'DAI_OUT_STATE',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 4,
  },
  {
    name: 'inlet_moisture',
    channum: 300,
    sztag: 'DAI_INLET_MOISTURE',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 50,
  },
  {
    name: 'inlet_temperature',
    channum: 308,
    sztag: 'DAI_INLET_TEMP',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 450,
  },
  {
    name: 'inlet_state',
    channum: 350,
    sztag: 'DAI_INLET_STATE',
    column: 'pv',
    value: 0,
    table: 'io_table',
    minRange: 0,
    maxRange: 4,
  },
  {
    name: 'dryer_state',
    channum: 105,
    sztag: 'CDP_DRYER_STATE',
    column: 'pv',
    value: 0,
    table: 'cdp_table',
    minRange: 0,
    maxRange: 5,
  },
  {
    name: 'mode_control',
    channum: 121,
    sztag: 'CDP_MODE',
    column: 'pv',
    value: 0,
    table: 'cdp_table',
    minRange: 0,
    maxRange: 100,
  },
];

// Home API should only read from database, not update connection state
// Connection state is managed by the WebSocket client directly

// Database connection state updates are handled by WebSocket client
// This API only reads from database

// Device info is now handled by the shared deviceDatabase service
// No need for separate implementation here

// Function to get alarm data
async function getAlarmData() {
  try {
    const result = await query('SELECT * FROM alarm_table WHERE in_alarm = 1 ORDER BY channum LIMIT 1');
    
    if (result.rows.length > 0) {
      const alarm = result.rows[0];
      return {
        name: 'alarm_data',
        value: alarm.in_alarm || 0,
        isActive: alarm.in_alarm === 1,
        message: alarm.ha_msg || alarm.hw_msg || alarm.la_msg || alarm.lw_msg || 'Active alarm',
        channum: alarm.channum,
        sztag: alarm.sztag
      };
    }
    
    return {
      name: 'alarm_data',
      value: 0,
      isActive: false,
      message: 'No alarms',
      channum: 0,
      sztag: ''
    };
  } catch (error) {
    logger.warn('[Home API] Alarm table not found or error accessing it:', error.message);
    return {
      name: 'alarm_data',
      value: 0,
      isActive: false,
      message: 'No alarms',
      channum: 0,
      sztag: ''
    };
  }
}

// Function to get chart data (last 4 hours with 10-minute averages)
async function getChartData() {
  try {
    const result = await query(
      'SELECT * FROM history_inam ORDER BY "createdAt" DESC LIMIT 240'
    );
    
    if (result.rows.length === 0) {
      return {
        success: true,
        message: 'No chart data available',
        total: 0,
        data: []
      };
    }

    // Calculate 10-minute averages
    const averages = [];
    for (let i = 0; i < result.rows.length; i += 10) {
      const tenMinuteSlice = result.rows.slice(i, i + 10);
      const averageRecord = tenMinuteSlice.reduce((acc, record, index) => {
        Object.keys(record).forEach((key) => {
          if (typeof record[key] === 'number') {
            acc[key] = (acc[key] || 0) + record[key];
          }
        });
        return acc;
      }, {});

      // Calculate the actual average for numeric fields
      Object.keys(averageRecord).forEach((key) => {
        if (typeof averageRecord[key] === 'number') {
          averageRecord[key] = averageRecord[key] / tenMinuteSlice.length;
        }
      });

      // Use the first record's non-numeric data as the base for the average record
      averages.push({
        ...tenMinuteSlice[0],
        ...averageRecord,
      });
    }

    return {
      success: true,
      message: 'Chart Data!',
      total: averages.length,
      data: averages
    };
  } catch (error) {
    logger.error('[Home API] Error fetching chart data:', error.message);
    return {
      success: false,
      message: 'Error fetching chart data',
      total: 0,
      data: []
    };
  }
}

// Function to get live home data
async function getLiveHomeData() {
  try {
    const channumArray = homeDataConfig.map((item) => item.channum);
    const data = [...homeDataConfig];

    // Get sensor data for each item
    for (const item of data) {
      const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
      const result = await query(text, [channumArray]);
      const matchingRow = result.rows.find(
        (row) => row.channum === item.channum
      );
      
      if (!matchingRow) {
        logger.warn(`[Home API] No matching row found for channum: ${item.channum}`);
        item.name = `${item.name}_N/A`;
        item.value = 0;
        item.sztag = 0;
        // Removed alarm limits - we rely on alarm_table for alarm messages
      } else {
        item.value = matchingRow[item.column] || 0;
        item.sztag = matchingRow.sztag || 0;
        // Removed alarm limits - we rely on alarm_table for alarm messages
      }
    }

    // Get device info using shared service and alarm data
    const deviceInfo = await getDeviceInfo();
    const alarmData = await getAlarmData();

    // Simply return the device info from database
    // WebSocket client manages connection state updates
    return {
      sensorData: [...data, alarmData],
      deviceInfo: deviceInfo ? {
        serial: deviceInfo.serial,
        registerPassword: deviceInfo.registerPassword,
        cloudConnection: deviceInfo.cloudConnection,
        lastConnected: deviceInfo.lastConnected
      } : {
        serial: 'N/A',
        registerPassword: 'N/A',
        cloudConnection: false,
        lastConnected: null
      }
    };
  } catch (error) {
    logger.error('[Home API] Error getting live home data:', error.message);
    throw error;
  }
}

// Graceful shutdown - delegated to centralized database service
async function closeDatabase() {
  // Database closing is handled by centralDatabase service
  logger.info('[Home API] 🔌 Database connection cleanup delegated to central service');
}

module.exports = {
  getLiveHomeData,
  getChartData,
  closeDatabase,
};