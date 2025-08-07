// validators/updateValidators.js - Request validation functions
const { KEYPAD_PARAMETERS, DEVICE_MODES } = require('../config/keypadData');
const { VALIDATION } = require('../config/constants');

/**
 * Validate keypad parameter update request
 * @param {string} name - Parameter name
 * @param {any} value - Parameter value
 * @returns {Object} Validation result
 */
function validateKeypadUpdate(name, value) {
  // Check if parameter name is provided
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'Parameter name is required and must be a string',
    };
  }
  
  // Check parameter name length
  if (name.length > VALIDATION.MAX_PARAMETER_NAME_LENGTH) {
    return {
      valid: false,
      error: `Parameter name too long (max ${VALIDATION.MAX_PARAMETER_NAME_LENGTH} characters)`,
    };
  }
  
  // Check if value is provided
  if (value === undefined || value === null) {
    return {
      valid: false,
      error: 'Parameter value is required',
    };
  }
  
  // Find parameter configuration
  const paramConfig = KEYPAD_PARAMETERS.find(param => param.name === name);
  if (!paramConfig) {
    return {
      valid: false,
      error: `Unknown parameter: ${name}`,
    };
  }
  
  // Validate value type (should be numeric)
  const numValue = Number(value);
  if (isNaN(numValue)) {
    return {
      valid: false,
      error: 'Parameter value must be numeric',
    };
  }
  
  // Validate range if specified - COMMENTED OUT FOR DEVELOPMENT
  // TODO: Re-enable range validation when ready for production
  // if (paramConfig.minRange !== null && numValue < paramConfig.minRange) {
  //   return {
  //     valid: false,
  //     error: `Value ${numValue} is below minimum range (${paramConfig.minRange})`,
  //   };
  // }
  // 
  // if (paramConfig.maxRange !== null && numValue > paramConfig.maxRange) {
  //   return {
  //     valid: false,
  //     error: `Value ${numValue} exceeds maximum range (${paramConfig.maxRange})`,
  //   };
  // }
  
  return {
    valid: true,
    paramConfig,
    value: numValue,
  };
}

/**
 * Validate mode update request
 * @param {string} mode - Mode value
 * @returns {Object} Validation result
 */
function validateModeUpdate(mode) {
  // Check if mode is provided
  if (!mode || typeof mode !== 'string') {
    return {
      valid: false,
      error: 'Mode value is required and must be a string',
    };
  }
  
  // Find mode configuration
  const modeConfig = DEVICE_MODES.find(m => m.name === mode);
  if (!modeConfig) {
    const availableModes = DEVICE_MODES.map(m => m.name).join(', ');
    return {
      valid: false,
      error: `Invalid mode: ${mode}. Available modes: ${availableModes}`,
    };
  }
  
  return {
    valid: true,
    modeConfig,
  };
}

/**
 * Validate request body size
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
function validateRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return {
      valid: false,
      error: 'Request body is required and must be an object',
    };
  }
  
  // Check body size (basic validation)
  const bodyString = JSON.stringify(body);
  if (bodyString.length > 1000) {
    return {
      valid: false,
      error: 'Request body too large',
    };
  }
  
  return {
    valid: true,
  };
}

module.exports = {
  validateKeypadUpdate,
  validateModeUpdate,
  validateRequestBody,
};