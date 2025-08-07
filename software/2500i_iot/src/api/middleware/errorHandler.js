// middleware/errorHandler.js - Error handling middleware
const logger = require('../../utils/logger');
const { STATUS, HTTP_STATUS } = require('../config/constants');

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
function errorHandler(err, req, res, next) {
  logger.error(`[API Error] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });
  
  // Default error response
  let statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
  let message = 'Internal server error';
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    message = err.message;
  } else if (err.name === 'DatabaseError') {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    message = 'Database operation failed';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }
  
  res.status(statusCode).json({
    status: STATUS.ERROR,
    message: message,
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
  logger.warn(`[API] 404 Not Found: ${req.method} ${req.path}`);
  
  res.status(HTTP_STATUS.NOT_FOUND).json({
    status: STATUS.ERROR,
    message: 'Endpoint not found',
    timestamp: new Date().toISOString(),
    path: req.path,
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};