const db = require('../../lib/db/pool');

const deleteHistory = async () => {
  const deleteQuery = `
    DELETE FROM "alarms_inam"
    WHERE id IN (
      SELECT id
      FROM "alarms_inam"
      ORDER BY "timeStamp" ASC -- Use ASC for ascending order
      LIMIT ${100}
    );
  `;
  console.log('Deleting old alarms...');
  await db.query(deleteQuery);
  
  const vacuumQuery = `VACUUM FULL "alarms_inam";`;
  await db.query(vacuumQuery);
};

// set limit 1mb in bytes
const limit = 1048576;

const checkTableSize = async () => {
  try {
    const tableSizeQuery = `
      SELECT pg_total_relation_size('"alarms_inam"') AS data_size_in_bytes;
    `;
    const result = await db.query(tableSizeQuery);
    const dataSize = Number(result.rows[0].data_size_in_bytes);

    if (dataSize > limit) {
      await deleteHistory();
    }
  } catch (error) {
    console.error('Error checking table size:', error);
  }
};

module.exports = { checkTableSize };