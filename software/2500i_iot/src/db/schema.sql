-- DM2500i IoT Device Database Schema
-- This file contains all table definitions for the device service

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Device metadata table (converted from Sequelize model)
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


-- Main history table with partitioning support
CREATE TABLE IF NOT EXISTS history_iot_inam (
  -- Identity & Sync
  id BIGSERIAL,
  device_serial VARCHAR(50) NOT NULL,
  sync_id UUID DEFAULT gen_random_uuid(),
  
  -- Timestamps
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  aggregation_start TIMESTAMP WITH TIME ZONE NOT NULL,
  aggregation_end TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Operational Data
  product VARCHAR(50) NOT NULL DEFAULT 'corn',
  mode VARCHAR(50) NOT NULL,
  dryer_state VARCHAR(50) NOT NULL,
  
  -- Sensor Data (with validation ranges)
  inlet_moisture NUMERIC(5,2) CHECK (inlet_moisture IS NULL OR inlet_moisture BETWEEN 0 AND 100),
  outlet_moisture NUMERIC(5,2) CHECK (outlet_moisture IS NULL OR outlet_moisture BETWEEN 0 AND 100),
  inlet_temperature NUMERIC(6,2) CHECK (inlet_temperature IS NULL OR inlet_temperature BETWEEN -50 AND 500),
  outlet_temperature NUMERIC(6,2) CHECK (outlet_temperature IS NULL OR outlet_temperature BETWEEN -50 AND 500),
  discharge_rate NUMERIC(8,2) CHECK (discharge_rate IS NULL OR discharge_rate >= 0),
  moisture_target NUMERIC(5,2) CHECK (moisture_target IS NULL OR moisture_target BETWEEN 0 AND 100),
  apt NUMERIC(6,2),
  
  -- Data Quality
  sample_count SMALLINT NOT NULL DEFAULT 60,
  data_quality SMALLINT DEFAULT 100,
  
  -- Sync Management
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'failed')),
  sync_attempts SMALLINT DEFAULT 0,
  synced_at TIMESTAMP WITH TIME ZONE,
  sync_batch_id VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT pk_history_iot_inam PRIMARY KEY (device_serial, recorded_at, id)
  -- Note: UNIQUE constraint on sync_id cannot be created on partitioned table
  -- Will be added to each partition instead
) PARTITION BY RANGE (recorded_at);

-- Create initial partitions (current and next month)
DO $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  -- Current month
  start_date := date_trunc('month', CURRENT_DATE);
  end_date := start_date + interval '1 month';
  partition_name := 'history_iot_inam_' || to_char(start_date, 'YYYY_MM');
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = partition_name
  ) THEN
    EXECUTE format('CREATE TABLE %I PARTITION OF history_iot_inam FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date);
  END IF;
  
  -- Next month
  start_date := end_date;
  end_date := start_date + interval '1 month';
  partition_name := 'history_iot_inam_' || to_char(start_date, 'YYYY_MM');
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = partition_name
  ) THEN
    EXECUTE format('CREATE TABLE %I PARTITION OF history_iot_inam FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date);
  END IF;
END $$;

-- Optimized Indexes
CREATE INDEX IF NOT EXISTS idx_device_serial ON device_inam(serial);
CREATE INDEX IF NOT EXISTS idx_device_connection ON device_inam("cloudConnection", "lastConnected");
CREATE INDEX IF NOT EXISTS idx_history_iot_device_recorded ON history_iot_inam (device_serial, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_iot_sync_status ON history_iot_inam (sync_status, device_serial) WHERE sync_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_history_iot_sync_batch ON history_iot_inam (sync_batch_id) WHERE sync_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_history_iot_created_at ON history_iot_inam (created_at DESC);

-- Sync tracking table
CREATE TABLE IF NOT EXISTS history_sync_log_inam (
  id BIGSERIAL PRIMARY KEY,
  device_serial VARCHAR(50) NOT NULL,
  batch_id VARCHAR(100) NOT NULL,
  sync_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sync_end TIMESTAMP WITH TIME ZONE,
  
  records_synced INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  
  CONSTRAINT uq_sync_batch UNIQUE (batch_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_log_device ON history_sync_log_inam (device_serial, sync_end DESC);
CREATE INDEX IF NOT EXISTS idx_sync_log_batch ON history_sync_log_inam (batch_id);

-- Data retention policy table
CREATE TABLE IF NOT EXISTS data_retention_policy_inam (
  table_pattern VARCHAR(100) PRIMARY KEY,
  retention_days INTEGER NOT NULL,
  compression_days INTEGER,
  archive_days INTEGER,
  delete_after_archive BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Default retention policy
INSERT INTO data_retention_policy_inam (table_pattern, retention_days, compression_days, archive_days, delete_after_archive) 
VALUES ('history_iot_inam_%', 90, 7, 30, true)
ON CONFLICT (table_pattern) DO NOTHING;

-- Function to automatically create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition_inam()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  -- Create partition for next month if it doesn't exist
  start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
  end_date := start_date + interval '1 month';
  partition_name := 'history_iot_inam_' || to_char(start_date, 'YYYY_MM');
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = partition_name
  ) THEN
    EXECUTE format('CREATE TABLE %I PARTITION OF history_iot_inam FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date);
    RAISE NOTICE 'Created partition %', partition_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old partitions based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_partitions_inam()
RETURNS void AS $$
DECLARE
  partition RECORD;
  retention_days INT;
  partition_date DATE;
BEGIN
  -- Get retention policy
  SELECT retention_days INTO retention_days 
  FROM data_retention_policy_inam 
  WHERE 'history_iot_inam_' LIKE table_pattern 
  LIMIT 1;
  
  IF retention_days IS NULL THEN
    retention_days := 90; -- Default 90 days
  END IF;
  
  -- Find and drop old partitions
  FOR partition IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename LIKE 'history_iot_inam_%' 
    AND tablename ~ '\d{4}_\d{2}$'
  LOOP
    -- Extract date from partition name (YYYY_MM format)
    BEGIN
      partition_date := to_date(
        substring(partition.tablename from '\d{4}_\d{2}$'), 
        'YYYY_MM'
      );
      
      -- Drop if older than retention period
      IF partition_date < CURRENT_DATE - (retention_days || ' days')::interval THEN
        EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', partition.tablename);
        RAISE NOTICE 'Dropped old partition %', partition.tablename;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to process partition %: %', partition.tablename, SQLERRM;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy monitoring
CREATE OR REPLACE VIEW history_iot_status AS
SELECT 
  device_serial,
  DATE(recorded_at) as date,
  COUNT(*) as record_count,
  COUNT(*) FILTER (WHERE sync_status = 'pending') as pending_sync,
  COUNT(*) FILTER (WHERE sync_status = 'synced') as synced,
  COUNT(*) FILTER (WHERE sync_status = 'failed') as failed_sync,
  AVG(data_quality) as avg_quality,
  MIN(recorded_at) as first_record,
  MAX(recorded_at) as last_record
FROM history_iot_inam
WHERE recorded_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY device_serial, DATE(recorded_at)
ORDER BY device_serial, date DESC;

-- Function to update the device updatedAt timestamp
CREATE OR REPLACE FUNCTION update_device_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for device table
DROP TRIGGER IF EXISTS update_device_updated_at_trigger ON device_inam;
CREATE TRIGGER update_device_updated_at_trigger
BEFORE UPDATE ON device_inam
FOR EACH ROW
EXECUTE FUNCTION update_device_updated_at();