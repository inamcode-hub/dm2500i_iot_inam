const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Temporary check to ensure environment variables are loaded
console.log('Jest PGUSER:', process.env.PGUSER);
console.log('Jest PGPASSWORD:', process.env.PGPASSWORD);
