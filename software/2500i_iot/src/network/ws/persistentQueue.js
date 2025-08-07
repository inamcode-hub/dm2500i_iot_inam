const fs = require('fs');
const path = require('path');
const logger = require('@utils/logger');

const FILE = path.join(__dirname, '../../.offline_queue.json');

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const content = fs.readFileSync(FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    logger.error(`[PersistentQueue] Failed to load: ${err.message}`);
  }
  return [];
}

function save(queue) {
  try {
    fs.writeFileSync(FILE, JSON.stringify(queue, null, 2));
    logger.debug('[PersistentQueue] Saved queue to disk');
  } catch (err) {
    logger.error(`[PersistentQueue] Save error: ${err.message}`);
  }
}

module.exports = { load, save };
