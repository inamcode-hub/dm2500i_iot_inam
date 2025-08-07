// config/keypadData.js - Keypad parameter configuration
module.exports = {
  // Updatable keypad parameters
  KEYPAD_PARAMETERS: [
    {
      name: 'discharge_rate_setpoint',
      channum: 271,
      sztag: 'DAO_DISCHRG_RATE_SP',
      column: 'pv',
      table: 'io_table',
      minRange: null,
      maxRange: null,
      description: 'Discharge rate setpoint',
      unit: 'units/min',
    },
    {
      name: 'moisture_setpoint',
      channum: 20,
      sztag: 'DAI_MOISTURE_SP',
      column: 'pv',
      table: 'io_table',
      minRange: 1,
      maxRange: 50,
      description: 'Moisture setpoint',
      unit: '%',
    },
    {
      name: 'drying_temperature',
      channum: 50,
      sztag: 'DAI_APT_TEMP',
      column: 'pv',
      table: 'io_table',
      minRange: 0,
      maxRange: 700,
      description: 'Drying temperature',
      unit: '°C',
    },
    {
      name: 'not_ready_reason',
      channum: 277,
      sztag: 'DAO_NOT_READY_REASON',
      column: 'pv',
      table: 'io_table',
      minRange: null,
      maxRange: null,
      description: 'Not ready reason code',
      unit: 'code',
    },
    {
      name: 'discharge_rate',
      channum: 52,
      sztag: 'DAI_RATE_IN',
      column: 'pv',
      table: 'io_table',
      minRange: 0,
      maxRange: 20000,
      description: 'Current discharge rate',
      unit: 'units/min',
    },
  ],
  
  // Mode control parameters
  MODE_PARAMETERS: [
    {
      name: 'local_manual_auto_mode',
      channum: 89,
      sztag: 'DDI_MODE_SELECT',
      column: 'pv',
      table: 'io_table',
      description: 'Mode select control',
    },
    {
      name: 'local_manual_auto_mode',
      channum: 156,
      sztag: 'DO_LOCAL_REMOTE_SEL',
      column: 'pv',
      table: 'io_table',
      description: 'Local/remote selection',
    },
  ],
  
  // Alarm-related parameters
  ALARM_PARAMETERS: [
    'moisture_setpoint',
    'drying_temperature',
    'discharge_rate',
  ],
  
  // Available device modes
  DEVICE_MODES: [
    {
      name: 'local_mode',
      description: 'Local operation mode - device operates independently',
      channels: { 89: 0, 156: 0 },
    },
    {
      name: 'manual_mode',
      description: 'Manual operation mode - operator controlled',
      channels: { 89: 0, 156: 1 },
    },
    {
      name: 'automatic_mode',
      description: 'Automatic operation mode - system controlled',
      channels: { 89: 1, 156: 1 },
    },
  ],
};