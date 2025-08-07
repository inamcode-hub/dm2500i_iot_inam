// diagnostic.js
const deviceState = require('../../../../device/state');
const logger = require('../../../../utils/logger');
const { TextDecoder } = require('util');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

let controller = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;
let retryTimer = null;

function startDiagnosticStream(socket, streamType) {
  const url = `${process.env.LOCAL_API_URL}/diagnostic`;

  if (controller) {
    logger.warn(`[Diagnostic SSE] Already connected`);
    return;
  }

  const connect = async () => {
    controller = new AbortController();
    const signal = controller.signal;

    try {
      const res = await fetch(url, {
        headers: { Accept: 'text/event-stream' },
        signal,
      });

      if (!res.ok) throw new Error(`[Diagnostic SSE] HTTP ${res.status}`);
      logger.info(`[Diagnostic SSE] ✅ Connected to ${url}`);
      reconnectDelay = 1000;

      const decoder = new TextDecoder();
      let buffer = '';

      for await (const chunk of res.body) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;

          try {
            const payloadArray = JSON.parse(line.slice(5).trim());
            if (!Array.isArray(payloadArray)) continue;

            const payload = {
              type: 'streamData',
              streamType,
              serial: deviceState.get().serial,
              data: payloadArray,
              timestamp: Date.now(),
            };

            if (socket && socket.readyState === socket.OPEN) {
              socket.send(JSON.stringify(payload));
            }
          } catch (err) {
            logger.error('[Diagnostic SSE] ❌ JSON parse failed:', err.message);
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.info('[Diagnostic SSE] 🔌 Connection aborted.');
      } else {
        logger.error('[Diagnostic SSE] ⚠️ Stream error:', err.message);
        cleanupStream();
        scheduleReconnect();
      }
    }
  };

  const scheduleReconnect = () => {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      logger.warn(`[Diagnostic SSE] 🔁 Reconnecting in ${reconnectDelay}ms...`);
      connect();
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      retryTimer = null;
    }, reconnectDelay);
  };

  const cleanupStream = () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
  };

  connect();
}

function stopDiagnosticStream() {
  if (controller) {
    controller.abort();
    controller = null;
    logger.info('[Diagnostic SSE] 🔌 Disconnected.');
  }

  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  reconnectDelay = 1000;
}

module.exports = startDiagnosticStream;
module.exports.stop = stopDiagnosticStream;
