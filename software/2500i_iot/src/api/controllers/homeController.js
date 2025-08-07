// controllers/homeController.js - Home data controller
const { getLiveHomeData, getChartData: getChartDataService } = require('../home');
const { STATUS, HTTP_STATUS } = require('../config/constants');
const logger = require('../../utils/logger');

/**
 * Get live home data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getHomeData(req, res) {
  try {
    // logger.info('[HomeController] Getting live home data');
    
    const data = await getLiveHomeData();
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Home data retrieved successfully',
      data: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[HomeController] Error getting home data:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve home data',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get chart data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getChartData(req, res) {
  try {
    // logger.info('[HomeController] Getting chart data');
    
    const data = await getChartDataService();
    
    res.status(HTTP_STATUS.OK).json({
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[HomeController] Error getting chart data:', error.message);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve chart data',
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  getHomeData,
  getChartData,
};