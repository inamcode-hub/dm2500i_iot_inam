// network/ws/dispatcher/types/config.js
const logger = require('@utils/logger');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../../../config/runtime.json');

function handleConfigUpdate(message) {
  logger.info('[Config] Update received from server');

  if (!message.config || typeof message.config !== 'object') {
    return logger.warn('[Config] Invalid config format');
  }

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(message.config, null, 2));
    logger.info('[Config] Runtime config saved successfully');
  } catch (err) {
    logger.error(`[Config] Failed to save config: ${err.message}`);
  }
}

module.exports = handleConfigUpdate;
