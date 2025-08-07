// config/constants.js - API constants and configuration
require('dotenv').config();

module.exports = {
  // Server Configuration
  API_PORT: process.env.API_PORT || 3003,
  
  // Database Configuration
  DB_CONFIG: {
    user: process.env.DB_USER || 'dmi',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'dm',
    password: process.env.DB_PASSWORD || 'dmi',
    port: process.env.DB_PORT || 5432,
  },
  
  // API Endpoints
  ENDPOINTS: {
    HEALTH: '/api/v1/health',
    HOME: {
      DATA: '/api/v1/home/data',
      CHART: '/api/v1/home/chart',
    },
    UPDATES: {
      KEYPAD: '/api/v1/updates/keypad_updates',
      MODE: '/api/v1/updates/mode_controller',
      PARAMETERS: '/api/v1/updates/parameters',
      MODES: '/api/v1/updates/modes',
    },
  },
  
  // Device Operation Modes
  DEVICE_MODES: {
    LOCAL: 'local_mode',
    MANUAL: 'manual_mode',
    AUTOMATIC: 'automatic_mode',
  },
  
  // Mode Channel Configuration
  MODE_CHANNELS: {
    LOCAL: { 89: 0, 156: 0 },
    MANUAL: { 89: 0, 156: 1 },
    AUTOMATIC: { 89: 1, 156: 1 },
  },
  
  // Response Status Codes
  STATUS: {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
  },
  
  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500,
  },
  
  // Validation Constants
  VALIDATION: {
    MAX_PARAMETER_NAME_LENGTH: 100,
    MAX_VALUE_LENGTH: 50,
  },
};