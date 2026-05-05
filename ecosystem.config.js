// PM2 — config para deploy en VPS (DigitalOcean, Hetzner, etc.)
// Uso:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup

module.exports = {
  apps: [
    {
      name: "vortex-ops",
      script: "index.js",
      instances: 1,               // Cambia a "max" para usar todos los CPUs
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "512M",
      env_file: ".env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logs
      out_file: "./logs/app.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
      // Restart policy
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],

  deploy: {
    production: {
      user: "root",
      host: ["TU_IP_DEL_VPS"],         // ← cambia por la IP de tu servidor
      ref: "origin/claude/ai-logistics-operations-KBVvA",
      repo: "git@github.com:bondedaircargo-dev/josue.git",
      path: "/var/www/vortex",
      "pre-deploy-local": "",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production && pm2 save",
      "pre-setup": "apt-get update && apt-get install -y git nodejs npm",
    },
  },
};
