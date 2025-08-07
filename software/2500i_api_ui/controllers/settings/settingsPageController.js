const db = require('../../lib/db/pool');
const { data } = require('../../lib/data/settingsData');

// Function to send SSE events to the client
const sendSSE = (res, event, data) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

const SettingsPage = async (req, res, next) => {
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
      const channumArray = data.map((item) => item.channum);

      // Loop through the data array and execute a query for each item
      for (const item of data) {
        const text = `SELECT * FROM ${item.table} WHERE channum = ANY($1::integer[])`;
        const result = await db.query(text, [channumArray]);
        const matchingRow = result.rows.find(
          (row) => row.channum === item.channum
        );

        if (!matchingRow) {
          console.warn(`No matching row found for channum: ${item.channum}`);
          // Assign "N/A" if no matching row is found
          item.name = `${item.name}_N/A`;
          item.value = 0;
          item.sztag = 0;
        } else {
          item.value = matchingRow[item.column] || 0;
          item.sztag = matchingRow.sztag || 0;
        }
      }
      
      // Send updated data to the client
      sendSSE(res, 'updateData', data);
    };

    // Start sending updates
    sendUpdates();

    // Set a new interval to send updates periodically
    intervalId = setInterval(sendUpdates, 2000); // Update every 2 seconds

    // Handle the client disconnecting
    req.on('close', () => {
      clearInterval(intervalId);
      console.log(`Settings client disconnected from IP: ${clientIp}`);
    });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  SettingsPage,
};