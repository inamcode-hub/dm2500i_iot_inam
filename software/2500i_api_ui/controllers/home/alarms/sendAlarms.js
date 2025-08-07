/**
 * =============================================================
 * Alarm Table Overview:
 *
 * Table: alarm_table
 * Columns (main ones used):
 * -------------------------------------------------------------
 * - channum:    (integer) Channel number (unique ID)
 * - sztag:      (string) Tag/label of the alarm
 * - in_alarm:   (integer) Alarm status:
 *                   2  = High Alarm
 *                   1  = High Warning Alarm
 *                   0  = Normal (no alarm)
 *                  -1  = Low Warning Alarm
 *                  -2  = Low Alarm
 * - ha_msg:     (string) High Alarm message
 * - hw_msg:     (string) High Warning Alarm message
 * - norm_msg:   (string) Normal message (ignored now)
 * - lw_msg:     (string) Low Warning Alarm message
 * - la_msg:     (string) Low Alarm message
 * - delayed:    (integer) Delayed status (0/1/other)
 *
 * =============================================================
 * Alarm Logic:
 * -------------------------------------------------------------
 * 1️⃣ If `in_alarm === 0` → no alarm (skip it).
 *
 * 2️⃣ If `in_alarm !== 0`, we map as follows:
 *     2:  ha_msg           ➔ Type: 'high alarm'
 *     1:  hw_msg           ➔ Type: 'high warning alarm'
 *    -1:  lw_msg           ➔ Type: 'low warning alarm'
 *    -2:  la_msg           ➔ Type: 'low alarm'
 *
 * ✅ We always include the `delayed` field and send everything to the frontend.
 *
 * =============================================================
 */

const db = require('../../../lib/db/pool');

const sendAlarms = async () => {
  const alarm = {
    isAlarm: false,
    alarms: [],
    alarmsId: '', // ← new field for timestamp
  };

  const query = 'SELECT * FROM alarm_table';
  try {
    const result = await db.query(query);
    const rows = result.rows || [];
    const activeAlarms = [];

    rows.forEach((row) => {
      const {
        channum,
        sztag,
        in_alarm,
        ha_msg,
        hw_msg,
        lw_msg,
        la_msg,
        delayed,
      } = row;

      if (in_alarm === 0) {
        return;
      }

      let message = null;
      let type = null;

      if (in_alarm === 2) {
        message = ha_msg;
        type = 'critical high';
      } else if (in_alarm === 1) {
        message = hw_msg;
        type = 'warning high';
      } else if (in_alarm === -1) {
        message = lw_msg;
        type = 'warning low';
      } else if (in_alarm === -2) {
        message = la_msg;
        type = 'critical low';
      }

      message = message ? message.trim() : null;

      if (message) {
        activeAlarms.push({
          channum,
          sztag,
          in_alarm,
          delayed,
          message,
          type,
        });
      }
    });

    alarm.isAlarm = activeAlarms.length > 0;
    alarm.alarms = activeAlarms;

    // ✅ Add simple timestamp as ID if alarms exist
    alarm.alarmsId = activeAlarms.length > 0 ? Date.now().toString() : '';

  } catch (error) {
    console.error('Error fetching alarm data:', error);
    return alarm;
  }

  return alarm;
};

module.exports = sendAlarms;