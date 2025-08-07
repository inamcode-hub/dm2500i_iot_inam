// network/ws/connectionState.js
const state = require('../../device/state');

function setSocketConnected(status) {
  state.setConnectionStatus(status);
}

function isSocketConnected() {
  return state.isSocketConnected();
}

module.exports = {
  setSocketConnected,
  isSocketConnected,
};
