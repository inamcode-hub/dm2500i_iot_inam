# IoT Device API Documentation

## Overview

The IoT Device API provides a RESTful interface for managing device operations, retrieving sensor data, and updating device parameters. This API enables direct communication with the device without requiring server-to-server calls.

## Base URL

```
http://localhost:3003
```

## Architecture

The API follows a clean architecture pattern with the following structure:

```
src/api/
├── config/          # Configuration files
├── controllers/     # Request handlers
├── middleware/      # Reusable middleware
├── routes/          # Route definitions
├── validators/      # Input validation
├── home.js         # Home data service
├── valueUpdates.js # Value update service
└── server.js       # Main server application
```

## Authentication

Currently, the API is open and does not require authentication. All endpoints are publicly accessible.

## Response Format

All API responses follow a consistent format:

```json
{
  "status": "success|error|warning",
  "message": "Human-readable message",
  "data": {}, // Present for successful data requests
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes and descriptive messages:

- `400 Bad Request` - Invalid input or validation errors
- `404 Not Found` - Endpoint not found
- `500 Internal Server Error` - Server-side errors

## Rate Limiting

Currently, no rate limiting is implemented. This may be added in future versions.

---

## Endpoints

### Health Check

#### GET /api/v1/health

Check API health status and system information.

**Response:**
```json
{
  "status": "success",
  "message": "IoT Device API is healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development",
  "database": "connected",
  "memory": {
    "used": "25MB",
    "total": "30MB",
    "external": "5MB"
  },
  "healthy": true
}
```

### Home Data

#### GET /api/v1/home/data

Retrieve live home data including sensor readings and device information.

**Response:**
```json
{
  "status": "success",
  "message": "Home data retrieved successfully",
  "data": {
    "sensorData": [
      {
        "name": "moisture_setpoint",
        "value": 25.5,
        "channum": 20,
        "sztag": "DAI_MOISTURE_SP"
      }
    ],
    "deviceInfo": {
      "serial": "DM2500I-001",
      "registerPassword": "password123",
      "cloudConnection": true,
      "lastConnected": "2024-01-01T00:00:00.000Z"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/v1/home/chart

Retrieve historical chart data with 10-minute averages.

**Response:**
```json
{
  "success": true,
  "message": "Chart Data!",
  "total": 24,
  "data": [
    {
      "createdAt": "2024-01-01T00:00:00.000Z",
      "moisture": 25.5,
      "temperature": 150.2,
      "discharge_rate": 1000
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Parameter Updates

#### POST /api/v1/updates/keypad_updates/:name

Update an individual keypad parameter.

**Parameters:**
- `name` (path) - Parameter name (e.g., `moisture_setpoint`)

**Request Body:**
```json
{
  "value": 25.5
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Value Updated Successfully!",
  "detailMessage": {
    "name": "moisture_setpoint",
    "channum": 20,
    "sztag": "DAI_MOISTURE_SP",
    "column": "pv",
    "value": 25.5,
    "table": "io_table"
  },
  "result": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Available Parameters:**
- `discharge_rate_setpoint` - Discharge rate setpoint (units/min)
- `moisture_setpoint` - Moisture setpoint (%) - *Range validation disabled for development*
- `drying_temperature` - Drying temperature (°C) - *Range validation disabled for development*
- `not_ready_reason` - Not ready reason code
- `discharge_rate` - Current discharge rate (units/min) - *Range validation disabled for development*

**Note:** Alarm information and limits are retrieved from the `alarm_table` in the database, not from individual parameter responses.

#### POST /api/v1/updates/mode_controller

Update device operation mode.

**Request Body:**
```json
{
  "value": "automatic_mode"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Mode Changed Successfully!",
  "detailMessage": {
    "mode": "automatic_mode",
    "updates": {
      "89": 1,
      "156": 1
    }
  },
  "updates": [
    {
      "channum": 89,
      "updated": true
    },
    {
      "channum": 156,
      "updated": true
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Available Modes:**
- `local_mode` - Local operation mode
- `manual_mode` - Manual operation mode
- `automatic_mode` - Automatic operation mode

#### GET /api/v1/updates/parameters

Get list of available keypad parameters.

**Response:**
```json
{
  "status": "success",
  "message": "Available parameters retrieved successfully",
  "data": [
    {
      "name": "moisture_setpoint",
      "channum": 20,
      "sztag": "DAI_MOISTURE_SP",
      "table": "io_table",
      "minRange": 1,
      "maxRange": 50,
      "description": "Moisture setpoint",
      "unit": "%"
    }
  ],
  "count": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### GET /api/v1/updates/modes

Get list of available device modes.

**Response:**
```json
{
  "status": "success",
  "message": "Available modes retrieved successfully",
  "data": [
    {
      "name": "automatic_mode",
      "description": "Automatic operation mode - system controlled",
      "channels": {
        "89": 1,
        "156": 1
      }
    }
  ],
  "count": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### API Information

#### GET /api/v1

Get API information and available endpoints.

**Response:**
```json
{
  "name": "IoT Device API",
  "version": "1.0.0",
  "description": "REST API for IoT device value updates and data retrieval",
  "endpoints": {
    "health": "/api/v1/health",
    "home": {
      "data": "/api/v1/home/data",
      "chart": "/api/v1/home/chart"
    },
    "updates": {
      "keypad": "/api/v1/updates/keypad_updates/:name",
      "mode": "/api/v1/updates/mode_controller",
      "parameters": "/api/v1/updates/parameters",
      "modes": "/api/v1/updates/modes"
    }
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Usage Examples

### cURL Examples

#### Update Moisture Setpoint
```bash
curl -X POST http://localhost:3003/api/v1/updates/keypad_updates/moisture_setpoint \
  -H "Content-Type: application/json" \
  -d '{"value": 25.5}'
```

#### Change to Automatic Mode
```bash
curl -X POST http://localhost:3003/api/v1/updates/mode_controller \
  -H "Content-Type: application/json" \
  -d '{"value": "automatic_mode"}'
```

#### Get Live Data
```bash
curl http://localhost:3003/api/v1/home/data
```

#### Check Health
```bash
curl http://localhost:3003/api/v1/health
```

### JavaScript Examples

#### Using Fetch API
```javascript
// Update parameter
const updateParameter = async (name, value) => {
  const response = await fetch(`http://localhost:3003/api/v1/updates/keypad_updates/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ value })
  });
  
  return response.json();
};

// Get live data
const getLiveData = async () => {
  const response = await fetch('http://localhost:3003/api/v1/home/data');
  return response.json();
};

// Usage
updateParameter('moisture_setpoint', 25.5);
getLiveData().then(data => console.log(data));
```

### Python Examples

#### Using requests library
```python
import requests

# Update parameter
def update_parameter(name, value):
    response = requests.post(
        f'http://localhost:3003/api/v1/updates/keypad_updates/{name}',
        json={'value': value}
    )
    return response.json()

# Get live data
def get_live_data():
    response = requests.get('http://localhost:3003/api/v1/home/data')
    return response.json()

# Usage
result = update_parameter('moisture_setpoint', 25.5)
data = get_live_data()
```

---

## Configuration

### Environment Variables

The API uses the following environment variables (defined in `.env`):

```bash
# Database Configuration
DB_NAME=dm
DB_USER=dmi
DB_PASSWORD=dmi
DB_HOST=localhost
DB_PORT=5432

# API Server Configuration
API_PORT=3003

# Logging Configuration
LOG_LEVEL=debug
```

### Database Schema

The API interacts with the following PostgreSQL tables:

#### io_table
- `channum` - Channel number (primary key)
- `pv` - Process value
- `sztag` - System tag
- Alarm limits (lwl, lal, hal, hwl) - *Not exposed in API, use alarm_table instead*

#### cdp_table
- `channum` - Channel number (primary key)
- `pv` - Process value
- `sztag` - System tag

#### alarm_table
**Primary source for alarm information:**
- `channum` - Channel number
- `in_alarm` - Alarm status (1 = active, 0 = inactive)
- `ha_msg` - High alarm message
- `hw_msg` - High warning message
- `la_msg` - Low alarm message
- `lw_msg` - Low warning message
- `sztag` - System tag

*Note: This table is the authoritative source for all alarm conditions and messages.*

#### history_inam
- `createdAt` - Timestamp
- Various sensor value columns

---

## Development

### Development Notes

**Range Validation:**
- Parameter range validation is currently **disabled** for development purposes
- Min/max range values are still available in parameter metadata but not enforced
- Range validation can be re-enabled in production by uncommenting validation code in:
  - `src/api/valueUpdates.js`
  - `src/api/validators/updateValidators.js`

**Alarm Handling:**
- Alarm limits (lwl, lal, hal, hwl) are **not exposed** in API responses
- All alarm information is retrieved from the `alarm_table` database table
- This provides a single source of truth for alarm conditions and messages

### Running the API Server

1. Ensure PostgreSQL is running and accessible
2. Set up environment variables in `.env`
3. Start the IoT device agent (includes API server):

```bash
cd /home/dmi/dm2500i/iot/device
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

### Testing

#### Manual Testing
```bash
# Test health endpoint
curl http://localhost:3003/api/v1/health

# Test parameter list
curl http://localhost:3003/api/v1/updates/parameters

# Test parameter update
curl -X POST http://localhost:3003/api/v1/updates/keypad_updates/moisture_setpoint \
  -H "Content-Type: application/json" \
  -d '{"value": 25.5}'
```

#### Automated Testing
Currently, no automated test suite is implemented. This is planned for future development.

### Monitoring

The API includes built-in logging for all requests, responses, and errors. Logs are output to the console and can be configured through the `LOG_LEVEL` environment variable.

---

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   - Check if port 3003 is already in use
   - Change `API_PORT` in `.env` file

2. **Database Connection Issues**
   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists and is accessible

3. **Parameter Update Failures**
   - Check parameter name spelling
   - Verify value is within valid range
   - Check alarm limits if applicable

### Debug Mode

Enable debug logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed request/response logging and database query information.

---

## License

This API is part of the DM2500i IoT system and is proprietary software.