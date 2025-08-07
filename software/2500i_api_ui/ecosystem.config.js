module.exports = {
  apps: [{
    name: 'dm2500i-api',
    script: './app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // Graceful shutdown
    kill_timeout: 5000,
    listen_timeout: 3000,
    // Restart on failure
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // CPU and memory monitoring
    monitoring: true,
    // Merge logs
    merge_logs: true,
    // Log date format
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};