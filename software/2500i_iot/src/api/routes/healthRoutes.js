// routes/healthRoutes.js - Health check routes
const express = require('express');
const router = express.Router();
const { healthCheck } = require('../controllers/healthController');

/**
 * @route GET /api/v1/health
 * @desc Health check endpoint - returns API status, database connectivity, and system info
 * @access Public
 */
router.get('/', healthCheck);

module.exports = router;