// device/state.js - In-memory store for current device + socket status

let deviceState = {
  serial: null,
  token: null,
  socketConnected: false,
  lastSocketConnectTime: null, // 🆕 Timestamp
};

// Preserve existing usage
function set({ serial, token }) {
  deviceState.serial = serial;
  deviceState.token = token;
}

function get() {
  return { ...deviceState };
}

function clear() {
  deviceState.serial = null;
  deviceState.token = null;
  deviceState.socketConnected = false;
  deviceState.lastSocketConnectTime = null;
}

// Updated: WebSocket status
function setConnectionStatus(status) {
  deviceState.socketConnected = status;
  if (status) {
    deviceState.lastSocketConnectTime = Date.now();
  }
}

function isSocketConnected() {
  return deviceState.socketConnected;
}

// 🆕 Getter for last connection time
function getLastSocketConnectTime() {
  return deviceState.lastSocketConnectTime;
}

module.exports = {
  set,
  get,
  clear,
  setConnectionStatus,
  isSocketConnected,
  getLastSocketConnectTime,
};
