// streamRegistry.js

const home = require('./types/home');
const settings = require('./types/settings');
const diagnostic = require('./types/diagnostic');
const custom = require('./types/custom'); // assume this will be polling in the future

const registry = {
  home: { mode: 'sse', handler: home },
  settings: { mode: 'sse', handler: settings },
  diagnostic: { mode: 'sse', handler: diagnostic },
  custom: { mode: 'poll', handler: custom },
};

function get(type) {
  return registry[type];
}

module.exports = { get };
