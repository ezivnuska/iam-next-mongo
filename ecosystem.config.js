// ecosystem.config.js
// pm2 process definitions — single process after Hono absorption.
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 start ecosystem.config.js --env development

module.exports = {
  apps: [
    {
      name: 'iam-app',
      script: 'npx',
      args: 'tsx server.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
  ],
}
