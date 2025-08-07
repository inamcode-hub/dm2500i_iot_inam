const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

// Base URL for the device API
const API_BASE_URL = `http://localhost:${config.API_PORT || 3003}/api/v1`;

/**
 * Create axios instance with default configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Request interceptor for logging
 */
apiClient.interceptors.request.use(
  (config) => {
    // Only log errors, not every request
    return config;
  },
  (error) => {
    logger.error('[API Client] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    if (error.response) {
      logger.error(`[API Client] Response error: ${error.response.status} ${error.response.statusText}`);
    } else if (error.request) {
      logger.error('[API Client] No response received from device API');
    } else {
      logger.error('[API Client] Request setup error:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * GET request to embedded API
 * @param {string} endpoint - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Response data
 */
async function apiGet(endpoint, params = {}) {
  try {
    const response = await apiClient.get(endpoint, { params });
    return response;
  } catch (error) {
    logger.error(`[API Client] GET ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * POST request to embedded API
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPost(endpoint, data = {}) {
  try {
    const response = await apiClient.post(endpoint, data);
    return response;
  } catch (error) {
    logger.error(`[API Client] POST ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * PUT request to embedded API
 * @param {string} endpoint - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise<Object>} Response data
 */
async function apiPut(endpoint, data = {}) {
  try {
    const response = await apiClient.put(endpoint, data);
    return response;
  } catch (error) {
    logger.error(`[API Client] PUT ${endpoint} failed:`, error.message);
    throw error;
  }
}

/**
 * DELETE request to embedded API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} Response data
 */
async function apiDelete(endpoint) {
  try {
    const response = await apiClient.delete(endpoint);
    return response;
  } catch (error) {
    logger.error(`[API Client] DELETE ${endpoint} failed:`, error.message);
    throw error;
  }
}

module.exports = {
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiClient
};