const { exec } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'production' 
  ? '.env.production' 
  : '.env.development';

dotenv.config({ path: path.join(__dirname, '../../', envFile) });

let sshProcess = null;

async function createSSHTunnel() {
  if (process.env.NODE_ENV === 'production' || !process.env.SSH_HOST) {
    console.log('SSH tunnel not needed in production or SSH_HOST not configured');
    return null;
  }

  return new Promise((resolve, reject) => {
    const sshCommand = `sshpass -p ${process.env.SSH_PASSWORD} ssh -o StrictHostKeyChecking=no -L 5432:localhost:5432 -N dmi@${process.env.SSH_HOST}`;
    
    console.log('Creating SSH tunnel to', process.env.SSH_HOST);
    
    sshProcess = exec(sshCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('SSH tunnel error:', error);
        reject(error);
      }
    });

    // Give the tunnel time to establish
    setTimeout(() => {
      console.log('SSH tunnel established');
      resolve(sshProcess);
    }, 2000);
  });
}

async function closeSSHTunnel() {
  if (sshProcess) {
    console.log('Closing SSH tunnel');
    sshProcess.kill();
    sshProcess = null;
  }
}

module.exports = {
  createSSHTunnel,
  closeSSHTunnel
};