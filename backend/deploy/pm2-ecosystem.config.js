module.exports = {
  apps: [
    {
      name: 'elsewedy-backend',
      script: 'server.js',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
        HOST: 'localhost'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOST: '0.0.0.0',
        DB_PATH: './database/attendance.db',
        JWT_SECRET: process.env.JWT_SECRET || 'your-production-secret-key',
        JWT_EXPIRES_IN: '24h',
        // ZKTeco Device Configuration
        ZK_DEVICE_IP: process.env.ZK_DEVICE_IP || '192.168.1.100',
        ZK_DEVICE_PORT: process.env.ZK_DEVICE_PORT || '4370',
        ZK_DEVICE_PASSWORD: process.env.ZK_DEVICE_PASSWORD || '0',
        XFACE_DEVICE_IP: process.env.XFACE_DEVICE_IP || '192.168.1.101',
        XFACE_DEVICE_PORT: process.env.XFACE_DEVICE_PORT || '4370',
        XFACE_DEVICE_PASSWORD: process.env.XFACE_DEVICE_PASSWORD || '0',
        // Attendance Settings
        WORK_START_TIME: '08:00',
        WORK_END_TIME: '17:00',
        LATE_THRESHOLD_MINUTES: 15,
        OVERTIME_THRESHOLD_MINUTES: 30,
        // Logging
        LOG_LEVEL: 'info',
        LOG_FILE: './logs/app.log',
        // CORS
        CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5175'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Health monitoring
      health_check_grace_period: 3000,
      // Advanced PM2 features
      increment_var: 'PORT',
      // Auto restart on file changes (development only)
      watch: process.env.NODE_ENV === 'development' ? ['server.js', 'routes', 'models', 'services'] : false,
      ignore_watch: ['node_modules', 'logs', 'database', 'exports'],
      // Process management
      exec_mode: 'fork', // Use 'cluster' for multiple instances if needed
      node_args: '--max-old-space-size=1024',
      // Environment specific settings
      source_map_support: true,
      // Logging configuration
      combine_logs: true,
      // Error handling
      exp_backoff_restart_delay: 100,
      // Memory management
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'your-git-repository',
      path: '/var/www/elsewedy-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
