/**
 * PM2 — run from Backend directory:
 *   cd /path/to/ASI24/Backend && pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: "asi24-backend",
      cwd: __dirname,
      script: "src/server.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
