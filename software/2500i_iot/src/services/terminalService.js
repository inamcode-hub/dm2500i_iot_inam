const pty = require('node-pty');
const logger = require('@utils/logger');

class TerminalService {
  constructor() {
    this.sessions = new Map();
    // Configurable timeout (default: 30 minutes)
    this.defaultTimeout = parseInt(process.env.TERMINAL_SESSION_TIMEOUT || '30') * 60 * 1000;
  }

  createSession(sessionId, options = {}) {
    const {
      cols = 80,
      rows = 30,
      cwd = process.env.HOME || '/home/dm2500i',
      shell = '/bin/bash'
    } = options;

    logger.info(`Creating terminal session: ${sessionId} with options:`, { cols, rows, cwd, shell });

    try {
      const terminal = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols,
        rows,
        cwd,
        env: process.env
      });

      const session = {
        terminal,
        sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        timeout: null,
        cols,
        rows
      };

      // Set session timeout
      session.timeout = setTimeout(() => {
        logger.info(`Terminal session timeout: ${sessionId}`);
        this.destroySession(sessionId);
      }, this.defaultTimeout);

      this.sessions.set(sessionId, session);
      logger.info(`Terminal session created successfully: ${sessionId}`);
      
      // Send initial command to trigger shell prompt
      setTimeout(() => {
        terminal.write('\n');
      }, 100);
      
      return session;
    } catch (error) {
      logger.error(`Failed to create terminal session: ${sessionId}`, error);
      throw error;
    }
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  writeToSession(sessionId, data) {
    const session = this.getSession(sessionId);
    if (session) {
      session.terminal.write(data);
      session.lastActivity = Date.now();
      
      // Reset timeout
      clearTimeout(session.timeout);
      session.timeout = setTimeout(() => {
        logger.info(`Terminal session timeout after activity: ${sessionId}`);
        this.destroySession(sessionId);
      }, this.defaultTimeout);

      logger.debug(`Data written to session ${sessionId}: ${data.length} bytes`);
    } else {
      logger.warn(`Attempted to write to non-existent session: ${sessionId}`);
    }
  }

  resizeSession(sessionId, cols, rows) {
    const session = this.getSession(sessionId);
    if (session) {
      session.terminal.resize(cols, rows);
      session.cols = cols;
      session.rows = rows;
      logger.info(`Terminal session resized: ${sessionId} to ${cols}x${rows}`);
    } else {
      logger.warn(`Attempted to resize non-existent session: ${sessionId}`);
    }
  }

  destroySession(sessionId) {
    const session = this.getSession(sessionId);
    if (session) {
      clearTimeout(session.timeout);
      
      try {
        session.terminal.kill();
      } catch (error) {
        logger.error(`Error killing terminal process for session ${sessionId}:`, error);
      }
      
      this.sessions.delete(sessionId);
      logger.info(`Terminal session destroyed: ${sessionId}`);
      return true;
    } else {
      logger.warn(`Attempted to destroy non-existent session: ${sessionId}`);
      return false;
    }
  }

  listSessions() {
    const sessions = Array.from(this.sessions.values()).map(session => ({
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      cols: session.cols,
      rows: session.rows
    }));
    
    logger.debug(`Listing terminal sessions: ${sessions.length} active`);
    return sessions;
  }

  getSessionCount() {
    return this.sessions.size;
  }

  cleanup() {
    const sessionIds = Array.from(this.sessions.keys());
    logger.info(`Cleaning up ${sessionIds.length} terminal sessions`);
    
    for (const sessionId of sessionIds) {
      this.destroySession(sessionId);
    }
  }

  // Get session statistics
  getStats() {
    const now = Date.now();
    const sessions = Array.from(this.sessions.values());
    
    return {
      totalSessions: sessions.length,
      activeSessions: sessions.filter(s => (now - s.lastActivity) < 60000).length, // Active in last minute
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt)) : null
    };
  }
}

// Create singleton instance
const terminalService = new TerminalService();

// Cleanup on process exit
process.on('SIGINT', () => {
  logger.info('Received SIGINT, cleaning up terminal sessions...');
  terminalService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, cleaning up terminal sessions...');
  terminalService.cleanup();
  process.exit(0);
});

module.exports = terminalService;