const EventEmitter = require('events');
const logger = require('../utils/logger');
const { apiGet } = require('../api/client');
const config = require('../config');

class AlarmMonitor extends EventEmitter {
  constructor() {
    super();
    this.lastAlarmStates = new Map();
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.checkInterval = config.ALARM_CHECK_INTERVAL || 5000; // 5 seconds default
    this.deviceSerial = null; // Will be set when starting
  }

  async start(deviceSerial = null) {
    if (this.isMonitoring) {
      logger.warn('Alarm monitor is already running');
      return;
    }

    // Set device serial if provided
    if (deviceSerial) {
      this.deviceSerial = deviceSerial;
      logger.info(`Alarm monitor using device serial: ${deviceSerial}`);
    }

    logger.info('Starting alarm monitor service');
    this.isMonitoring = true;

    // Initial check
    await this.checkAlarms();

    // Set up periodic monitoring
    this.monitorInterval = setInterval(async () => {
      try {
        await this.checkAlarms();
      } catch (error) {
        logger.error('Error in alarm monitor interval:', error);
      }
    }, this.checkInterval);
  }

  stop() {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping alarm monitor service');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async checkAlarms() {
    try {
      // Fetch active alarms from the device API
      const response = await apiGet('/alarms');
      
      if (!response || !response.data) {
        logger.warn('No alarm data received from API');
        return;
      }

      const activeAlarms = response.data.alarms || [];
      
      // Also fetch current sensor values from home data
      let sensorValues = {};
      try {
        const homeDataResponse = await apiGet('/home/data');
        if (homeDataResponse && homeDataResponse.data && homeDataResponse.data.sensorData) {
          // Create a map of channum to sensor value
          homeDataResponse.data.sensorData.forEach(sensor => {
            if (sensor.channum) {
              sensorValues[sensor.channum] = {
                value: sensor.value,
                name: sensor.name,
                sztag: sensor.sztag
              };
            }
          });
        }
      } catch (err) {
        logger.warn('Failed to fetch sensor values for alarms:', err.message);
      }
      
      // Process each alarm
      for (const alarm of activeAlarms) {
        const alarmKey = `${alarm.channum}_${alarm.type}`;
        const previousState = this.lastAlarmStates.get(alarmKey);
        
        // Enrich alarm with sensor value
        const sensorData = sensorValues[alarm.channum];
        if (sensorData) {
          alarm.value = sensorData.value;
          // If we don't have a better name, use the sensor name
          if (!alarm.name || alarm.name === `alarm_${alarm.channum}`) {
            alarm.name = sensorData.name;
          }
        }
        
        // Check if this is a new alarm or state change
        if (!previousState || this.hasAlarmChanged(previousState, alarm)) {
          logger.info(`Alarm state change detected: ${alarmKey}`, {
            type: alarm.type,
            value: alarm.value,
            state: alarm.state
          });
          
          // Emit alarm event for the sender to handle
          this.emit('alarm', {
            action: previousState ? 'update' : 'new',
            alarm: this.formatAlarmForCloud(alarm, sensorValues),
            timestamp: new Date().toISOString()
          });
          
          // Update stored state
          this.lastAlarmStates.set(alarmKey, {
            ...alarm,
            lastChecked: Date.now()
          });
        }
      }
      
      // Check for cleared alarms (were active but no longer in the list)
      for (const [alarmKey, storedAlarm] of this.lastAlarmStates.entries()) {
        const stillActive = activeAlarms.some(alarm => 
          `${alarm.channum}_${alarm.type}` === alarmKey
        );
        
        if (!stillActive) {
          logger.info(`Alarm cleared: ${alarmKey}`);
          
          // Emit cleared alarm event
          this.emit('alarm', {
            action: 'cleared',
            alarm: {
              ...this.formatAlarmForCloud(storedAlarm, sensorValues),
              state: 'cleared',
              clearedAt: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          });
          
          // Remove from stored states
          this.lastAlarmStates.delete(alarmKey);
        }
      }
      
    } catch (error) {
      logger.error('Failed to check alarms:', error);
      // Don't throw - we want to continue monitoring even if one check fails
    }
  }

  hasAlarmChanged(previousAlarm, currentAlarm) {
    // Check for significant changes
    return (
      previousAlarm.value !== currentAlarm.value ||
      previousAlarm.state !== currentAlarm.state ||
      previousAlarm.severity !== currentAlarm.severity ||
      previousAlarm.message !== currentAlarm.message
    );
  }

  formatAlarmForCloud(alarm, sensorValues = {}) {
    // Use the threshold directly from the alarm data if available
    let threshold = alarm.threshold || 0;
    
    // Use the value directly from the alarm data if available
    const currentValue = alarm.value !== undefined ? alarm.value : 0;

    return {
      id: alarm.id || `${alarm.channum}_${alarm.type}_${Date.now()}`,
      type: alarm.type,
      category: alarm.category || this.determineCategory(alarm.type),
      severity: alarm.priority || this.determineSeverity(alarm.type, currentValue, threshold),
      sensorId: alarm.channum,
      sensorName: alarm.sensorName || alarm.description || alarm.name || alarm.sztag || `Channel ${alarm.channum}`,
      value: currentValue,
      threshold: threshold,
      message: alarm.message || this.generateAlarmMessage({...alarm, value: currentValue, threshold}),
      state: alarm.isActive ? 'active' : 'cleared',
      triggeredAt: alarm.timestamp || new Date().toISOString(),
      deviceId: config.DEVICE_ID,
      serialNumber: this.deviceSerial || config.SERIAL_NUMBER,
      model: config.MODEL || 'DM2500i'
    };
  }

  determineCategory(alarmType) {
    // Categorize based on alarm type
    if (['HAL', 'LAL', 'HWL', 'LWL'].includes(alarmType)) {
      return 'sensor';
    } else if (['SYS'].includes(alarmType)) {
      return 'system';
    } else if (['COMM'].includes(alarmType)) {
      return 'communication';
    }
    return 'process';
  }

  determineSeverity(type, value, threshold) {
    // Determine severity based on alarm type according to requirements:
    // HAL/LAL (High/Low Alarm) -> "critical"
    // HWL/LWL (High/Low Warning) -> "warning"
    // SYS -> "critical" or "fault" depending on the type
    // COMM -> "fault"
    
    switch (type) {
      case 'HAL':
      case 'LAL':
        return 'critical';
      case 'HWL':
      case 'LWL':
        return 'warning';
      case 'COMM':
        return 'fault';
      case 'SYS':
        // For system alarms, we'll use 'critical' by default
        // Could be enhanced to use 'fault' for specific system failures
        return 'critical';
      default:
        // Default to 'warning' for unknown types
        return 'warning';
    }
  }

  generateAlarmMessage(alarm) {
    const sensorName = alarm.name || alarm.sztag || `Channel ${alarm.channum}`;
    const typeMessages = {
      'HAL': `High alarm: ${sensorName} reading ${alarm.value} exceeds limit ${alarm.threshold}`,
      'LAL': `Low alarm: ${sensorName} reading ${alarm.value} below limit ${alarm.threshold}`,
      'HWL': `High warning: ${sensorName} reading ${alarm.value} approaching high limit ${alarm.threshold}`,
      'LWL': `Low warning: ${sensorName} reading ${alarm.value} approaching low limit ${alarm.threshold}`,
      'SYS': `System alarm: ${sensorName} - ${alarm.value}`,
      'COMM': `Communication alarm: ${sensorName} - connection issue`
    };
    
    return typeMessages[alarm.type] || `${alarm.type} alarm on ${sensorName}: ${alarm.value}`;
  }

  // Get current alarm states for debugging
  getActiveAlarms() {
    return Array.from(this.lastAlarmStates.values()).map(alarm => 
      this.formatAlarmForCloud(alarm, {})
    );
  }
}

module.exports = new AlarmMonitor();