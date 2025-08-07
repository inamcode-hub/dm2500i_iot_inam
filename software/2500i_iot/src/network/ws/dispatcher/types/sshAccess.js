// network/ws/dispatcher/types/sshAccess.js
const logger = require('@utils/logger');

let sshEnabledUntil = null;

function handleSshAccess(message) {
  const { durationSeconds = 300, token = null } = message;

  sshEnabledUntil = Date.now() + durationSeconds * 1000;
  logger.info(`[SSH] Access temporarily enabled for ${durationSeconds}s`);

  if (token) {
    logger.debug(`[SSH] Session token received: ${token}`);
    // Store or validate it later
  }

  // Optional: update a file or env that SSH daemon reads
}

function isSshAccessAllowed() {
  return sshEnabledUntil && Date.now() < sshEnabledUntil;
}

module.exports = {
  handleSshAccess,
  isSshAccessAllowed,
};
