const fs = require('fs');
const path = require('path');
const { query, closePool } = require('./pool');

async function initializeDatabase() {
  try {
    console.log('Initializing database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the schema
    await query(schema);
    
    console.log('Database schema initialized successfully');
    // console.log('Created tables: device_inam, history_inam, alarms_inam, alarms_status_inam');
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };