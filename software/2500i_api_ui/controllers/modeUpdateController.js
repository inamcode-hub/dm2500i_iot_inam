const db = require('../lib/db/pool');

// Update operation: Update a mode

const UpdateMode = async (req, res, next) => {
  const mode = req.body.value;

  let updates = {};
  if (mode === 'local_mode') {
    updates = { 89: 0, 156: 0 };
  } else if (mode === 'manual_mode') {
    updates = { 89: 0, 156: 1 };
  } else if (mode === 'automatic_mode') {
    updates = { 89: 1, 156: 1 };
  } else {
    return res.status(400).json({ status: 'error', message: 'Invalid mode' });
  }

  const data = [
    {
      name: 'local_manual_auto_mode',
      channum: 89,
      sztag: 'DDI_MODE_SELECT',
      column: 'pv',
      value: 0.0,
      table: 'io_table',
    },
    {
      name: 'local_manual_auto_mode',
      channum: 156,
      sztag: 'DO_LOCAL_REMOTE_SEL',
      column: 'pv',
      value: 0.0,
      table: 'io_table',
    },
  ];

  try {
    let updateResults = [];
    for (const item of data) {
      if (updates.hasOwnProperty(item.channum)) {
        const newValue = updates[item.channum];
        const updateText = `UPDATE ${item.table} SET ${item.column} = $1 WHERE channum = $2`;
        await db.query(updateText, [newValue, item.channum]);

        // Verify the update
        const verifyText = `SELECT * FROM ${item.table} WHERE channum = $1`;
        const verifyResult = await db.query(verifyText, [item.channum]);
        const isUpdated = verifyResult.rows.some(
          (row) => row[item.column] === newValue
        );

        updateResults.push({ channum: item.channum, updated: isUpdated });
      }
    }

    // Respond with the verification results
    res.status(200).json({
      status: 'success',
      message: 'Mode Changed Successfully!',
      detailMessage: {
        mode: mode,
        updates: updates,
      },
      updates: updateResults,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};

module.exports = {
  UpdateMode,
};
