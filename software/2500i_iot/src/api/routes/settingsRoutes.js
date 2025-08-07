// routes/settingsRoutes.js - Settings API routes
// RESTful routes for settings management

const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
  getSettingsCategories,
  resetSetting,
} = require('../controllers/settings/settingsController');

// Settings routes
router.get('/', getSettings);                    // GET /api/v1/settings
router.get('/categories', getSettingsCategories); // GET /api/v1/settings/categories
router.get('/:name', getSetting);               // GET /api/v1/settings/:name
router.put('/:name', updateSetting);            // PUT /api/v1/settings/:name
router.put('/', updateSettings);                // PUT /api/v1/settings (batch update)
router.post('/:name/reset', resetSetting);      // POST /api/v1/settings/:name/reset

module.exports = router;