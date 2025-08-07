const logger = require('@utils/logger');
const { enqueue } = require('./outgoingQueue');
const { isSocketConnected } = require('./connectionState');

class WSClientWrapper {
  constructor() {
    this.socket = null;
  }

  /**
   * Set the WebSocket instance
   */
  setSocket(socket) {
    this.socket = socket;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected() {
    return isSocketConnected() && this.socket && this.socket.readyState === 1;
  }

  /**
   * Send a message through WebSocket
   */
  async send(message) {
    try {
      const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
      
      if (this.isConnected()) {
        this.socket.send(msgStr);
        logger.debug('[WSClientWrapper] Message sent directly');
      } else {
        // Queue the message for later delivery
        enqueue(message);
        logger.debug('[WSClientWrapper] Message queued for later delivery');
      }
      
      return true;
    } catch (error) {
      logger.error('[WSClientWrapper] Error sending message:', error);
      
      // Try to queue the message
      try {
        enqueue(message);
        logger.debug('[WSClientWrapper] Failed message queued');
      } catch (queueError) {
        logger.error('[WSClientWrapper] Failed to queue message:', queueError);
      }
      
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      connected: this.isConnected(),
      readyState: this.socket?.readyState,
      url: this.socket?.url
    };
  }
}

// Export singleton instance
module.exports = new WSClientWrapper();