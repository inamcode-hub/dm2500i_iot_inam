const data = [
  // Discharge Rate Setpoint

  {
    name: 'inlet_moisture',
    channum: 300,
    sztag: 'DAI_INLET_MOISTURE',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: 0,
    maxRange: 50,
  },
  {
    name: 'outlet_moisture',
    channum: 301,
    sztag: 'DAI_OUTLET_MOISTURE',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: 0,
    maxRange: 50,
  },
  {
    name: 'discharge_rate_setpoint',
    channum: 21,
    sztag: 'DAI_DIS_RATE_MAN_SP',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: null,
    maxRange: null,
  },
  {
    name: 'moisture_setpoint',
    channum: 20,
    sztag: 'DAI_MOISTURE_SP',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: 1,
    maxRange: 50,
  },
  {
    name: 'drying_temperature',
    channum: 50,
    sztag: 'CDP_OUTLET_TEMP1',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: 0,
    maxRange: 700,
  },
  {
    name: 'discharge_rate',
    channum: 49,
    sztag: 'DAI_DISPLAY_RATE',
    column: 'pv',
    value: 0.0,
    table: 'io_table',
    minRange: 0,
    maxRange: 20000,
  },

  // mode
  {
    name: 'mode_control',
    channum: 121,
    sztag: 'CDP_MODE',
    column: 'pv',
    value: 0,
    table: 'cdp_table',
    minRange: 0,
    maxRange: 100,
  },
  // dryer state
  {
    name: 'dryer_state',
    channum: 105,
    sztag: 'CDP_DRYER_STATE',
    column: 'pv',
    value: 0,
    table: 'cdp_table',
    minRange: 0,
    maxRange: 5,
  },
];

module.exports = data;
