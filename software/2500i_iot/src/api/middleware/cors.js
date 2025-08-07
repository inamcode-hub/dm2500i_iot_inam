// middleware/cors.js - CORS middleware
const logger = require('../../utils/logger');

/**
 * CORS middleware to handle cross-origin requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function corsMiddleware(req, res, next) {
  // Set CORS headers
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug(`[CORS] Preflight request for ${req.path}`);
    return res.sendStatus(200);
  }
  
  next();
}

module.exports = corsMiddleware;