const db = require('../../lib/db/pool');
const data = require('./data');
const { checkTableSize } = require('./lib');

let intervalId = null;

const fetchDataFromDatabase = async () => {
  try {
    const channumArray = data.map((item) => item.channum);

    for (const item of data) {
      const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
      const result = await db.query(text, [channumArray]);
      const matchingRow = result.rows.find(
        (row) => row.channum === item.channum
      );
      if (matchingRow) {
        item.value = matchingRow[item.column];
        item.sztag = matchingRow.sztag;
        item.lwl = matchingRow.lwl > item.value ? true : false;
        item.hwl = matchingRow.hwl < item.value ? true : false;
        item.lal = matchingRow.lal > item.value ? true : false;
        item.hal = matchingRow.hal < item.value ? true : false;
      }
    }
  } catch (error) {
    console.error('Error fetching data from the database:', error);
  }
};

// Function to check and create alarms
const checkAndCreateAlarms = async () => {
  try {
    for (const item of data) {
      const { channum, sztag } = item;

      // Find the corresponding entry in alarm_table (using channum as the key)
      const alarmResult = await db.query(
        'SELECT * FROM alarm_table WHERE channum = $1',
        [channum]
      );
      
      if (alarmResult.rows.length === 0) {
        // console.log(`No alarm found for channum ${channum}`);
        continue;
      }

      const alarmRow = alarmResult.rows[0];
      const currentInAlarm = alarmRow.in_alarm === 1;
      let shouldBeInAlarm = false;
      let alarmMessage = '';

      // Check alarm conditions
      if (item.hal) {
        shouldBeInAlarm = true;
        alarmMessage = alarmRow.ha_msg || `${sztag} High Alarm`;
      } else if (item.hwl) {
        shouldBeInAlarm = true;
        alarmMessage = alarmRow.hw_msg || `${sztag} High Warning`;
      } else if (item.lal) {
        shouldBeInAlarm = true;
        alarmMessage = alarmRow.la_msg || `${sztag} Low Alarm`;
      } else if (item.lwl) {
        shouldBeInAlarm = true;
        alarmMessage = alarmRow.lw_msg || `${sztag} Low Warning`;
      }

      // Update alarm status if changed
      if (currentInAlarm !== shouldBeInAlarm) {
        await db.query(
          'UPDATE alarm_table SET in_alarm = $1 WHERE channum = $2',
          [shouldBeInAlarm ? 1 : 0, channum]
        );

        // Create alarm record in alarms_inam table
        if (shouldBeInAlarm) {
          await db.query(
            `INSERT INTO alarms_inam (
              channelNumber, sensorName, unit, sensorValue,
              timeStampEpoch, highAlarm, lowAlarm, highWarning,
              lowWarning, max, min, alarmStatus, state
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              channum,
              item.sztag || item.name,
              'unit', // You may want to get this from somewhere
              item.value,
              Date.now(),
              alarmRow.ha || 0,
              alarmRow.la || 0,
              alarmRow.hw || 0,
              alarmRow.lw || 0,
              item.maxRange || 0,
              item.minRange || 0,
              1, // alarmStatus = active
              alarmMessage
            ]
          );
        }
      }

      // Update alarms_status_inam table - using individual alarm columns
      // Find the matching record by name
      const nameMapping = {
        300: 'inlet_moisture',
        308: 'inlet_temperature', 
        301: 'outlet_moisture',
        307: 'outlet_temperature',
        52: 'drying_temperature'
        // Add more mappings as needed
      };
      
      const alarmName = nameMapping[channum] || item.name;
      if (alarmName) {
        // Update individual alarm flags based on condition
        const updateQuery = `
          UPDATE alarms_status_inam 
          SET hal = $1, hwl = $2, lal = $3, lwl = $4
          WHERE name = $5
        `;
        await db.query(updateQuery, [
          item.hal || false,
          item.hwl || false, 
          item.lal || false,
          item.lwl || false,
          alarmName
        ]);
      }
    }
  } catch (error) {
    console.error('Error checking and creating alarms:', error);
  }
};

const createAlarms = async () => {
  intervalId = setInterval(async () => {
    await fetchDataFromDatabase();
    await checkAndCreateAlarms();
    await checkTableSize();
  }, 3000);
};

// Cleanup function to stop the interval
const stopAlarms = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Alarms monitoring stopped');
  }
};

// Handle process termination
process.on('SIGTERM', stopAlarms);
process.on('SIGINT', stopAlarms);

module.exports = {
  createAlarms,
  stopAlarms
};