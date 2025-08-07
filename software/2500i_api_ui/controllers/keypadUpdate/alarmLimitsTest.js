const { getBaseName } = require('./alarmUtils');
const db = require('../../lib/db/pool');
const { data } = require('../../lib/data/keypadData');

const MIN_WARNING_GAP = 1;

const suffixDisplay = {
  critical_low: 'Critical Low',
  critical_high: 'Critical High',
  warning_low: 'Warning Low',
  warning_high: 'Warning High',
};

function findItemByNameAndType(baseName, suffix) {
  return data.find((item) => item.name === `${baseName}_${suffix}`);
}

async function fetchValue(item) {
  const query = `SELECT ${item.column} FROM ${item.table} WHERE channum = $1`;
  const result = await db.query(query, [item.channum]);
  if (result.rowCount === 0) return null;
  return result.rows[0][item.column];
}

async function updateValue(paramName, value) {
  const item = data.find((i) => i.name === paramName);
  if (!item) return;
  await db.query(
    `UPDATE ${item.table} SET ${item.column} = $1 WHERE channum = $2`,
    [value, item.channum]
  );
}

async function validateAlarmLimits(paramName, newValueRaw) {
  const newValue = parseFloat(newValueRaw);
  const suffix = Object.keys(suffixDisplay).find((s) => paramName.endsWith(s));
  if (!suffix || isNaN(newValue)) return null;

  const baseName = getBaseName(paramName, suffix);
  const keys = ['critical_low', 'warning_low', 'warning_high', 'critical_high'];
  const values = {};
  const oldValues = {};

  for (const key of keys) {
    const item = findItemByNameAndType(baseName, key);
    if (!item) continue;
    oldValues[key] = await fetchValue(item);
  }

  for (const key of keys) {
    values[key] =
      paramName === `${baseName}_${key}` ? newValue : oldValues[key];
  }

  const { critical_low, critical_high, warning_low, warning_high } = values;
  const { critical_low: oldCriticalLow, critical_high: oldCriticalHigh } =
    oldValues;

  if (critical_low == null || critical_high == null) return null;

  // 🔐 Validate critical range
  if (critical_low >= critical_high) {
    if (suffix === 'critical_low') {
      return `❌ Cannot set *Critical Low* to ${newValue}. It must be lower than *Critical High (${critical_high})*.`;
    } else if (suffix === 'critical_high') {
      return `❌ Cannot set *Critical High* to ${newValue}. It must be greater than *Critical Low (${critical_low})*.`;
    } else {
      return `❌ Invalid critical limit range.`;
    }
  }

  const rangeOld = oldCriticalHigh - oldCriticalLow;
  const rangeNew = critical_high - critical_low;
  const padding = parseFloat((rangeNew * 0.05).toFixed(2));

  // 🔽 Shrinking
  if (rangeNew < rangeOld) {
    if (paramName.endsWith('critical_low') && critical_low > oldCriticalLow) {
      const newWarningLow = parseFloat((critical_low + padding).toFixed(2));
      let adjustedWarningHigh = warning_high;

      if (newWarningLow >= warning_high - MIN_WARNING_GAP) {
        adjustedWarningHigh = parseFloat(
          (newWarningLow + MIN_WARNING_GAP).toFixed(2)
        );
        if (adjustedWarningHigh >= critical_high) {
          return `❌ Cannot adjust *Warning High* beyond *Critical High (${critical_high})* to maintain spacing.`;
        }
        await updateValue(`${baseName}_warning_high`, adjustedWarningHigh);
      }

      await updateValue(`${baseName}_warning_low`, newWarningLow);
    }

    if (
      paramName.endsWith('critical_high') &&
      critical_high < oldCriticalHigh
    ) {
      const newWarningHigh = parseFloat((critical_high - padding).toFixed(2));
      let adjustedWarningLow = warning_low;

      if (newWarningHigh <= warning_low + MIN_WARNING_GAP) {
        adjustedWarningLow = parseFloat(
          (newWarningHigh - MIN_WARNING_GAP).toFixed(2)
        );
        if (adjustedWarningLow <= critical_low) {
          return `❌ Cannot adjust *Warning Low* below *Critical Low (${critical_low})* to maintain spacing.`;
        }
        await updateValue(`${baseName}_warning_low`, adjustedWarningLow);
      }

      await updateValue(`${baseName}_warning_high`, newWarningHigh);
    }
  }

  // 🔼 Expansion
  if (rangeNew > rangeOld) {
    if (paramName.endsWith('critical_low') && critical_low < oldCriticalLow) {
      const newWarningLow = parseFloat((critical_low + padding).toFixed(2));
      if (
        newWarningLow < warning_high - MIN_WARNING_GAP &&
        newWarningLow > critical_low
      ) {
        await updateValue(`${baseName}_warning_low`, newWarningLow);
      }
    }

    if (
      paramName.endsWith('critical_high') &&
      critical_high > oldCriticalHigh
    ) {
      const newWarningHigh = parseFloat((critical_high - padding).toFixed(2));
      if (
        newWarningHigh > warning_low + MIN_WARNING_GAP &&
        newWarningHigh < critical_high
      ) {
        await updateValue(`${baseName}_warning_high`, newWarningHigh);
      }
    }
  }

  return null;
}

module.exports = validateAlarmLimits;
