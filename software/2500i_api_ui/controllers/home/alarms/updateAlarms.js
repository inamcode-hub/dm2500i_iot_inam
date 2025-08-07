const db = require('../../../lib/db/pool');

const UpdateAlarms = async (req, res) => {
  try {
    const { sztag } = req.body;

    if (!sztag) {
      return res
        .status(400)
        .json({ message: 'sztag is required in the request body.' });
    }

    console.log(`Received request to acknowledge alarm: ${sztag}`);

    // This query sets 'delayed' to 0 for the alarm that matches the given sztag
    const updateQuery = `
      UPDATE alarm_table
      SET sonalert_active = 0
      WHERE sztag = $1
      RETURNING *;
    `;

    const result = await db.query(updateQuery, [sztag]);

    console.log(`Acknowledge result for sztag: ${sztag}`, result.rows);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ message: `Alarm with sztag ${sztag} not found.` });
    }

    res.status(200).json({
      message: 'Alarm acknowledged successfully.',
      updatedAlarm: result.rows[0],
    });
  } catch (err) {
    console.error('Error acknowledging alarm:', err);
    res
      .status(500)
      .json({ message: 'Internal server error', error: err.message });
  }
};

module.exports = {
  UpdateAlarms,
};
