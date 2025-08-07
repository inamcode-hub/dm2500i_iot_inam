const db = require('../../lib/db/pool');
const data = require('./data');

const alarm = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 20;
  const offset = (page - 1) * perPage;

  try {
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) FROM alarms_inam');
    const count = parseInt(countResult.rows[0].count);

    // Get paginated data
    const alarmsResult = await db.query(
      `SELECT * FROM alarms_inam 
       ORDER BY id DESC 
       LIMIT $1 OFFSET $2`,
      [perPage, offset]
    );

    res.status(200).json({ 
      msg: 'success', 
      count, 
      data: alarmsResult.rows 
    });
  } catch (error) {
    console.error('Error fetching alarms:', error);
    res.status(500).json({ msg: 'error', data: error.message });
  }
};

module.exports = {
  alarm,
};