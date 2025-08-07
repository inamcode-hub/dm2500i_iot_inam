// middleware/logging.js - Request logging middleware
const logger = require('../../utils/logger');

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function loggingMiddleware(req, res, next) {
  const start = Date.now();
  
  // Only log non-GET requests or errors
  if (req.method !== 'GET') {
    logger.info(`[API] ${req.method} ${req.path} - ${req.ip}`);
  }
  
  // Log request body for POST/PUT requests (excluding sensitive data)
  if (req.method === 'POST' || req.method === 'PUT') {
    const body = { ...req.body };
    // Remove sensitive fields if they exist
    delete body.password;
    delete body.token;
    delete body.secret;
    
    if (Object.keys(body).length > 0) {
      logger.debug(`[API] Request body: ${JSON.stringify(body)}`);
    }
  }
  
  // Override res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    // Only log response for non-GET or errors
    if (req.method !== 'GET' || res.statusCode >= 400) {
      logger.info(`[API] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
    
    // Log response for errors
    if (res.statusCode >= 400) {
      logger.error(`[API] Error response: ${JSON.stringify(data)}`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
}

module.exports = loggingMiddleware;