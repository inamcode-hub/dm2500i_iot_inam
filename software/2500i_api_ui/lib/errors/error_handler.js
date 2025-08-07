// error-handling-middleware.js

const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  console.error('Error occurred:', err);

  // Handle PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry found.',
          error: err.detail || err.message,
        });
      case '23503': // foreign_key_violation
        return res.status(400).json({
          success: false,
          message: 'Referenced record not found.',
          error: err.detail || err.message,
        });
      case '42703': // undefined_column
        return res.status(500).json({
          success: false,
          message: 'Database schema error.',
          error: err.message,
        });
      case 'ECONNREFUSED':
        return res.status(503).json({
          success: false,
          message: 'Database connection failed.',
          error: 'Service temporarily unavailable',
        });
      default:
        // Other PostgreSQL errors
        if (err.severity) {
          return res.status(400).json({
            success: false,
            message: 'Database error occurred.',
            error: err.message,
          });
        }
    }
  }

  // Handle other errors
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
  });
};

module.exports = errorHandler;