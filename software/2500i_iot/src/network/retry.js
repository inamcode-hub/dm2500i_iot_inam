const constants = require('../config/constants');
const logger = require('@utils/logger');
async function retry(fn, retries = 5, action = 'UnnamedAction') {
  let attempt = 0;
  let delay = constants.RETRY_BACKOFF_BASE_MS;
  const context = `[retry][${action}]`;

  while (attempt < retries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      await handleRetryError(err, attempt, delay, context);

      if (attempt >= retries) break;

      await new Promise((res) => setTimeout(res, delay));
      delay = Math.min(delay * 2, constants.RETRY_BACKOFF_MAX_MS);
    }
  }

  logger.error(`${context} All ${retries} attempts failed`);
  throw new Error('[retry] Max retries exceeded');
}

async function handleRetryError(err, attempt, delay, context) {
  const status = err.response?.status;
  const retryAfter = err.response?.headers?.['retry-after'];

  if (status === 429 && retryAfter) {
    const waitTime = parseInt(retryAfter, 10) * 1000;
    logger.warn(
      `${context} 429 Too Many Requests. Waiting ${waitTime}ms (retry-After)`
    );
    await new Promise((res) => setTimeout(res, waitTime));
    return;
  }

  logger.warn(
    `${context} Attempt ${attempt} failed: ${err.code || err.message}`
  );
  if (err.response) {
    logger.debug(`${context} Server responded with status ${status}`);
  } else {
    logger.debug(`${context} No response (network or server down)`);
  }

  logger.debug(`${context} Waiting ${delay}ms before retry...`);
}

module.exports = retry;
