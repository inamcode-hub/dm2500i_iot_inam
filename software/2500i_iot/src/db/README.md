# 📁 db/

**Status:** DEPRECATED - This directory is no longer in use.

**Migration:** All database functionality has been moved to the centralized database service located at:
- `src/services/centralDatabase.js`

The centralized service handles:
- Database connection pooling
- Sequelize ORM initialization
- Device model synchronization
- SSH tunnel setup for development
- Connection retry logic with backoff
- Graceful shutdown procedures

**Legacy Purpose:** This directory previously handled database connection, model sync, and automatic retry on failure, but all functionality has been consolidated into the centralized database service for better maintainability and resource management.
