// routes/diagnosticsRoutes.js - Diagnostics API routes
// RESTful routes for diagnostics monitoring

const express = require('express');
const router = express.Router();
const {
  getDiagnostics,
  getDiagnostic,
  getDiagnosticsCategories,
  getSystemHealth,
} = require('../controllers/diagnostics/diagnosticsController');

// Diagnostics routes
router.get('/', getDiagnostics);                    // GET /api/v1/diagnostics
router.get('/categories', getDiagnosticsCategories); // GET /api/v1/diagnostics/categories
router.get('/health', getSystemHealth);             // GET /api/v1/diagnostics/health
router.get('/:name', getDiagnostic);               // GET /api/v1/diagnostics/:name

module.exports = router;