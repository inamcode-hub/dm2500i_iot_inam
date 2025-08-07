-- DM2500i Embedded API Database Schema
-- This file contains all table definitions previously managed by Sequelize

-- Device metadata table (matching Device.js Sequelize model)
CREATE TABLE IF NOT EXISTS device_inam (
  id SERIAL PRIMARY KEY,
  serial VARCHAR(255) UNIQUE NOT NULL,
  "registerPassword" VARCHAR(255) NOT NULL,
  token TEXT NOT NULL,
  "cloudConnection" BOOLEAN DEFAULT false,
  "lastConnected" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- History table (from models/History.js)
CREATE TABLE IF NOT EXISTS history_inam (
  id SERIAL PRIMARY KEY,
  product VARCHAR(50) NOT NULL,
  mode VARCHAR(50) NOT NULL,
  inlet FLOAT NOT NULL,
  outlet FLOAT NOT NULL,
  rate FLOAT NOT NULL,
  target FLOAT NOT NULL,
  apt FLOAT NOT NULL,
  dryer_state VARCHAR(50) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Alarms table (matching Alarms.js Sequelize model - simple alarm log)
CREATE TABLE IF NOT EXISTS alarms_inam (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  message VARCHAR(100) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Alarms history table (for detailed sensor alarm data)
CREATE TABLE IF NOT EXISTS alarms_history (
  id SERIAL PRIMARY KEY,
  channelNumber INTEGER NOT NULL,
  sensorName VARCHAR(50),
  unit VARCHAR(10),
  sensorValue VARCHAR(10),
  "timeStamp" VARCHAR(50) DEFAULT CURRENT_TIMESTAMP::text,
  timeStampEpoch BIGINT,
  highAlarm DECIMAL(10, 2),
  lowAlarm DECIMAL(10, 2),
  highWarning DECIMAL(10, 2),
  lowWarning DECIMAL(10, 2),
  max DECIMAL(10, 2),
  min DECIMAL(10, 2),
  alarmStatus INTEGER,
  state VARCHAR(20)
);

-- Alarms Status table (from models/AlarmsStatus.js)
CREATE TABLE IF NOT EXISTS alarms_status_inam (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) UNIQUE,
  hal BOOLEAN DEFAULT false,
  hwl BOOLEAN DEFAULT false,
  lal BOOLEAN DEFAULT false,
  lwl BOOLEAN DEFAULT false,
  in_alarm INTEGER DEFAULT 0,
  alarm_text VARCHAR(500)
);


-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_device_serial ON device_inam(serial);
CREATE INDEX IF NOT EXISTS idx_history_createdAt ON history_inam("createdAt");
CREATE INDEX IF NOT EXISTS idx_alarms_createdAt ON alarms_inam("createdAt");
CREATE INDEX IF NOT EXISTS idx_alarms_history_channelNumber ON alarms_history(channelNumber);
CREATE INDEX IF NOT EXISTS idx_alarms_history_timeStamp ON alarms_history("timeStamp");

-- Device table should remain empty - required by application logic

-- Initialize alarms_status table with default data
-- Based on defaultAlarmsData from models/data.js
INSERT INTO alarms_status_inam (id, name, hal, hwl, lal, lwl, in_alarm, alarm_text) VALUES
(1, 'inlet_moisture', false, false, false, false, 0, ''),
(2, 'inlet_temperature', false, false, false, false, 0, ''),
(3, 'outlet_moisture', false, false, false, false, 0, ''),
(4, 'outlet_temperature', false, false, false, false, 0, ''),
(5, 'drying_temperature', false, false, false, false, 0, ''),
(6, 'discharge_rate', false, false, false, false, 0, '')
ON CONFLICT (id) DO NOTHING;