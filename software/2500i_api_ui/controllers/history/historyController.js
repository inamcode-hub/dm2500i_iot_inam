const db = require('../../lib/db/pool');

const history = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 10;
    const intervalMinutes = parseInt(req.query.interval) || 10; // Interval in minutes

    const { start, end } = req.body;
    let dateFilter = '';
    let queryParams = [];

    if (start && end) {
      dateFilter = 'WHERE "createdAt" BETWEEN $1 AND $2';
      queryParams = [start, end];
    }

    // Get minimum date
    const minDateResult = await db.query('SELECT MIN("createdAt") as min_date FROM history_inam');
    const minDate = minDateResult.rows[0].min_date;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM history_inam ${dateFilter}`;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].count);
    
    const totalIntervals = Math.ceil(totalCount / intervalMinutes);
    const totalPages = Math.ceil(totalIntervals / perPage);

    const offset = (page - 1) * perPage * intervalMinutes;
    const limit = perPage * intervalMinutes;

    // Get paginated data
    const dataQuery = `
      SELECT * FROM history_inam 
      ${dateFilter}
      ORDER BY "createdAt" DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const dataResult = await db.query(dataQuery, [...queryParams, limit, offset]);
    const rawData = dataResult.rows;

    // Function to find the most common value in an array
    const mostCommon = (arr) => {
      return arr
        .sort(
          (a, b) =>
            arr.filter((v) => v === a).length -
            arr.filter((v) => v === b).length
        )
        .pop();
    };

    // Aggregate data by interval
    const aggregatedData = [];
    for (let i = 0; i < rawData.length; i += intervalMinutes) {
      const chunk = rawData.slice(i, i + intervalMinutes);

      const averageData = chunk.reduce(
        (acc, cur) => {
          acc.rate = (acc.rate || 0) + cur.rate / chunk.length;
          acc.inlet = (acc.inlet || 0) + cur.inlet / chunk.length;
          acc.outlet = (acc.outlet || 0) + cur.outlet / chunk.length;
          acc.target = (acc.target || 0) + cur.target / chunk.length;
          acc.apt = (acc.apt || 0) + cur.apt / chunk.length;

          acc.products.push(cur.product);
          acc.modes.push(cur.mode);
          return acc;
        },
        {
          rate: 0,
          inlet: 0,
          outlet: 0,
          target: 0,
          apt: 0,
          products: [],
          modes: [],
        }
      );

      aggregatedData.push({
        rate: parseFloat(averageData.rate.toFixed(2)),
        inlet: parseFloat(averageData.inlet.toFixed(2)),
        outlet: parseFloat(averageData.outlet.toFixed(2)),
        target: parseFloat(averageData.target.toFixed(2)),
        apt: parseFloat(averageData.apt.toFixed(2)),
        product: mostCommon(averageData.products),
        mode: mostCommon(averageData.modes),
        createdAt: chunk[0].createdAt,
      });
    }

    res.json({
      success: true,
      message: 'Averaged history data',
      totalCount: totalIntervals, // Total count of interval-based records
      totalPages,
      resultPerPage: perPage,
      currentPage: page,
      minDate,
      data: aggregatedData,
    });
  } catch (err) {
    console.error('Error in history controller:', err);
    next(err);
  }
};

module.exports = {
  history,
};