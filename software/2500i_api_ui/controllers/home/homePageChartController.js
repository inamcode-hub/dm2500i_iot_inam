const db = require('../../lib/db/pool');

// Function to fetch the last 240 records (approx 4 hours of data)
const fetchDataForLastFourHours = async () => {
  try {
    const result = await db.query(
      `SELECT * FROM history_inam 
       ORDER BY "createdAt" DESC 
       LIMIT 240`
    );
    return result.rows;
  } catch (err) {
    console.error('Error fetching data:', err);
    throw err;
  }
};

// Function to calculate 10-minute averages
const calculateTenMinuteAverages = (data) => {
  const averages = [];
  for (let i = 0; i < data.length; i += 10) {
    const tenMinuteSlice = data.slice(i, i + 10);
    
    if (tenMinuteSlice.length === 0) continue;
    
    // Calculate averages for numeric fields
    const averageRecord = {
      inlet: 0,
      outlet: 0,
      rate: 0,
      target: 0,
      apt: 0,
    };
    
    // Sum up values
    tenMinuteSlice.forEach((record) => {
      averageRecord.inlet += record.inlet || 0;
      averageRecord.outlet += record.outlet || 0;
      averageRecord.rate += record.rate || 0;
      averageRecord.target += record.target || 0;
      averageRecord.apt += record.apt || 0;
    });
    
    // Calculate averages
    const count = tenMinuteSlice.length;
    averageRecord.inlet = averageRecord.inlet / count;
    averageRecord.outlet = averageRecord.outlet / count;
    averageRecord.rate = averageRecord.rate / count;
    averageRecord.target = averageRecord.target / count;
    averageRecord.apt = averageRecord.apt / count;
    
    // Use the first record's non-numeric data and timestamp
    averages.push({
      ...averageRecord,
      product: tenMinuteSlice[0].product,
      mode: tenMinuteSlice[0].mode,
      dryer_state: tenMinuteSlice[0].dryer_state,
      createdAt: tenMinuteSlice[0].createdAt,
      id: tenMinuteSlice[0].id
    });
  }
  return averages;
};

const HomePageChart = async (req, res, next) => {
  try {
    const allData = await fetchDataForLastFourHours();
    const averageData = calculateTenMinuteAverages(allData);

    res.json({
      success: true,
      message: 'Chart Data!',
      total: averageData.length,
      data: averageData,
    });
  } catch (err) {
    console.error('Error in HomePageChart:', err.message);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
      error: err.message,
    });
  }
};

module.exports = {
  HomePageChart,
};