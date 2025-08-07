const db = require('../../lib/db/pool');

const deleteHistory = async () => {
  const deleteQuery = `
    DELETE FROM "history_inam"
    WHERE id IN (
      SELECT id
      FROM "history_inam"
      ORDER BY "createdAt" ASC -- Use ASC for ascending order
      LIMIT ${1000}
    );
  `;
  // console.log('Deleting old history records...');
  await db.query(deleteQuery);
  
  const vacuumQuery = `VACUUM FULL "history_inam";`;
  await db.query(vacuumQuery);
};

// set limit 10mb in bytes
const limit = 10485760;

const checkTableSize = async () => {
  try {
    const tableSizeQuery = `
      SELECT pg_total_relation_size('"history_inam"') AS data_size_in_bytes;
    `;
    const result = await db.query(tableSizeQuery);
    const dataSize = Number(result.rows[0].data_size_in_bytes);
    // console.log('History table size in bytes:', dataSize);
    
    if (dataSize > limit) {
      await deleteHistory();
    }
  } catch (error) {
    console.error('Error checking history table size:', error);
  }
};

module.exports = { checkTableSize };