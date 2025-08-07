// services/updateService.js - Centralized update service for all parameter updates
// Unified service for handling all device parameter updates

const { query } = require('../../db/pool');
const { DataConfigHelper } = require('../data');
const logger = require('../../utils/logger');

class UpdateService {
  constructor() {
    this.updateQueue = [];
    this.isProcessing = false;
  }

  /**
   * Update a parameter by name
   * @param {string} paramName - Parameter name
   * @param {*} value - New value
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update result
   */
  async updateParameter(paramName, value, options = {}) {
    try {
      // Get parameter configuration
      const param = DataConfigHelper.getParameterByName(paramName);
      if (!param) {
        return {
          success: false,
          error: 'Parameter not found',
          paramName,
          value,
        };
      }

      // Check if parameter is writable
      if (param.writable === false) {
        return {
          success: false,
          error: 'Parameter is read-only',
          paramName,
          value,
        };
      }

      // Validate value
      const validation = DataConfigHelper.validateParameterValue(paramName, value);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          paramName,
          value,
        };
      }

      // Apply value transformation if needed
      const transformedValue = this._transformValue(param, value);

      // Update database
      const updateResult = await this._updateDatabase(param, transformedValue, options);

      // Log update
      logger.info(`[UpdateService] Updated ${paramName} to ${transformedValue}`);

      return {
        success: true,
        paramName,
        value: transformedValue,
        oldValue: updateResult.oldValue,
        channum: param.channum,
        sztag: param.sztag,
        table: param.table,
        column: param.column,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`[UpdateService] Error updating ${paramName}:`, error.message);
      return {
        success: false,
        error: error.message,
        paramName,
        value,
      };
    }
  }

  /**
   * Update multiple parameters in a transaction
   * @param {Array} updates - Array of {paramName, value} objects
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Batch update result
   */
  async updateParameters(updates, options = {}) {
    try {
      const results = [];
      const errors = [];

      // Process each update
      for (const update of updates) {
        const result = await this.updateParameter(update.paramName, update.value, options);
        
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        total: updates.length,
        successful: results.length,
        failed: errors.length,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('[UpdateService] Error in batch update:', error.message);
      return {
        success: false,
        error: error.message,
        results: [],
        errors: updates.map(u => ({ ...u, error: error.message })),
      };
    }
  }

  /**
   * Update device mode
   * @param {string} mode - Device mode (local, manual, automatic)
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Mode update result
   */
  async updateMode(mode, options = {}) {
    try {
      const { DEVICE_MODES } = require('../data');
      
      // Find mode configuration
      const modeConfig = DEVICE_MODES.find(m => m.name === mode);
      if (!modeConfig) {
        return {
          success: false,
          error: 'Invalid mode',
          mode,
        };
      }

      const updates = [];
      const channels = modeConfig.channels;

      // Prepare updates for each channel
      for (const [channum, value] of Object.entries(channels)) {
        const param = DataConfigHelper.getParameterByChannel(parseInt(channum));
        if (param) {
          updates.push({
            paramName: param.name,
            value: value,
          });
        }
      }

      // Execute batch update
      const result = await this.updateParameters(updates, options);

      logger.info(`[UpdateService] Mode changed to ${mode}`);

      return {
        success: result.success,
        mode,
        channels,
        updates: result.results,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`[UpdateService] Error updating mode to ${mode}:`, error.message);
      return {
        success: false,
        error: error.message,
        mode,
      };
    }
  }

  /**
   * Get current parameter value
   * @param {string} paramName - Parameter name
   * @returns {Promise<Object>} Current value
   */
  async getParameterValue(paramName) {
    try {
      const param = DataConfigHelper.getParameterByName(paramName);
      if (!param) {
        return {
          success: false,
          error: 'Parameter not found',
          paramName,
        };
      }

      const queryText = `SELECT ${param.column} FROM ${param.table} WHERE channum = $1`;
      const result = await query(queryText, [param.channum]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Parameter not found in database',
          paramName,
        };
      }

      return {
        success: true,
        paramName,
        value: result.rows[0][param.column],
        channum: param.channum,
        sztag: param.sztag,
        table: param.table,
        column: param.column,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error(`[UpdateService] Error getting ${paramName}:`, error.message);
      return {
        success: false,
        error: error.message,
        paramName,
      };
    }
  }

  /**
   * Get multiple parameter values
   * @param {Array} paramNames - Array of parameter names
   * @returns {Promise<Object>} Parameter values
   */
  async getParameterValues(paramNames) {
    try {
      const results = [];
      const errors = [];

      for (const paramName of paramNames) {
        const result = await this.getParameterValue(paramName);
        
        if (result.success) {
          results.push(result);
        } else {
          errors.push(result);
        }
      }

      return {
        success: errors.length === 0,
        results,
        errors,
        total: paramNames.length,
        successful: results.length,
        failed: errors.length,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      logger.error('[UpdateService] Error in batch get:', error.message);
      return {
        success: false,
        error: error.message,
        results: [],
        errors: paramNames.map(name => ({ paramName: name, error: error.message })),
      };
    }
  }

  /**
   * Transform value based on parameter configuration
   * @private
   */
  _transformValue(param, value) {
    // Convert string numbers to appropriate types
    if (param.type === 'numeric' || param.unit === 'bool') {
      const numValue = parseFloat(value);
      return isNaN(numValue) ? value : numValue;
    }
    
    return value;
  }

  /**
   * Update database with parameter value
   * @private
   */
  async _updateDatabase(param, value, options) {
    // Get current value first
    const currentQuery = `SELECT ${param.column} FROM ${param.table} WHERE channum = $1`;
    const currentResult = await query(currentQuery, [param.channum]);
    const oldValue = currentResult.rows[0] ? currentResult.rows[0][param.column] : null;

    // Update with new value
    const updateQuery = `UPDATE ${param.table} SET ${param.column} = $1 WHERE channum = $2`;
    const updateResult = await query(updateQuery, [value, param.channum]);

    return {
      oldValue,
      rowsAffected: updateResult.rowCount,
    };
  }
}

// Export singleton instance
const updateService = new UpdateService();
module.exports = updateService;