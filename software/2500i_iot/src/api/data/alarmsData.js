// data/alarmsData.js - Centralized alarms data configuration
// Based on 2500i_embedded system alarms configuration

const ALARM_TYPES = {
  HAL: {
    name: 'High Alarm',
    description: 'Critical high value alarm',
    priority: 'critical',
    color: '#F44336',
    icon: 'error',
  },
  LAL: {
    name: 'Low Alarm',
    description: 'Critical low value alarm',
    priority: 'critical',
    color: '#F44336',
    icon: 'error',
  },
  HWL: {
    name: 'High Warning',
    description: 'High value warning',
    priority: 'warning',
    color: '#FF9800',
    icon: 'warning',
  },
  LWL: {
    name: 'Low Warning',
    description: 'Low value warning',
    priority: 'warning',
    color: '#FF9800',
    icon: 'warning',
  },
  SYS: {
    name: 'System Alarm',
    description: 'System-level alarm',
    priority: 'critical',
    color: '#9C27B0',
    icon: 'bug_report',
  },
  COMM: {
    name: 'Communication Alarm',
    description: 'Communication error alarm',
    priority: 'fault',
    color: '#FF5722',
    icon: 'wifi_off',
  },
};

const ALARM_PARAMETERS = [
  {
    name: 'inlet_moisture_alarm',
    channum: 300,
    sztag: 'DAI_INLET_MOISTURE',
    description: 'Inlet Moisture',
    unit: '%',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'outlet_moisture_alarm',
    channum: 301,
    sztag: 'DAI_OUTLET_MOISTURE',
    description: 'Outlet Moisture',
    unit: '%',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'inlet_temperature_alarm',
    channum: 308,
    sztag: 'DAI_INLET_TEMP',
    description: 'Inlet Temperature',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'outlet_temperature_alarm',
    channum: 307,
    sztag: 'DAI_OUTLET_TEMP',
    description: 'Outlet Temperature',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'drying_temperature_alarm',
    channum: 50,
    sztag: 'DAI_APT_TEMP',
    description: 'Drying Temperature',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'discharge_rate_alarm',
    channum: 49,
    sztag: 'DAI_DISPLAY_RATE',
    description: 'Discharge Rate',
    unit: 'kg/h',
    category: 'process_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'system_ready_alarm',
    channum: 275,
    sztag: 'DAO_SYSTEM_READY',
    description: 'System Ready Status',
    unit: 'bool',
    category: 'system_alarms',
    alarm_types: ['SYS'],
  },
  {
    name: 'communication_alarm',
    channum: 400,
    sztag: 'SYS_COMM_STATUS',
    description: 'Communication Status',
    unit: 'bool',
    category: 'system_alarms',
    alarm_types: ['COMM'],
  },
  {
    name: 'outlet_temperature_data',
    channum: 19,
    sztag: 'DAI_OUTLET_TEMP_DATA',
    description: 'Outlet Temperature',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'system_status_alarm',
    channum: 22,
    sztag: 'SYS_STATUS_ALARM',
    description: 'System Status',
    unit: 'status',
    category: 'system_alarms',
    alarm_types: ['SYS'],
  },
  {
    name: 'inlet_temperature_data',
    channum: 18,
    sztag: 'DAI_INLET_TEMP_DATA',
    description: 'Inlet Temperature',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'inlet_temperature_critical',
    channum: 17,
    sztag: 'DAI_INLET_TEMP_CRITICAL',
    description: 'Inlet Temperature (Critical)',
    unit: '°C',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
  {
    name: 'inlet_moisture_data',
    channum: 16,
    sztag: 'DAI_INLET_MOISTURE_DATA',
    description: 'Inlet Moisture',
    unit: '%',
    category: 'sensor_alarms',
    alarm_types: ['HAL', 'LAL', 'HWL', 'LWL'],
  },
];

const ALARM_CATEGORIES = {
  sensor_alarms: {
    name: 'Sensor Alarms',
    description: 'Alarms related to sensor readings',
    icon: 'sensors',
    color: '#4CAF50',
  },
  process_alarms: {
    name: 'Process Alarms',
    description: 'Alarms related to process parameters',
    icon: 'settings',
    color: '#2196F3',
  },
  system_alarms: {
    name: 'System Alarms',
    description: 'Alarms related to system operation',
    icon: 'computer',
    color: '#9C27B0',
  },
};

const ALARM_STATES = {
  NORMAL: {
    name: 'Normal',
    description: 'Parameter within normal range',
    color: '#4CAF50',
    priority: 0,
  },
  WARNING: {
    name: 'Warning',
    description: 'Parameter in warning range',
    color: '#FF9800',
    priority: 1,
  },
  ALARM: {
    name: 'Alarm',
    description: 'Parameter in alarm range',
    color: '#F44336',
    priority: 2,
  },
  CRITICAL: {
    name: 'Critical',
    description: 'Parameter in critical range',
    color: '#9C27B0',
    priority: 3,
  },
  FAULT: {
    name: 'Fault',
    description: 'Parameter sensor fault',
    color: '#607D8B',
    priority: 4,
  },
};

const ALARM_ACTIONS = {
  ACKNOWLEDGE: {
    name: 'Acknowledge',
    description: 'Acknowledge the alarm',
    requires_auth: true,
  },
  SILENCE: {
    name: 'Silence',
    description: 'Silence the alarm temporarily',
    requires_auth: true,
    duration: 3600, // 1 hour
  },
  DISABLE: {
    name: 'Disable',
    description: 'Disable the alarm',
    requires_auth: true,
    requires_admin: true,
  },
  RESET: {
    name: 'Reset',
    description: 'Reset the alarm',
    requires_auth: true,
  },
};

// Support categories (for support/help system)
const SUPPORT_CATEGORIES = {
  operation: {
    name: 'Operation',
    description: 'Operating procedures and guidelines',
    icon: 'play_arrow',
    color: '#4CAF50',
  },
  maintenance: {
    name: 'Maintenance',
    description: 'Maintenance procedures and schedules',
    icon: 'build',
    color: '#FF9800',
  },
  troubleshooting: {
    name: 'Troubleshooting',
    description: 'Problem diagnosis and resolution',
    icon: 'bug_report',
    color: '#F44336',
  },
  calibration: {
    name: 'Calibration',
    description: 'Sensor calibration procedures',
    icon: 'tune',
    color: '#2196F3',
  },
  safety: {
    name: 'Safety',
    description: 'Safety procedures and warnings',
    icon: 'security',
    color: '#9C27B0',
  },
  documentation: {
    name: 'Documentation',
    description: 'Technical documentation and manuals',
    icon: 'description',
    color: '#607D8B',
  },
};

module.exports = {
  ALARM_TYPES,
  ALARM_PARAMETERS,
  ALARM_CATEGORIES,
  ALARM_STATES,
  ALARM_ACTIONS,
  SUPPORT_CATEGORIES,
};