// network/internetCheck.js

const dns = require('dns');
const https = require('https');
const logger = require('@utils/logger');
const DEFAULT_TIMEOUT_MS = 3000;
const FALLBACK_HOSTS = [
  'www.google.com',
  '1.1.1.1',
  '8.8.8.8',
  'www.cloudflare.com',
  'www.bing.com',
]; // Can be extended
let lastOnlineTimestamp = Date.now();

/**
 * Perform a DNS lookup for google.com
 */
function checkDNS() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      if (!err) {
        // logger.debug('[InternetCheck] DNS check succeeded');
        return resolve(true);
      }
      logger.warn('[InternetCheck] DNS check failed:', err.message);
      resolve(false);
    });
  });
}

/**
 * Perform a HEAD request to one or more fallback hosts
 */
function checkHTTPFallback(timeoutMs) {
  return new Promise((resolve) => {
    let attempts = 0;

    const tryHost = (index) => {
      if (index >= FALLBACK_HOSTS.length) {
        logger.warn('[InternetCheck] All HTTP fallback checks failed');
        return resolve(false);
      }

      const host = FALLBACK_HOSTS[index];
      const req = https.request(
        {
          method: 'HEAD',
          host,
          timeout: timeoutMs,
        },
        () => {
          logger.debug(`[InternetCheck] HTTP check succeeded for ${host}`);
          resolve(true);
        }
      );

      req.on('error', () => {
        logger.debug(`[InternetCheck] HTTP check failed for ${host}`);
        tryHost(index + 1); // Try next host
      });

      req.on('timeout', () => {
        req.destroy();
        logger.debug(`[InternetCheck] HTTP check timed out for ${host}`);
        tryHost(index + 1);
      });

      req.end();
    };

    tryHost(0);
  });
}

/**
 * Composite internet check: DNS first, then HTTP fallback.
 */
async function hasInternetConnection(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const dnsOk = await checkDNS();
  if (dnsOk) {
    lastOnlineTimestamp = Date.now();
    return true;
  }

  const httpOk = await checkHTTPFallback(timeoutMs);
  if (httpOk) {
    lastOnlineTimestamp = Date.now();
    return true;
  }

  return false;
}

/**
 * Get how long we've been offline (in milliseconds)
 */
function getOfflineDuration() {
  return Date.now() - lastOnlineTimestamp;
}

module.exports = {
  hasInternetConnection,
  getOfflineDuration,
};
