// routes/homeRoutes.js - Home data routes
const express = require('express');
const router = express.Router();
const { getHomeData, getChartData } = require('../controllers/homeController');

/**
 * @route GET /api/v1/home/data
 * @desc Get live home data including sensor readings and device info
 * @access Public
 */
router.get('/data', getHomeData);

/**
 * @route GET /api/v1/home/chart
 * @desc Get historical chart data with 10-minute averages
 * @access Public
 */
router.get('/chart', getChartData);

module.exports = router;