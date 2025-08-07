// controllers/updateController.js - Update operations controller
const { updateKeypadParameter, updateModeController } = require('../valueUpdates');
const { validateKeypadUpdate, validateModeUpdate, validateRequestBody } = require('../validators/updateValidators');
const { KEYPAD_PARAMETERS, DEVICE_MODES } = require('../config/keypadData');
const { STATUS, HTTP_STATUS } = require('../config/constants');
const logger = require('../../utils/logger');

/**
 * Update keypad parameter
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateKeypad(req, res) {
  try {
    const { name } = req.params;
    const { value } = req.body;
    
    logger.info(`[UpdateController] Keypad update request: ${name} = ${value}`);
    
    // Validate request body
    const bodyValidation = validateRequestBody(req.body);
    if (!bodyValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: bodyValidation.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate parameter update
    const validation = validateKeypadUpdate(name, value);
    if (!validation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: validation.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Perform update
    const result = await updateKeypadParameter(name, validation.value);
    
    // Handle different result statuses
    if (result.status === STATUS.ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (result.status === STATUS.WARNING) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Success response
    logger.info(`[UpdateController] Successfully updated ${name} to ${validation.value}`);
    res.status(HTTP_STATUS.OK).json({
      ...result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[UpdateController] Keypad update error:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Internal server error during parameter update',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Update mode controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function updateMode(req, res) {
  try {
    const { value } = req.body;
    
    logger.info(`[UpdateController] Mode update request: ${value}`);
    
    // Validate request body
    const bodyValidation = validateRequestBody(req.body);
    if (!bodyValidation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: bodyValidation.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Validate mode update
    const validation = validateModeUpdate(value);
    if (!validation.valid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: STATUS.ERROR,
        message: validation.error,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Perform update
    const result = await updateModeController(value);
    
    // Handle error status
    if (result.status === STATUS.ERROR) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Success response
    logger.info(`[UpdateController] Successfully updated mode to ${value}`);
    res.status(HTTP_STATUS.OK).json({
      ...result,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[UpdateController] Mode update error:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Internal server error during mode update',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get available parameters
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableParameters(req, res) {
  try {
    logger.info('[UpdateController] Getting available parameters');
    
    const parameters = KEYPAD_PARAMETERS.map(param => ({
      name: param.name,
      channum: param.channum,
      sztag: param.sztag,
      table: param.table,
      minRange: param.minRange,
      maxRange: param.maxRange,
      description: param.description,
      unit: param.unit,
    }));
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Available parameters retrieved successfully',
      data: parameters,
      count: parameters.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[UpdateController] Error getting parameters:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve available parameters',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get available modes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAvailableModes(req, res) {
  try {
    logger.info('[UpdateController] Getting available modes');
    
    const modes = DEVICE_MODES.map(mode => ({
      name: mode.name,
      description: mode.description,
      channels: mode.channels,
    }));
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Available modes retrieved successfully',
      data: modes,
      count: modes.length,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[UpdateController] Error getting modes:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve available modes',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  updateKeypad,
  updateMode,
  getAvailableParameters,
  getAvailableModes,
};