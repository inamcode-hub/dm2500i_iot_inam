const db = require('../../lib/db/pool');
const { data } = require('../../lib/data/homeData');
const sendAlarms = require('./alarms/sendAlarms');
const { safeQuery } = require('../../lib/utils/safeQuery');

// Function to get device information with fallback
const getDeviceInfo = async () => {
  try {
    const result = await db.query(
      'SELECT serial, "registerPassword", "cloudConnection", "lastConnected" FROM device_inam LIMIT 1'
    );
    
    if (result.rows.length > 0) {
      const device = result.rows[0];
      return {
        serial: device.serial,
        registerPassword: device.registerPassword,
        cloudConnection: device.cloudConnection,
        lastConnected: device.lastConnected
      };
    }
    return null;
  } catch (error) {
    console.warn('Device table not found or error accessing it:', error.message);
    return null;
  }
};

// Function to send SSE events to the client
const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// Function to handle SSE for a client
const HomePage = async (req, res) => {
  const clientIp = req.ip; // Get the IP address of the incoming request

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Send the initial event to the client
    sendSSE(res, 'initialData', []);

    let intervalId; // Store the interval ID

    // Function to continuously send updates
    const sendUpdates = async () => {
      try {
        const channumArray = data.map((item) => item.channum);

        // Get device information
        const deviceInfo = await getDeviceInfo();

        // Loop through the data array and execute a query for each item
        for (const item of data) {
          const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
          const queryResult = await safeQuery(db, text, [channumArray], `table: ${item.table}`);
          
          if (queryResult.success) {
            const matchingRow = queryResult.result.rows.find(
              (row) => row.channum === item.channum
            );
            if (!matchingRow) {
              // Assign default values if no matching row is found
              item.value = 0;
              item.sztag = 'N/A';
              item.lwl = 0;
              item.lal = 0;
              item.hal = 0;
              item.hwl = 0;
            } else {
              item.value = matchingRow[item.column] || 0;
              item.sztag = matchingRow.sztag || 0;
              item.lwl = matchingRow.lwl || 0;
              item.lal = matchingRow.lal || 0;
              item.hal = matchingRow.hal || 0;
              item.hwl = matchingRow.hwl || 0;
            }
          } else {
            // Set safe defaults on query error
            item.value = 0;
            item.sztag = 'ERR';
            item.lwl = 0;
            item.lal = 0;
            item.hal = 0;
            item.hwl = 0;
          }
        }
        
        // Check alarm_table for alarms
        const alarm = await sendAlarms();

        const updatedData = [...data, alarm];

        // Prepare response data with device info
        const responseData = {
          sensorData: updatedData,
          deviceInfo: deviceInfo || {
            serial: 'N/A',
            registerPassword: 'N/A',
            cloudConnection: false,
            lastConnected: null
          }
        };

        // Send updated data to the client
        sendSSE(res, 'updateData', responseData);
      } catch (error) {
        console.error('Error in sendUpdates:', error);
        // Send error state to client
        sendSSE(res, 'error', { message: 'Update failed', timestamp: new Date().toISOString() });
      }
    };

    // Start sending updates
    sendUpdates();

    // Set a new interval to send updates periodically
    intervalId = setInterval(sendUpdates, 1000); // Adjust the interval as needed

    // Handle the client disconnecting
    req.on('close', () => {
      clearInterval(intervalId);
      console.log(`Client disconnected from IP: ${clientIp}`);
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  HomePage,
};