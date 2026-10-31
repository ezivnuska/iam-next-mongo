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
          AUTH_URL: 'https://staging.iameric.me',
          NEXTAUTH_URL: 'https://staging.iameric.me',
          NEXT_PUBLIC_APP_URL: 'https://staging.iameric.me',
          NEXT_PUBLIC_BASE_URL: 'https://staging.iameric.me',
        },
        env_production: {
          NODE_ENV: 'production',
          APP_ENV: 'staging',
          PORT: 3001,
          AUTH_URL: 'https://staging.iameric.me',
          NEXTAUTH_URL: 'https://staging.iameric.me',
          NEXT_PUBLIC_APP_URL: 'https://staging.iameric.me',
          NEXT_PUBLIC_BASE_URL: 'https://staging.iameric.me',
        },
        max_memory_restart: '512M',
      },
    ],
}