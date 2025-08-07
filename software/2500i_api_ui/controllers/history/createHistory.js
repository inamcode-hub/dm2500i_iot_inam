const db = require('../../lib/db/pool');
const data = require('./data');
const { checkTableSize } = require('./lib');
const { updateTaskHealth } = require('../../lib/utils/taskHealth');

let intervalId = null;

const createHistory = async () => {
  try {
    // Temporary storage for 60 seconds of data
    let tempStorage = data.reduce((acc, item) => {
      acc[item.channum] = [];
      return acc;
    }, {});

    const fetchFreshData = async () => {
      const channumArray = data.map((item) => item.channum);
      for (const item of data) {
        const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
        const result = await db.query(text, [channumArray]);
        const matchingRow = result.rows.find(
          (row) => row.channum === item.channum
        );
        if (matchingRow) {
          tempStorage[item.channum].push(matchingRow[item.column]);
        }
      }
    };

    const calculateAverage = (values) => {
      if (values.length === 0) return 0;
      const value = values.reduce((a, b) => a + b, 0) / values.length;
      return Math.round(value * 100) / 100;
    };

    const checkMode = () => {
      const avgValue = calculateAverage(tempStorage[121]);
      const mode = Number(avgValue ? avgValue.toFixed(0) : 0);

      if (mode === 10) {
        return 'local';
      } else if (mode === 11) {
        return 'manual';
      } else if (mode === 12) {
        return 'automatic';
      } else {
        return 'unknown'; // Default case
      }
    };

    const checkDryerState = () => {
      const avgState = calculateAverage(tempStorage[105]);
      const state = Number(avgState ? avgState.toFixed(0) : 0);

      if (state === 0) {
        return 'standby';
      } else if (state === 1) {
        return 'primed';
      } else if (state === 2) {
        return 'idle run';
      } else if (state === 3) {
        return 'preheat';
      } else if (state === 4) {
        return 'running';
      } else if (state === 5) {
        return 'unloading';
      } else {
        return 'unknown';
      }
    };

    let secondsElapsed = 0;
    const intervalFunction = async () => {
      try {
        await checkTableSize();
        await fetchFreshData();
        secondsElapsed++;

        if (secondsElapsed === 60) {
          // Create history record
          await db.query(
            `INSERT INTO history_inam (product, mode, inlet, outlet, rate, target, apt, dryer_state)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              'corn',
              checkMode(),
              calculateAverage(tempStorage[300]),
              calculateAverage(tempStorage[301]),
              calculateAverage(tempStorage[49]),
              calculateAverage(tempStorage[20]),
              calculateAverage(tempStorage[50]),
              checkDryerState()
            ]
          );

          console.log('History record created');
          updateTaskHealth('createHistory', 'running');

          // Reset tempStorage and counter
          tempStorage = data.reduce((acc, item) => {
            acc[item.channum] = [];
            return acc;
          }, {});
          secondsElapsed = 0;
        }
      } catch (error) {
        console.error('Error in intervalFunction:', error);
        updateTaskHealth('createHistory', 'error', error);
      }
    };

    intervalId = setInterval(intervalFunction, 1000); // Run the interval function every second
  } catch (error) {
    console.error('Error in createHistory:', error);
  }
};

// Cleanup function to stop the interval
const stopHistory = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('History creation stopped');
  }
};

// Handle process termination
process.on('SIGTERM', stopHistory);
process.on('SIGINT', stopHistory);

module.exports = createHistory;