const logger = require('@utils/logger');
const terminalService = require('@services/terminalService');

function handleTerminalAccess(message, ws) {
  const { payload } = message;
  const { action, sessionId, data } = payload;

  logger.debug(`Terminal access request: ${action} for session ${sessionId}`);

  try {
    switch (action) {
      case 'create':
        handleCreateSession(sessionId, payload, ws);
        break;
      case 'input':
        handleTerminalInput(sessionId, data);
        break;
      case 'resize':
        handleTerminalResize(sessionId, payload);
        break;
      case 'destroy':
        handleDestroySession(sessionId, ws);
        break;
      default:
        logger.warn(`Unknown terminal action: ${action}`);
        sendErrorResponse(ws, sessionId, action, `Unknown action: ${action}`);
    }
  } catch (error) {
    logger.error(`Terminal access error for ${action}:`, error);
    sendErrorResponse(ws, sessionId, action, error.message);
  }
}

function handleCreateSession(sessionId, message, ws) {
  const { cols = 80, rows = 30 } = message;
  
  logger.info(`Creating terminal session: ${sessionId} (${cols}x${rows})`);

  try {
    // Check if session already exists
    if (terminalService.getSession(sessionId)) {
      logger.warn(`Terminal session already exists: ${sessionId}`);
      sendErrorResponse(ws, sessionId, 'created', 'Session already exists');
      return;
    }

    const session = terminalService.createSession(sessionId, { cols, rows });
    
    // Set up output handler for node-pty
    session.terminal.on('data', (data) => {
      const output = data.toString();
      logger.info(`[Terminal] Output from session ${sessionId}: ${JSON.stringify(output)}`);
      ws.send(JSON.stringify({
        type: 'terminalOutput',
        sessionId,
        data: output
      }));
    });

    session.terminal.on('exit', (code, signal) => {
      logger.info(`Terminal session exited: ${sessionId} (code: ${code}, signal: ${signal})`);
      ws.send(JSON.stringify({
        type: 'terminalExit',
        sessionId,
        exitCode: code,
        signal
      }));
      terminalService.destroySession(sessionId);
    });

    session.terminal.on('error', (error) => {
      logger.error(`Terminal session error: ${sessionId}`, error);
      ws.send(JSON.stringify({
        type: 'terminalError',
        sessionId,
        error: error.message
      }));
    });

    // Send success acknowledgment
    ws.send(JSON.stringify({
      type: 'terminalAck',
      sessionId,
      action: 'created',
      success: true,
      message: 'Terminal session created successfully'
    }));

    logger.info(`Terminal session created successfully: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to create terminal session: ${sessionId}`, error);
    sendErrorResponse(ws, sessionId, 'created', error.message);
  }
}

function handleTerminalInput(sessionId, data) {
  logger.debug(`Terminal input for session ${sessionId}: ${JSON.stringify(data)}`);
  
  const session = terminalService.getSession(sessionId);
  if (!session) {
    logger.warn(`Terminal input for non-existent session: ${sessionId}`);
    return;
  }

  try {
    terminalService.writeToSession(sessionId, data);
    logger.debug(`Successfully wrote input to terminal session ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to write to terminal session ${sessionId}:`, error);
  }
}

function handleTerminalResize(sessionId, message) {
  const { cols, rows } = message;
  
  logger.info(`Resizing terminal session ${sessionId} to ${cols}x${rows}`);
  
  const session = terminalService.getSession(sessionId);
  if (!session) {
    logger.warn(`Terminal resize for non-existent session: ${sessionId}`);
    return;
  }

  try {
    terminalService.resizeSession(sessionId, cols, rows);
    logger.info(`Terminal session resized successfully: ${sessionId}`);
  } catch (error) {
    logger.error(`Failed to resize terminal session ${sessionId}:`, error);
  }
}

function handleDestroySession(sessionId, ws) {
  logger.info(`Destroying terminal session: ${sessionId}`);
  
  try {
    const destroyed = terminalService.destroySession(sessionId);
    
    if (destroyed) {
      ws.send(JSON.stringify({
        type: 'terminalAck',
        sessionId,
        action: 'destroyed',
        success: true,
        message: 'Terminal session destroyed successfully'
      }));
      logger.info(`Terminal session destroyed successfully: ${sessionId}`);
    } else {
      logger.warn(`Terminal session not found for destruction: ${sessionId}`);
      ws.send(JSON.stringify({
        type: 'terminalAck',
        sessionId,
        action: 'destroyed',
        success: false,
        message: 'Session not found'
      }));
    }
  } catch (error) {
    logger.error(`Failed to destroy terminal session ${sessionId}:`, error);
    sendErrorResponse(ws, sessionId, 'destroyed', error.message);
  }
}

function sendErrorResponse(ws, sessionId, action, errorMessage) {
  ws.send(JSON.stringify({
    type: 'terminalAck',
    sessionId,
    action,
    success: false,
    error: errorMessage
  }));
}

// Export handler and utility functions
module.exports = {
  handleTerminalAccess,
  
  // Utility functions for status checking
  getActiveSessionCount: () => terminalService.getSessionCount(),
  getSessionStats: () => terminalService.getStats(),
  listSessions: () => terminalService.listSessions(),
  cleanupSessions: () => terminalService.cleanup()
};