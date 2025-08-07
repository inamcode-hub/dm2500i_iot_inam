// routes/alarmsRoutes.js - Alarms and Support API routes
// RESTful routes for alarm management and support

const express = require('express');
const router = express.Router();
const {
  getActiveAlarms,
  getAlarmHistory,
  getAlarmConfig,
  getSupportInfo,
  acknowledgeAlarm,
} = require('../controllers/alarms/alarmsController');

// Alarms routes
router.get('/', getActiveAlarms);               // GET /api/v1/alarms
router.get('/history', getAlarmHistory);       // GET /api/v1/alarms/history
router.get('/config', getAlarmConfig);         // GET /api/v1/alarms/config
router.post('/:id/acknowledge', acknowledgeAlarm); // POST /api/v1/alarms/:id/acknowledge

// Support routes (combined with alarms for related functionality)
router.get('/support', getSupportInfo);        // GET /api/v1/alarms/support

module.exports = router;