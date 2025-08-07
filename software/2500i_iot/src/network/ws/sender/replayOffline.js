const { load } = require('../persistentQueue');
const logger = require('@utils/logger');

function replayQueue(socket) {
  const oldMessages = load();
  if (!oldMessages.length) return;

  for (const msg of oldMessages) {
    socket.send(JSON.stringify(msg));
    logger.info('[Replay] Re-sent message after offline recovery');
  }
}

module.exports = replayQueue;
