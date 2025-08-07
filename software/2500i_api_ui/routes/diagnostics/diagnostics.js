const express = require('express');
const {
  DiagnosticsPage,
} = require('../../controllers/diagnostics/diagnosticsPageController');

const router = express.Router();

// mode_controller
router.get('/', DiagnosticsPage);

module.exports = router;
