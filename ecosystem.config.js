// ecosystem.config.js
// pm2 process definitions.
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 start ecosystem.config.js --env development

module.exports = {
  apps: [
    {
      name: 'iam-app',
      script: 'server.js',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
    },
    {
      name: 'api-server',
      script: 'npx',
      args: 'tsx --tsconfig api/tsconfig.json api/index.ts',
      interpreter: 'none',
      env: {
        NODE_ENV: 'development',
        API_PORT: '3001',
      },
      env_production: {
        NODE_ENV: 'production',
        API_PORT: '3001',
      },
      max_memory_restart: '256M',
    },
  ],
}
