/**
 * Validation utilities to replace Sequelize validations
 */

// Validate string length
function validateLength(value, min, max, fieldName) {
  if (!value) return null;
  
  const length = value.toString().length;
  if (min && length < min) {
    return `${fieldName} must be at least ${min} characters`;
  }
  if (max && length > max) {
    return `${fieldName} must be no more than ${max} characters`;
  }
  return null;
}

// Validate numeric values
function validateNumber(value, min, max, fieldName) {
  if (value === null || value === undefined) return null;
  
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be no more than ${max}`;
  }
  return null;
}

// Validate required fields
function validateRequired(value, fieldName) {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

// Validate history data
function validateHistoryData(data) {
  const errors = [];
  
  // Required fields
  if (!data.product) errors.push('Product is required');
  if (!data.mode) errors.push('Mode is required');
  if (data.inlet === undefined) errors.push('Inlet is required');
  if (data.outlet === undefined) errors.push('Outlet is required');
  if (data.rate === undefined) errors.push('Rate is required');
  if (data.target === undefined) errors.push('Target is required');
  if (data.apt === undefined) errors.push('APT is required');
  if (!data.dryer_state) errors.push('Dryer state is required');
  
  // String length validations
  const productError = validateLength(data.product, 1, 50, 'Product');
  if (productError) errors.push(productError);
  
  const modeError = validateLength(data.mode, 1, 50, 'Mode');
  if (modeError) errors.push(modeError);
  
  const dryerStateError = validateLength(data.dryer_state, 1, 50, 'Dryer state');
  if (dryerStateError) errors.push(dryerStateError);
  
  return errors;
}

// Validate alarm data
function validateAlarmData(data) {
  const errors = [];
  
  // Required fields
  if (!data.channelNumber) errors.push('Channel number is required');
  
  // String length validations
  if (data.sensorName) {
    const error = validateLength(data.sensorName, 1, 50, 'Sensor name');
    if (error) errors.push(error);
  }
  
  if (data.unit) {
    const error = validateLength(data.unit, 1, 10, 'Unit');
    if (error) errors.push(error);
  }
  
  if (data.sensorValue) {
    const error = validateLength(data.sensorValue, 1, 10, 'Sensor value');
    if (error) errors.push(error);
  }
  
  if (data.state) {
    const error = validateLength(data.state, 1, 20, 'State');
    if (error) errors.push(error);
  }
  
  return errors;
}

// Validate device data
function validateDeviceData(data) {
  const errors = [];
  
  // Required fields
  if (!data.channelNumber) errors.push('Channel number is required');
  
  // String length validations
  if (data.sensorName) {
    const error = validateLength(data.sensorName, 1, 50, 'Sensor name');
    if (error) errors.push(error);
  }
  
  if (data.unit) {
    const error = validateLength(data.unit, 1, 10, 'Unit');
    if (error) errors.push(error);
  }
  
  if (data.sensorValue) {
    const error = validateLength(data.sensorValue, 1, 10, 'Sensor value');
    if (error) errors.push(error);
  }
  
  if (data.timeStamp) {
    const error = validateLength(data.timeStamp, 1, 50, 'Timestamp');
    if (error) errors.push(error);
  }
  
  return errors;
}

// SQL injection prevention - escape single quotes
function escapeSqlString(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/'/g, "''");
}

module.exports = {
  validateLength,
  validateNumber,
  validateRequired,
  validateHistoryData,
  validateAlarmData,
  validateDeviceData,
  escapeSqlString
};