module.exports = {
  apps: [
    {
      name: 'dm2500i-iot-device',
      script: './index.js',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      kill_timeout: 5000,
      wait_ready: true,
      max_restarts: 10,
      min_uptime: '10s',
      cron_restart: '0 3 * * *', // Restart daily at 3 AM
      env: {
        NODE_ENV: 'development',
        PORT: 3003
      }
    }
  ],

  deploy: {
    production: {
      user: 'dmi',
      host: 'device',
      ref: 'origin/main',
      repo: 'git@github.com:your-repo/dm2500i.git',
      path: '/home/dmi/inam/software/2500i_iot',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};