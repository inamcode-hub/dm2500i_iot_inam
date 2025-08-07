const axios = require('axios');
const retry = require('../network/retry');
const logger = require('@utils/logger');
const { signPayload } = require('../utils/signature'); // ⬅️ added
require('dotenv').config(); // ⬅️ ensure .env variables are loaded

const SERVER_URL = process.env.SERVER_URL;
const SIGNING_SECRET = process.env.SIGNING_SECRET; // ⬅️ use the secret

async function registerDeviceAPI(payload) {
  return retry(
    async () => {
      logger.debug(
        '[serverApi] → Registering device with payload:\n' +
          JSON.stringify(payload, null, 2)
      );

      // ⬅️ Compute the X-Signature
      const signature = signPayload(payload, SIGNING_SECRET);
      logger.debug(`[serverApi] → X-Signature: ${signature}`);

      try {
        const res = await axios.post(
          `${SERVER_URL}/devices/register`,
          payload,
          {
            headers: {
              'X-Signature': signature,
            },
          }
        );

        logger.info(`[serverApi] ← Registered device: ${res.data.serial}`);
        return res.data;
      } catch (err) {
        logDetailedError('Register Device', err, payload);
        throw err;
      }
    },
    5,
    'RegisterDevice'
  );
}

async function renewTokenAPI(serial, token) {
  return retry(
    async () => {
      logger.debug(`[serverApi] → Renewing token for serial: ${serial}`);

      const payload = { serial, oldToken: token };
      const signature = signPayload(payload, SIGNING_SECRET);
      logger.debug(`[serverApi] → X-Signature: ${signature}`);

      try {
        const res = await axios.post(
          `${SERVER_URL}/devices/renew-token`,
          payload,
          {
            headers: {
              'X-Signature': signature,
            },
          }
        );

        logger.info('[serverApi] ← Token renewed successfully');
        return res.data;
      } catch (err) {
        logDetailedError('Renew Token', err, { serial });
        throw err;
      }
    },
    5,
    'RenewToken'
  );
}

function logDetailedError(action, err, payload = null) {
  const status = err.response?.status;
  const data = err.response?.data;
  const message = err.message;

  logger.error(`[serverApi] ✖ ${action} failed`);

  if (status) {
    logger.error(`  ↳ Status: ${status}`);
  }

  if (data) {
    logger.error(`  ↳ Response body: ${JSON.stringify(data)}`);
  }

  if (status === 400 && payload) {
    logger.error(
      `  ↳ Sent payload (truncated): ${JSON.stringify(payload).slice(
        0,
        200
      )}...`
    );
  }

  if (!status && !data) {
    logger.error(`  ↳ No response from server`);
  }

  logger.debug(`  ↳ Error message: ${message}`);
}

module.exports = {
  registerDeviceAPI,
  renewTokenAPI,
};
