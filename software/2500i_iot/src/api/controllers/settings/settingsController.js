// controllers/settings/settingsController.js - Settings API controller
// Handles settings retrieval and updates

const { query } = require('../../../db/pool');
const updateService = require('../../services/updateService');
const { SETTINGS_DATA, SETTINGS_CATEGORIES, DataConfigHelper } = require('../../data');
const { STATUS, HTTP_STATUS } = require('../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Get all settings data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSettings(req, res) {
  try {
    const { category, writable } = req.query;
    
    logger.debug('[SettingsController] Get settings request');
    
    // Filter settings based on query parameters
    let settings = [...SETTINGS_DATA];
    
    if (category) {
      settings = settings.filter(setting => setting.category === category);
    }
    
    if (writable === 'true') {
      settings = settings.filter(setting => setting.writable !== false);
    }
    
    // Get current values from database
    const settingsWithValues = await Promise.all(
      settings.map(async (setting) => {
        try {
          const queryText = `SELECT ${setting.column} FROM ${setting.table} WHERE channum = $1`;
          const result = await query(queryText, [setting.channum]);
          
          return {
            ...setting,
            value: result.rows[0] ? result.rows[0][setting.column] : null,
            status: result.rows[0] ? 'active' : 'inactive',
          };
        } catch (error) {
          logger.warn(`[SettingsController] Error getting value for ${setting.name}:`, error.message);
          return {
            ...setting,
            value: null,
            status: 'error',
            error: error.message,
          };
        }
      })
    );
    
    // Group by category
    const settingsByCategory = {};
    settingsWithValues.forEach(setting => {
      if (!settingsByCategory[setting.category]) {
        settingsByCategory[setting.category] = [];
      }
      settingsByCategory[setting.category].push(setting);
    });
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Settings retrieved successfully',
      data: {
        settings: settingsWithValues,
        categories: settingsByCategory,
        categoryInfo: SETTINGS_CATEGORIES,
        total: settingsWithValues.length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[SettingsController] Error getting settings:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve settings',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get specific setting by name
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSetting(req, res) {
  try {
    const { name } = req.params;
    
    logger.debug(`[SettingsController] Get setting: ${name}`);
    
    const result = await updateService.getParameterValue(name);
    
    if (!result.success) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: STATUS.ERROR,
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get setting configuration
    const settingConfig = DataConfigHelper.getParameterByName(name);
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Setting retrieved successfully',
      data: {
        ...result,
        config: settingConfig,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error(`[SettingsController] Error getting setting ${req.params.name}:`, error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve setting',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Update specific setting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateSetting(req, res) {
  try {
    const { name } = req.params;
    const { value } = req.body;
    
    logger.debug(`[SettingsController] Update setting: ${name} = ${value}`);
    
    if (value === undefined) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: 'Value is required',
        timestamp: new Date().toISOString(),
      });
    }
    
    const result = await updateService.updateParameter(name, value);
    
    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Setting updated successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error(`[SettingsController] Error updating setting ${req.params.name}:`, error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to update setting',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Update multiple settings
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateSettings(req, res) {
  try {
    const { settings } = req.body;
    
    logger.debug(`[SettingsController] Batch update settings: ${settings.length} items`);
    
    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: 'Settings array is required',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate all settings have required fields
    const invalidSettings = settings.filter(s => !s.paramName || s.value === undefined);
    if (invalidSettings.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: 'All settings must have paramName and value',
        invalidSettings,
        timestamp: new Date().toISOString(),
      });
    }
    
    const result = await updateService.updateParameters(settings);
    
    res.status(HTTP_STATUS.OK).json({
      status: result.success ? STATUS.SUCCESS : STATUS.ERROR,
      message: result.success ? 'Settings updated successfully' : 'Some settings failed to update',
      data: result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[SettingsController] Error in batch update:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to update settings',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get settings categories
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSettingsCategories(req, res) {
  try {
    logger.debug('[SettingsController] Get settings categories');
    
    // Count settings in each category
    const categoryCounts = {};
    SETTINGS_DATA.forEach(setting => {
      categoryCounts[setting.category] = (categoryCounts[setting.category] || 0) + 1;
    });
    
    // Add counts to category info
    const categoriesWithCounts = Object.entries(SETTINGS_CATEGORIES).map(([key, category]) => ({
      key,
      ...category,
      count: categoryCounts[key] || 0,
    }));
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Settings categories retrieved successfully',
      data: {
        categories: categoriesWithCounts,
        total: Object.keys(SETTINGS_CATEGORIES).length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[SettingsController] Error getting categories:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve categories',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Reset setting to default value
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function resetSetting(req, res) {
  try {
    const { name } = req.params;
    
    logger.debug(`[SettingsController] Reset setting: ${name}`);
    
    const settingConfig = DataConfigHelper.getParameterByName(name);
    if (!settingConfig) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: STATUS.ERROR,
        message: 'Setting not found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Use default value if available, otherwise use midpoint of range
    let defaultValue = settingConfig.defaultValue;
    if (defaultValue === undefined) {
      if (settingConfig.minRange !== null && settingConfig.maxRange !== null) {
        defaultValue = (settingConfig.minRange + settingConfig.maxRange) / 2;
      } else {
        defaultValue = 0;
      }
    }
    
    const result = await updateService.updateParameter(name, defaultValue);
    
    if (!result.success) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: result.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Setting reset to default value',
      data: {
        ...result,
        defaultValue,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error(`[SettingsController] Error resetting setting ${req.params.name}:`, error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to reset setting',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  getSettings,
  getSetting,
  updateSetting,
  updateSettings,
  getSettingsCategories,
  resetSetting,
};