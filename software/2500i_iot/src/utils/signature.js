// src/utils/signature.js
const crypto = require('crypto');

/**
 * Signs a JSON payload using HMAC SHA256.
 * @param {object} payload - The JSON object to sign.
 * @param {string} secret - The shared secret key.
 * @returns {string} - Hexadecimal signature.
 */
function signPayload(payload, secret) {
  const payloadString = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
  return signature;
}

module.exports = { signPayload };
