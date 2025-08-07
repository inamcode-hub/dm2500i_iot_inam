// controllers/alarms/alarmsController.js - Alarms API controller
// Handles alarm management and monitoring

const { query } = require('../../../db/pool');
const { 
  ALARM_TYPES, 
  ALARM_PARAMETERS, 
  ALARM_CATEGORIES, 
  ALARM_STATES, 
  ALARM_ACTIONS,
  SUPPORT_CATEGORIES 
} = require('../../data');
const { STATUS, HTTP_STATUS } = require('../../config/constants');
const logger = require('../../../utils/logger');

/**
 * Get all active alarms
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getActiveAlarms(req, res) {
  try {
    const { category, priority } = req.query;
    
    // Process active alarms request
    
    // Query active alarms from alarm_table (any non-zero value)
    let queryText = 'SELECT * FROM alarm_table WHERE in_alarm != 0';
    const params = [];
    
    if (category) {
      // Filter by category if specified
      const categoryAlarms = ALARM_PARAMETERS.filter(a => a.category === category);
      const channums = categoryAlarms.map(a => a.channum);
      if (channums.length > 0) {
        queryText += ` AND channum = ANY($${params.length + 1})`;
        params.push(channums);
      }
    }
    
    queryText += ' ORDER BY channum';
    
    const result = await query(queryText, params);
    
    // Fetch sensor values from io_table and cdp_table
    const channums = result.rows.map(r => r.channum);
    let sensorData = new Map();
    let thresholdData = new Map();
    
    if (channums.length > 0) {
      // Query io_table for sensor values
      const ioQuery = `SELECT channum, pv, sztag 
                       FROM io_table 
                       WHERE channum = ANY($1)`;
      const ioResult = await query(ioQuery, [channums]);
      
      // Query cdp_table as fallback for any missing channels
      const cdpQuery = `SELECT channum, pv, sztag 
                        FROM cdp_table 
                        WHERE channum = ANY($1)`;
      const cdpResult = await query(cdpQuery, [channums]);
      
      // Combine results
      [...ioResult.rows, ...cdpResult.rows].forEach(row => {
        sensorData.set(row.channum, {
          pv: row.pv,
          sztag: row.sztag
        });
      });
      
      // Query threshold values (stored as separate rows)
      // Moisture thresholds: 320 (HAL), 321 (LAL)
      // Temperature thresholds: 322 (HAL), 323 (LAL)
      const thresholdChannums = [320, 321, 322, 323];
      const thresholdQuery = `SELECT channum, pv, sztag FROM io_table WHERE channum = ANY($1)`;
      const thresholdResult = await query(thresholdQuery, [thresholdChannums]);
      
      thresholdResult.rows.forEach(row => {
        thresholdData.set(row.channum, row.pv);
      });
    }
    
    // Enrich alarm data with configuration
    const enrichedAlarms = result.rows.map(alarm => {
      const paramConfig = ALARM_PARAMETERS.find(p => p.channum === alarm.channum);
      
      // Determine alarm type and priority based on in_alarm value
      let alarmType = 'SYS';
      let message = 'Unknown alarm';
      let alarmPriority = 'warning';
      
      // Check in_alarm value to determine which message to use
      if (alarm.in_alarm === 2 && alarm.ha_msg) {
        alarmType = 'HAL';
        message = alarm.ha_msg;
        alarmPriority = 'critical';
      } else if (alarm.in_alarm === -2 && alarm.la_msg) {
        alarmType = 'LAL';
        message = alarm.la_msg;
        alarmPriority = 'critical';
      } else if (alarm.in_alarm === 1 && alarm.hw_msg) {
        alarmType = 'HWL';
        message = alarm.hw_msg;
        alarmPriority = 'warning';
      } else if (alarm.in_alarm === -1 && alarm.lw_msg) {
        alarmType = 'LWL';
        message = alarm.lw_msg;
        alarmPriority = 'warning';
      }
      
      // Get sensor data if available
      const sensor = sensorData.get(alarm.channum);
      let actualValue = 0;
      let threshold = 0;
      
      if (sensor) {
        actualValue = sensor.pv || 0;
      }
      
      // Determine threshold based on sensor type and alarm type
      // Map sensor channels to their threshold channels
      const thresholdMapping = {
        // Moisture sensors use channels 320 (HAL) and 321 (LAL)
        300: { HAL: 320, LAL: 321 }, // inlet moisture
        301: { HAL: 320, LAL: 321 }, // outlet moisture
        16: { HAL: 320, LAL: 321 },  // inlet moisture data
        // Temperature sensors use channels 322 (HAL) and 323 (LAL)
        308: { HAL: 322, LAL: 323 }, // inlet temperature
        307: { HAL: 322, LAL: 323 }, // outlet temperature
        50: { HAL: 322, LAL: 323 },  // drying temperature
        19: { HAL: 322, LAL: 323 },  // outlet temperature data
        18: { HAL: 322, LAL: 323 },  // inlet temperature data
        17: { HAL: 322, LAL: 323 },  // inlet temperature critical
      };
      
      if (thresholdMapping[alarm.channum]) {
        let thresholdChannel;
        
        switch (alarmType) {
          case 'HAL':
          case 'HWL': // High warning uses high alarm threshold
            thresholdChannel = thresholdMapping[alarm.channum].HAL;
            break;
          case 'LAL':
          case 'LWL': // Low warning uses low alarm threshold
            thresholdChannel = thresholdMapping[alarm.channum].LAL;
            break;
        }
        
        if (thresholdChannel) {
          threshold = thresholdData.get(thresholdChannel) || 0;
          
          // For warnings, adjust threshold (warnings trigger before alarms)
          if (alarmType === 'HWL' && threshold > 0) {
            threshold = threshold * 0.9; // High warning at 90% of high alarm
          } else if (alarmType === 'LWL' && threshold > 0) {
            threshold = threshold * 1.1; // Low warning at 110% of low alarm
          }
        }
      }
      
      return {
        id: `${alarm.channum}_${alarmType}`,
        name: paramConfig ? paramConfig.description : `alarm_${alarm.channum}`,
        channum: alarm.channum,
        sztag: paramConfig ? paramConfig.sztag : alarm.sztag,
        message,
        type: alarmType,
        priority: alarmPriority,
        category: paramConfig ? paramConfig.category : 'unknown',
        description: paramConfig ? paramConfig.description : 'Unknown alarm parameter',
        unit: paramConfig ? paramConfig.unit : '',
        isActive: alarm.in_alarm !== 0,
        inAlarmValue: alarm.in_alarm,
        timestamp: new Date().toISOString(),
        typeInfo: ALARM_TYPES[alarmType],
        // Add sensor-specific information
        // Use param config description or fallback
        sensorName: paramConfig ? paramConfig.description : `Channel ${alarm.channum}`,
        sensorId: alarm.channum,
        // Add actual value and threshold
        value: actualValue,
        threshold: threshold,
        // Include threshold data for reference
        thresholds: thresholdMapping[alarm.channum] ? {
          hal: thresholdData.get(thresholdMapping[alarm.channum].HAL) || null,
          lal: thresholdData.get(thresholdMapping[alarm.channum].LAL) || null,
          hwl: thresholdData.get(thresholdMapping[alarm.channum].HAL) ? thresholdData.get(thresholdMapping[alarm.channum].HAL) * 0.9 : null,
          lwl: thresholdData.get(thresholdMapping[alarm.channum].LAL) ? thresholdData.get(thresholdMapping[alarm.channum].LAL) * 1.1 : null
        } : null
      };
    });
    
    // Filter by priority if specified
    const filteredAlarms = priority ? 
      enrichedAlarms.filter(a => a.priority === priority) : 
      enrichedAlarms;
    
    // Group by category
    const alarmsByCategory = {};
    filteredAlarms.forEach(alarm => {
      if (!alarmsByCategory[alarm.category]) {
        alarmsByCategory[alarm.category] = [];
      }
      alarmsByCategory[alarm.category].push(alarm);
    });
    
    // Calculate summary statistics
    const summary = {
      total: filteredAlarms.length,
      critical: filteredAlarms.filter(a => a.priority === 'critical').length,
      warning: filteredAlarms.filter(a => a.priority === 'warning').length,
      byCategory: Object.keys(alarmsByCategory).map(cat => ({
        category: cat,
        count: alarmsByCategory[cat].length,
      })),
    };
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Active alarms retrieved successfully',
      data: {
        alarms: filteredAlarms,
        categories: alarmsByCategory,
        summary,
        categoryInfo: ALARM_CATEGORIES,
        alarmTypes: ALARM_TYPES,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[AlarmsController] Error getting active alarms:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve active alarms',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get alarm history
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAlarmHistory(req, res) {
  try {
    const { 
      start_date, 
      end_date, 
      limit = 100, 
      offset = 0,
      category,
      priority 
    } = req.query;
    
    logger.debug('[AlarmsController] Get alarm history request');
    
    // Default to last 24 hours if no dates specified
    const startDate = start_date || new Date(Date.now() - 86400000).toISOString();
    const endDate = end_date || new Date().toISOString();
    
    // Note: This is a simplified implementation
    // In a real system, you would have a separate alarms_history table
    const queryText = `
      SELECT 
        channum,
        sztag,
        in_alarm,
        ha_msg,
        la_msg,
        hw_msg,
        lw_msg,
        'alarm_event' as event_type,
        NOW() as timestamp
      FROM alarm_table 
      WHERE in_alarm = 1
      ORDER BY channum
      LIMIT $1 OFFSET $2
    `;
    
    const result = await query(queryText, [parseInt(limit), parseInt(offset)]);
    
    // Enrich with configuration
    const enrichedHistory = result.rows.map(event => {
      const paramConfig = ALARM_PARAMETERS.find(p => p.channum === event.channum);
      
      let alarmType = 'SYS';
      let message = 'Unknown alarm';
      let alarmPriority = 'warning';
      
      if (event.ha_msg) {
        alarmType = 'HAL';
        message = event.ha_msg;
        alarmPriority = 'critical';
      } else if (event.la_msg) {
        alarmType = 'LAL';
        message = event.la_msg;
        alarmPriority = 'critical';
      } else if (event.hw_msg) {
        alarmType = 'HWL';
        message = event.hw_msg;
        alarmPriority = 'warning';
      } else if (event.lw_msg) {
        alarmType = 'LWL';
        message = event.lw_msg;
        alarmPriority = 'warning';
      }
      
      return {
        id: `${event.channum}_${event.timestamp}`,
        name: paramConfig ? paramConfig.name : `alarm_${event.channum}`,
        channum: event.channum,
        sztag: event.sztag,
        message,
        type: alarmType,
        priority: alarmPriority,
        category: paramConfig ? paramConfig.category : 'unknown',
        eventType: event.event_type,
        isActive: event.in_alarm === 1,
        timestamp: event.timestamp,
        typeInfo: ALARM_TYPES[alarmType],
      };
    });
    
    // Filter by category and priority if specified
    let filteredHistory = enrichedHistory;
    if (category) {
      filteredHistory = filteredHistory.filter(h => h.category === category);
    }
    if (priority) {
      filteredHistory = filteredHistory.filter(h => h.priority === priority);
    }
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Alarm history retrieved successfully',
      data: {
        history: filteredHistory,
        query: {
          startDate,
          endDate,
          limit: parseInt(limit),
          offset: parseInt(offset),
          category,
          priority,
        },
        total: filteredHistory.length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[AlarmsController] Error getting alarm history:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve alarm history',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get alarm configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getAlarmConfig(req, res) {
  try {
    logger.debug('[AlarmsController] Get alarm configuration');
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Alarm configuration retrieved successfully',
      data: {
        parameters: ALARM_PARAMETERS,
        types: ALARM_TYPES,
        categories: ALARM_CATEGORIES,
        states: ALARM_STATES,
        actions: ALARM_ACTIONS,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[AlarmsController] Error getting alarm configuration:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve alarm configuration',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Get support categories and information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSupportInfo(req, res) {
  try {
    const { category } = req.query;
    
    logger.debug('[AlarmsController] Get support information');
    
    // Filter by category if specified
    const supportCategories = category ? 
      { [category]: SUPPORT_CATEGORIES[category] } : 
      SUPPORT_CATEGORIES;
    
    if (category && !SUPPORT_CATEGORIES[category]) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: STATUS.ERROR,
        message: 'Support category not found',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Add some basic support information
    const supportInfo = {
      categories: supportCategories,
      general: {
        emergency_contact: 'support@dm2500i.com',
        phone: '+1-800-DM2500I',
        documentation: '/api/v1/support/docs',
        troubleshooting: '/api/v1/support/troubleshooting',
      },
      system_info: {
        device_model: 'DM2500i',
        firmware_version: '1.0.0',
        api_version: '1.0.0',
      },
    };
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Support information retrieved successfully',
      data: supportInfo,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('[AlarmsController] Error getting support information:', error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to retrieve support information',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Acknowledge an alarm
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function acknowledgeAlarm(req, res) {
  try {
    const { id } = req.params;
    const { user, comment } = req.body;
    
    logger.debug(`[AlarmsController] Acknowledge alarm: ${id}`);
    
    // Note: This is a simplified implementation
    // In a real system, you would update the alarm status and log the acknowledgment
    
    res.status(HTTP_STATUS.OK).json({
      status: STATUS.SUCCESS,
      message: 'Alarm acknowledged successfully',
      data: {
        alarmId: id,
        acknowledgedBy: user || 'system',
        comment: comment || 'No comment provided',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error(`[AlarmsController] Error acknowledging alarm ${req.params.id}:`, error.message);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: STATUS.ERROR,
      message: 'Failed to acknowledge alarm',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = {
  getActiveAlarms,
  getAlarmHistory,
  getAlarmConfig,
  getSupportInfo,
  acknowledgeAlarm,
};