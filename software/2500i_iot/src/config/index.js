// config/index.js - Environment loader

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requiredVars = [
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'DB_HOST',
  'DB_PORT',
  'SERVER_URL',
  'DEVICE_TYPE',
];

for (const key of requiredVars) {
  if (!process.env[key]) {
    console.error(`[CONFIG] Missing required env var: ${key}`);
    process.exit(1);
  }
}

// Add default values for optional configurations
const config = {
  ...process.env,
  ALARM_CHECK_INTERVAL: process.env.ALARM_CHECK_INTERVAL || 5000,
  DEVICE_ID: process.env.DEVICE_ID || process.env.DEVICE_TYPE,
  SERIAL_NUMBER: process.env.SERIAL_NUMBER || 'DM2500i-001',
  MODEL: process.env.MODEL || 'DM2500i',
  API_PORT: process.env.API_PORT || 3003
};

module.exports = config;
