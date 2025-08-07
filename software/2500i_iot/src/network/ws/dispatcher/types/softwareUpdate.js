// network/ws/dispatcher/types/softwareUpdate.js
const logger = require('@utils/logger');
const { exec } = require('child_process');

function handleSoftwareUpdate(message) {
  logger.info('[Update] Software update command received');

  const updateUrl = message.url || ''; // optional URL for binary or script
  const version = message.version || 'latest';

  // Log intent
  logger.info(`[Update] Requested version: ${version}, URL: ${updateUrl}`);

  // Example: run local script
  exec('sh /opt/device/scripts/update.sh', (err, stdout, stderr) => {
    if (err) {
      logger.error(`[Update] Failed: ${err.message}`);
    } else {
      logger.info(`[Update] Output:\n${stdout}`);
      if (stderr) logger.warn(`[Update] Warnings:\n${stderr}`);
    }
  });
}

module.exports = handleSoftwareUpdate;
