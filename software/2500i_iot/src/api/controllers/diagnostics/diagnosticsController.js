// controllers/diagnostics/diagnosticsController.js - Diagnostics API controller
// Handles real-time diagnostics data retrieval

const { query } = require('../../../db/pool');
const { DIAGNOSTICS_DATA, DIAGNOSTICS_CATEGORIES, DataConfigHelper } = require('../../data');
const { STATUS, HTTP_STATUS } = require('../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Get all diagnostics data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDiagnostics(req, res) {
  try {
    const { category, type } = req.query;
    
    logger.debug('[DiagnosticsController] Get diagnostics request');
    
    // Filter diagnostics based on query parameters
    let diagnostics = [...DIAGNOSTICS_DATA];
    
    if (category) {
      diagnostics = diagnostics.filter(diagnostic => diagnostic.category === category);
    }
    
    if (type) {
      diagnostics = diagnostics.filter(diagnostic => diagnostic.type === type);
    }
    
    // Get current values from database
    const diagnosticsWithValues = await Promise.all(
      diagnostics.map(async (diagnostic) => {
        try {
          const queryText = `SELECT ${diagnostic.column} FROM ${diagnostic.table} WHERE channum = $1`;
          const result = await query(queryText, [diagnostic.channum]);
          
          return {
            ...diagnostic,
            value: result.rows[0] ? result.rows[0][diagnostic.column] : null,
            status: result.rows[0] ? 'active' : 'inactive',
            lastUpdated: new Date().toISOString(),
          };
        } catch (error) {
          logger.warn(`[DiagnosticsController] Error getting value for ${diagnostic.name}:`, error.message);
          return {
            ...diagnostic,
            value: null,
            status: 'error',
            error: error.message,
            lastUpdated: new Date().toISOString(),
          };
        }
      })
    );
    
    // Group by category
    const diagnosticsByCategory = {};
    diagnosticsWithValues.forEach(diagnostic => {
      if (!diagnosticsByCategory[diagnostic.category]) {
        diagnosticsByCategory[diagnostic.category] = [];
      }
      diagnosticsByCategory[diagnostic.category].push(diagnostic);
    });
    
    // Calculate category health
    const categoryHealth = {};
    Object.keys(diagnosticsByCategory).forEach(category => {
      const categoryDiagnostics = diagnosticsByCategory[category];
      const activeCount = categoryDiagnostics.filter(d => d.status === 'active').length;
      const errorCount = categoryDiagnostics.filter(d => d.status === 'error').length;
      
      categoryHealth[category] = {
        total: categoryDiagnostics.length,
        active: activeCount,
        errors: errorCount,
        health: errorCount === 0 ? 'healthy' : (activeCount > errorCount ? 'warning' : 'error'),
      };
    });
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Diagnostics retrieved successfully',
      data: {
        diagnostics: diagnosticsWithValues,
        categories: diagnosticsByCategory,
        categoryInfo: DIAGNOSTICS_CATEGORIES,
        categoryHealth,
        total: diagnosticsWithValues.length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[DiagnosticsController] Error getting diagnostics:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve diagnostics',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get specific diagnostic by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDiagnostic(req, res) {
  try {
    const { name } = req.params;
    
    logger.debug(`[DiagnosticsController] Get diagnostic: ${name}`);
    
    const diagnosticConfig = DIAGNOSTICS_DATA.find(d => d.name === name);
    if (!diagnosticConfig) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: STATUS.ERROR,
        message: 'Diagnostic not found',
        timestamp: new Date().toISOString(),
      });
    }
    
    try {
      const queryText = `SELECT ${diagnosticConfig.column} FROM ${diagnosticConfig.table} WHERE channum = $1`;
      const result = await query(queryText, [diagnosticConfig.channum]);
      
      const diagnostic = {
        ...diagnosticConfig,
        value: result.rows[0] ? result.rows[0][diagnosticConfig.column] : null,
        status: result.rows[0] ? 'active' : 'inactive',
        lastUpdated: new Date().toISOString(),
      };
      
      res.status(HTTP_STATUS.OK).json({
        status: STATUS.SUCCESS,
        message: 'Diagnostic retrieved successfully',
        data: diagnostic,
        timestamp: new Date().toISOString(),
      });
      
    } catch (dbError) {
      logger.error(`[DiagnosticsController] Database error for ${name}:`, dbError.message);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: STATUS.ERROR,
        message: 'Database error',
        error: dbError.message,
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    logger.error(`[DiagnosticsController] Error getting diagnostic ${req.params.name}:`, error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve diagnostic',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get diagnostics categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getDiagnosticsCategories(req, res) {
  try {
    logger.debug('[DiagnosticsController] Get diagnostics categories');
    
    // Count diagnostics in each category
    const categoryCounts = {};
    DIAGNOSTICS_DATA.forEach(diagnostic => {
      categoryCounts[diagnostic.category] = (categoryCounts[diagnostic.category] || 0) + 1;
    });
    
    // Add counts to category info
    const categoriesWithCounts = Object.entries(DIAGNOSTICS_CATEGORIES).map(([key, category]) => ({
      key,
      ...category,
      count: categoryCounts[key] || 0,
    }));
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Diagnostics categories retrieved successfully',
      data: {
        categories: categoriesWithCounts,
        total: Object.keys(DIAGNOSTICS_CATEGORIES).length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[DiagnosticsController] Error getting categories:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve categories',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get system health summary
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSystemHealth(req, res) {
  try {
    logger.debug('[DiagnosticsController] Get system health');
    
    // Get critical system diagnostics
    const criticalDiagnostics = DIAGNOSTICS_DATA.filter(d => 
      d.category === 'system_status' || d.category === 'live_sensors'
    );
    
    const healthData = await Promise.all(
      criticalDiagnostics.map(async (diagnostic) => {
        try {
          const queryText = `SELECT ${diagnostic.column} FROM ${diagnostic.table} WHERE channum = $1`;
          const result = await query(queryText, [diagnostic.channum]);
          
          return {
            name: diagnostic.name,
            description: diagnostic.description,
            value: result.rows[0] ? result.rows[0][diagnostic.column] : null,
            status: result.rows[0] ? 'active' : 'inactive',
            category: diagnostic.category,
            unit: diagnostic.unit,
          };
        } catch (error) {
          return {
            name: diagnostic.name,
            description: diagnostic.description,
            value: null,
            status: 'error',
            category: diagnostic.category,
            unit: diagnostic.unit,
            error: error.message,
          };
        }
      })
    );
    
    // Calculate overall health
    const errorCount = healthData.filter(h => h.status === 'error').length;
    const activeCount = healthData.filter(h => h.status === 'active').length;
    
    let overallHealth = 'healthy';
    if (errorCount > 0) {
      overallHealth = activeCount > errorCount ? 'warning' : 'critical';
    }
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'System health retrieved successfully',
      data: {
        overallHealth,
        healthData,
        summary: {
          total: healthData.length,
          active: activeCount,
          errors: errorCount,
          healthScore: Math.round((activeCount / healthData.length) * 100),
        },
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[DiagnosticsController] Error getting system health:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve system health',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  getDiagnostics,
  getDiagnostic,
  getDiagnosticsCategories,
  getSystemHealth,
};