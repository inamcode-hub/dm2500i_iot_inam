#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load configuration from .env file
const REMOTE_HOST = process.env.DEPLOY_REMOTE_HOST || process.env.SSH_HOST || '192.168.8.245';
const REMOTE_USER = process.env.DEPLOY_REMOTE_USER || process.env.PGUSER || 'dmi';
const REMOTE_PASSWORD = process.env.DEPLOY_REMOTE_PASSWORD || process.env.SSH_PASSWORD || 'dmi';
const REMOTE_PATH = process.env.DEPLOY_REMOTE_PATH || '/home/dmi/dm520api';
const PM2_APP_NAME = process.env.DEPLOY_PM2_APP_NAME || 'app';

// Files to exclude from sync
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.env',
  '*.log',
  '.DS_Store',
  'deploy.js'
];

const LOCAL_DIR = './';  // Current directory

console.log('🚀 Starting embedded API deployment...');
console.log(`📋 Configuration:`);
console.log(`   Host: ${REMOTE_HOST}`);
console.log(`   User: ${REMOTE_USER}`);
console.log(`   Path: ${REMOTE_PATH}`);
console.log(`   PM2 App: ${PM2_APP_NAME}`);
console.log('');

// Check if package.json exists
if (!fs.existsSync('./package.json')) {
  console.error('❌ Error: package.json not found. Make sure you are in the API directory.');
  process.exit(1);
}

// Step 1: Build the UI
console.log('🏗️  Building UI...');
const UI_PATH = '../ui';
if (!fs.existsSync(UI_PATH)) {
  console.error('❌ Error: UI directory not found. Expected at ../ui');
  process.exit(1);
}

try {
  console.log('📦 Installing UI dependencies...');
  execSync('npm install', { cwd: UI_PATH, stdio: 'inherit' });
  
  console.log('🔨 Building UI for production...');
  execSync('npm run build', { cwd: UI_PATH, stdio: 'inherit' });
  
  console.log('📁 Copying UI build to API public folder...');
  // Remove existing public folder contents (except keep any API-specific files)
  const publicPath = './public';
  if (fs.existsSync(publicPath)) {
    const files = fs.readdirSync(publicPath);
    files.forEach(file => {
      if (file !== '.gitkeep') { // Keep .gitkeep if it exists
        const filePath = path.join(publicPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
    });
  } else {
    fs.mkdirSync(publicPath, { recursive: true });
  }
  
  // Copy UI dist contents to public
  execSync(`cp -r ${UI_PATH}/dist/* ${publicPath}/`, { stdio: 'inherit' });
  console.log('✅ UI build copied to public folder');
  
} catch (error) {
  console.error('❌ UI build failed:', error.message);
  process.exit(1);
}

// Check if sshpass is available
try {
  execSync('which sshpass', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ sshpass is not installed. Please install it first:');
  console.error('   Ubuntu/Debian: sudo apt-get install sshpass');
  console.error('   CentOS/RHEL: sudo yum install sshpass');
  console.error('   macOS: brew install hudochenkov/sshpass/sshpass');
  process.exit(1);
}

try {
  console.log('🚀 Step 2: Deploying to remote device...');
  
  // Create remote directory if it doesn't exist
  console.log('📁 Ensuring remote directory exists...');
  execSync(`sshpass -p '${REMOTE_PASSWORD}' ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${REMOTE_PATH}"`, { 
    stdio: 'inherit' 
  });
  
  // Copy files using rsync, excluding unnecessary files
  console.log('📤 Syncing API + UI files to remote device...');
  const excludeArgs = EXCLUDE_PATTERNS.map(pattern => `--exclude '${pattern}'`).join(' ');
  execSync(`sshpass -p '${REMOTE_PASSWORD}' rsync -avz --progress --delete \\
    ${excludeArgs} \\
    -e "ssh -o StrictHostKeyChecking=no" \\
    ${LOCAL_DIR} ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/`, { 
    stdio: 'inherit' 
  });
  
  // Install dependencies and restart service on remote
  console.log('📦 Installing API dependencies on remote device...');
  
  // First install dependencies
  execSync(`sshpass -p '${REMOTE_PASSWORD}' ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_PATH} && npm install --production"`, { 
    stdio: 'inherit' 
  });
  
  // Restart PM2 service using the direct NVM path
  console.log('🔄 Restarting PM2 service...');
  const PM2_PATH = '/home/dmi/.nvm/versions/node/v18.17.1/bin/pm2';
  const pm2Commands = [
    `cd ${REMOTE_PATH}`,
    'echo "Using PM2 from NVM installation..."',
    `echo "PM2 path: ${PM2_PATH}"`,
    `${PM2_PATH} --version`,
    'echo "Current PM2 status:"',
    `${PM2_PATH} list`,
    'echo "Stopping any existing app processes..."',
    `${PM2_PATH} stop ${PM2_APP_NAME} || echo "No existing process to stop"`,
    `${PM2_PATH} delete ${PM2_APP_NAME} || echo "No existing process to delete"`,
    'echo "Starting new PM2 process..."',
    `${PM2_PATH} start app.js --name "${PM2_APP_NAME}"`,
    `${PM2_PATH} save`,
    'echo "Final PM2 status:"',
    `${PM2_PATH} list`,
    'echo "✅ API service restarted successfully!"'
  ].join(' && ');
  
  execSync(`sshpass -p '${REMOTE_PASSWORD}' ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "${pm2Commands}"`, { 
    stdio: 'inherit' 
  });
  
  console.log('✅ Deployment successful!');
  console.log(`📍 API deployed to: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}`);
  console.log('🎯 Service restarted with PM2 as "app"');
  
  // Show PM2 status
  console.log('📊 Checking PM2 status...');
  execSync(`sshpass -p '${REMOTE_PASSWORD}' ssh -o StrictHostKeyChecking=no ${REMOTE_USER}@${REMOTE_HOST} "pm2 status"`, { 
    stdio: 'inherit' 
  });
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  console.error('');
  console.error('💡 Make sure:');
  console.error('   - The remote device is accessible');
  console.error('   - Username and password are correct');
  console.error('   - PM2 is installed on the remote device');
  console.error('   - You have permission to write to the remote directory');
  process.exit(1);
}