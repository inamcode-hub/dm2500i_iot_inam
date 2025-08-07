// Tracks active stream intervals

const activeStreams = new Map();

function set(type, intervalId) {
  activeStreams.set(type, intervalId);
}

function get(type) {
  return activeStreams.get(type);
}

function deleteEntry(type) {
  activeStreams.delete(type);
}

function isActive(type) {
  return activeStreams.has(type);
}

function all() {
  return activeStreams.keys();
}

module.exports = {
  set,
  get,
  delete: deleteEntry,
  isActive,
  all,
};
