const { spawn } = require('child_process');
const logger = require('../utils/logger');
require('dotenv').config();

let sshProcess = null;

/**
 * Create SSH tunnel for development database access
 */
async function createSSHTunnel() {
  if (process.env.NODE_ENV === 'production' || !process.env.SSH_HOST) {
    logger.info('[SSH Tunnel] Not needed in production or SSH_HOST not configured');
    return null;
  }

  if (sshProcess) {
    logger.info('[SSH Tunnel] SSH tunnel already active');
    return sshProcess;
  }

  return new Promise((resolve, reject) => {
    const sshHost = process.env.SSH_HOST;
    const sshPassword = process.env.SSH_PASSWORD || 'dmi';
    const dbUser = process.env.DB_USER || 'dmi';
    const tunnelPort = process.env.SSH_TUNNEL_PORT || '5433';
    
    // Check if sshpass is available
    let useSshpass = true;
    try {
      require('child_process').execSync('which sshpass', { stdio: 'ignore' });
      logger.debug('[SSH Tunnel] Using sshpass for SSH tunnel...');
    } catch (error) {
      logger.debug('[SSH Tunnel] sshpass not found, using regular ssh...');
      useSshpass = false;
    }
    
    let sshArgs;
    if (useSshpass) {
      sshArgs = [
        '-p', sshPassword,
        'ssh',
        '-L', `${tunnelPort}:localhost:5432`,
        '-N',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'ServerAliveInterval=60',
        '-o', 'ServerAliveCountMax=3',
        `${dbUser}@${sshHost}`
      ];
      sshProcess = spawn('sshpass', sshArgs);
    } else {
      sshArgs = [
        '-L', `${tunnelPort}:localhost:5432`,
        '-N',
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null',
        '-o', 'ServerAliveInterval=60',
        '-o', 'ServerAliveCountMax=3',
        `${dbUser}@${sshHost}`
      ];
      sshProcess = spawn('ssh', sshArgs);
    }

    logger.info(`[SSH Tunnel] Creating tunnel to ${sshHost} (local port: ${tunnelPort})`);

    sshProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      // Only log important messages, not verbose SSH output
      if (message.includes('Warning') || message.includes('Error')) {
        logger.debug(`[SSH Tunnel] SSH stderr: ${message.trim()}`);
      }
    });

    sshProcess.on('close', (code) => {
      logger.warn(`[SSH Tunnel] SSH tunnel closed with code ${code}`);
      sshProcess = null;
    });

    sshProcess.on('error', (error) => {
      logger.error('[SSH Tunnel] SSH tunnel error:', error);
      sshProcess = null;
      reject(error);
    });

    // Give the tunnel time to establish
    setTimeout(() => {
      logger.info('[SSH Tunnel] SSH tunnel established');
      resolve(sshProcess);
    }, 3000);
  });
}

/**
 * Close SSH tunnel
 */
async function closeSSHTunnel() {
  if (sshProcess) {
    logger.info('[SSH Tunnel] Closing SSH tunnel');
    sshProcess.kill();
    sshProcess = null;
  }
}

/**
 * Check if SSH tunnel is active
 */
function isTunnelActive() {
  return sshProcess !== null;
}

/**
 * Get SSH tunnel status
 */
function getTunnelStatus() {
  return {
    active: isTunnelActive(),
    host: process.env.SSH_HOST,
    port: process.env.SSH_TUNNEL_PORT || '5433'
  };
}

module.exports = {
  createSSHTunnel,
  closeSSHTunnel,
  isTunnelActive,
  getTunnelStatus
};