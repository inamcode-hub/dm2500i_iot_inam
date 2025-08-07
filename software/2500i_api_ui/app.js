// app.js
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json());
const cors = require('cors');
require('dotenv').config();
const db = require('./lib/db/pool');

const home = require('./routes/home/home');
const settings = require('./routes/settings/settings');
const diagnostics = require('./routes/diagnostics/diagnostics');
const history = require('./routes/history/history');
const system = require('./routes/system/system');
const alarms = require('./routes/alarms/alarms');
const errorHandler = require('./lib/errors/error_handler');
const createHistory = require('./controllers/history/createHistory');
const { createAlarms } = require('./controllers/alarms/createAlarms');

// Serve static files from the "public" directory
app.use(express.static('public'));
app.use(cors());
// Define a route for the root URL
app.get('/', (req, res) => {
  res.send('Hello, Express!');
});

// Define all other routes using the router modules

app.use('/api/v1/home', home);
app.use('/api/v1/settings', settings);
app.use('/api/v1/diagnostics', diagnostics);
app.use('/api/v1/history', history);
app.use('/api/v1/alarms', alarms);
app.use('/api/v1/system', system);

// Define a middleware to handle API routes that are not found
app.use(errorHandler);
app.use('/api', (req, res, next) => {
  // This middleware will handle all routes that start with '/api'
  res.status(404).json({ error: 'Route not found' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server listening on the specified port

const port = process.env.PORT || 3000;
// First, connect to the database

async function startServer() {
  try {
    // Initialize SSH tunnel if needed
    await db.initializeConnection();
    
    // Test database connection
    await db.query('SELECT 1');
    console.log('Database connection has been established successfully.');
    
    // Initialize database schema (create tables if they don't exist)
    const { initializeDatabase } = require('./lib/db/init-db');
    try {
      await initializeDatabase();
      console.log('Database schema initialized');
    } catch (error) {
      console.error('Error initializing database schema:', error);
      // Continue anyway as tables might already exist
    }
    
    // Skip alarms_status initialization - table has different structure
    // The alarms_status_inam table uses individual boolean columns (hal, hwl, lal, lwl)
    // instead of generic in_alarm field
    
    // Start the Express server
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    if (process.env.NODE_ENV !== 'development') {
      await createHistory();
      await createAlarms();
      console.log('History and Alarms data created successfully');
    }
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await db.closePool();
  process.exit(0);
});

startServer();
