// data/index.js - Centralized data configuration exports
// Unified export for all data configurations

const { SETTINGS_DATA, SETTINGS_CATEGORIES } = require('./settingsData');
const { DIAGNOSTICS_DATA, DIAGNOSTICS_CATEGORIES } = require('./diagnosticsData');
const { 
  ALARM_TYPES, 
  ALARM_PARAMETERS, 
  ALARM_CATEGORIES, 
  ALARM_STATES, 
  ALARM_ACTIONS,
  SUPPORT_CATEGORIES 
} = require('./alarmsData');

// Import existing configurations
const { KEYPAD_PARAMETERS, MODE_PARAMETERS, DEVICE_MODES } = require('../config/keypadData');

// Unified data configuration
const DATA_CONFIG = {
  // Core device parameters
  KEYPAD_PARAMETERS,
  MODE_PARAMETERS,
  DEVICE_MODES,
  
  // Settings configuration
  SETTINGS_DATA,
  SETTINGS_CATEGORIES,
  
  // Diagnostics configuration
  DIAGNOSTICS_DATA,
  DIAGNOSTICS_CATEGORIES,
  
  // Alarms configuration
  ALARM_TYPES,
  ALARM_PARAMETERS,
  ALARM_CATEGORIES,
  ALARM_STATES,
  ALARM_ACTIONS,
  
  // Support configuration
  SUPPORT_CATEGORIES,
};

// Helper functions for data configuration
const DataConfigHelper = {
  // Get parameter by name from any configuration
  getParameterByName: (paramName) => {
    const allParameters = [
      ...KEYPAD_PARAMETERS,
      ...SETTINGS_DATA,
      ...DIAGNOSTICS_DATA,
      ...ALARM_PARAMETERS,
    ];
    return allParameters.find(param => param.name === paramName);
  },
  
  // Get parameter by channel number
  getParameterByChannel: (channum) => {
    const allParameters = [
      ...KEYPAD_PARAMETERS,
      ...SETTINGS_DATA,
      ...DIAGNOSTICS_DATA,
      ...ALARM_PARAMETERS,
    ];
    return allParameters.find(param => param.channum === channum);
  },
  
  // Get parameters by category
  getParametersByCategory: (category) => {
    const allParameters = [
      ...KEYPAD_PARAMETERS,
      ...SETTINGS_DATA,
      ...DIAGNOSTICS_DATA,
      ...ALARM_PARAMETERS,
    ];
    return allParameters.filter(param => param.category === category);
  },
  
  // Get parameters by table
  getParametersByTable: (tableName) => {
    const allParameters = [
      ...KEYPAD_PARAMETERS,
      ...SETTINGS_DATA,
      ...DIAGNOSTICS_DATA,
      ...ALARM_PARAMETERS,
    ];
    return allParameters.filter(param => param.table === tableName);
  },
  
  // Get writable parameters
  getWritableParameters: () => {
    const allParameters = [
      ...KEYPAD_PARAMETERS,
      ...SETTINGS_DATA,
    ];
    return allParameters.filter(param => param.writable !== false);
  },
  
  // Get all categories
  getAllCategories: () => {
    return {
      ...SETTINGS_CATEGORIES,
      ...DIAGNOSTICS_CATEGORIES,
      ...ALARM_CATEGORIES,
      ...SUPPORT_CATEGORIES,
    };
  },
  
  // Validate parameter value
  validateParameterValue: (paramName, value) => {
    const param = DataConfigHelper.getParameterByName(paramName);
    if (!param) {
      return { valid: false, error: 'Parameter not found' };
    }
    
    if (param.minRange !== null && value < param.minRange) {
      return { valid: false, error: `Value below minimum range (${param.minRange})` };
    }
    
    if (param.maxRange !== null && value > param.maxRange) {
      return { valid: false, error: `Value exceeds maximum range (${param.maxRange})` };
    }
    
    return { valid: true };
  },
};

module.exports = {
  DATA_CONFIG,
  DataConfigHelper,
  
  // Direct exports for convenience
  SETTINGS_DATA,
  SETTINGS_CATEGORIES,
  DIAGNOSTICS_DATA,
  DIAGNOSTICS_CATEGORIES,
  ALARM_TYPES,
  ALARM_PARAMETERS,
  ALARM_CATEGORIES,
  ALARM_STATES,
  ALARM_ACTIONS,
  SUPPORT_CATEGORIES,
  KEYPAD_PARAMETERS,
  MODE_PARAMETERS,
  DEVICE_MODES,
};