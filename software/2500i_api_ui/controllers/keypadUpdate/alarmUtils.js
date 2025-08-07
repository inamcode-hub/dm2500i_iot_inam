const alarmSources = [
  'inlet_moisture',
  'inlet_temperature',
  'outlet_moisture',
  'outlet_temperature',
  'discharge_rate',
  'drying_temperature',
];

const alarmThresholds = [
  'critical_high',
  'warning_high',
  'critical_low',
  'warning_low',
];

const validAlarmParams = alarmSources.flatMap((source) =>
  alarmThresholds.map((threshold) => `${source}_${threshold}`)
);

function isAlarmParam(paramName) {
  return validAlarmParams.includes(paramName);
}

function getBaseName(name, suffix) {
  return name.replace(`_${suffix}`, '');
}

module.exports = {
  validAlarmParams,
  isAlarmParam,
  getBaseName,
};
