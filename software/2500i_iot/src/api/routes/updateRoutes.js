// routes/updateRoutes.js - Update operation routes
const express = require('express');
const router = express.Router();
const { 
  updateKeypad, 
  updateMode, 
  getAvailableParameters, 
  getAvailableModes 
} = require('../controllers/updateController');

/**
 * @route POST /api/v1/updates/keypad_updates/:name
 * @desc Update individual keypad parameter
 * @access Public
 * @param {string} name - Parameter name
 * @body {number} value - Parameter value
 */
router.post('/keypad_updates/:name', updateKeypad);

/**
 * @route POST /api/v1/updates/mode_controller
 * @desc Update device operation mode
 * @access Public
 * @body {string} value - Mode value (local_mode, manual_mode, automatic_mode)
 */
router.post('/mode_controller', updateMode);

/**
 * @route GET /api/v1/updates/parameters
 * @desc Get list of available keypad parameters
 * @access Public
 */
router.get('/parameters', getAvailableParameters);

/**
 * @route GET /api/v1/updates/modes
 * @desc Get list of available device modes
 * @access Public
 */
router.get('/modes', getAvailableModes);

module.exports = router;