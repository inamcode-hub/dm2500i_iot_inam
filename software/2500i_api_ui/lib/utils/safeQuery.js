/**
 * Safe query wrapper with error handling
 * Prevents SSE streams from crashing on database errors
 */

const safeQuery = async (db, text, params, context = '') => {
  try {
    const result = await db.query(text, params);
    return { success: true, result };
  } catch (error) {
    console.error(`Database query failed ${context}:`, error.message);
    return { success: false, error, result: { rows: [] } };
  }
};

/**
 * Execute multiple queries safely in a loop
 * Continues even if individual queries fail
 */
const safeQueryLoop = async (db, items, queryFn) => {
  const results = [];
  
  for (const item of items) {
    try {
      const result = await queryFn(item);
      results.push({ item, success: true, result });
    } catch (error) {
      console.error(`Query failed for item ${item.name || item.channum}:`, error.message);
      results.push({ item, success: false, error });
    }
  }
  
  return results;
};

module.exports = {
  safeQuery,
  safeQueryLoop
};