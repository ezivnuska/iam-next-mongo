module.exports = {
    apps: [
      {
        name: 'iam-staging',
        script: 'npx',
        args: 'tsx server.ts',
        interpreter: 'none',
        env: {
          NODE_ENV: 'development',
          PORT: 3001,
        },
        env_staging: {
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          PORT: 3001,
        },
        env_production: {
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          PORT: 3001,
        },
        max_memory_restart: '512M',
      },
    ],
}