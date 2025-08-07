const registry = require('./streamRegistry');
const deviceState = require('../../../device/state');
const state = require('./streamState');
const logger = require('@utils/logger');

function start(streamType, socket) {
  if (state.isActive(streamType)) return;

  const entry = registry.get(streamType);
  if (!entry || !entry.handler) {
    logger.warn(`[StreamManager] Unknown stream type: ${streamType}`);
    return;
  }

  const { mode, handler } = entry;

  if (mode === 'sse') {
    handler(socket, streamType); // e.g., home(socket, 'home')
    state.set(streamType, 'sse');
    logger.info(`[StreamManager] 🔊 Started SSE stream: ${streamType}`);
    return;
  }

  if (mode === 'poll') {
    const intervalId = setInterval(async () => {
      const data = await handler();
      const { serial } = deviceState.get();
      if (socket && socket.readyState === socket.OPEN) {
        socket.send(
          JSON.stringify({
            type: 'streamData',
            serial,
            streamType,
            data,
            timestamp: Date.now(),
          })
        );
      }
    }, 1000);

    state.set(streamType, intervalId);
    logger.info(`[StreamManager] ⏱ Started polling stream: ${streamType}`);
    return;
  }

  logger.warn(`[StreamManager] Unsupported stream mode: ${mode}`);
}

function stop(streamType) {
  const entry = registry.get(streamType);
  const mode = entry?.mode;
  const handler = entry?.handler;
  const active = state.get(streamType);

  if (!entry || !active) {
    logger.warn(`[StreamManager] ❌ No active stream found for: ${streamType}`);
    return;
  }

  if (mode === 'sse' && typeof handler?.stop === 'function') {
    handler.stop();
    logger.info(`[StreamManager] 🔴 Stopped SSE stream: ${streamType}`);
  } else if (mode === 'poll') {
    clearInterval(active);
    logger.info(`[StreamManager] 🔴 Stopped polling stream: ${streamType}`);
  }

  state.delete(streamType);
}

function stopAll() {
  for (const type of state.all()) stop(type);
}

module.exports = { start, stop, stopAll };
