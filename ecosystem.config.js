module.exports = {
    apps: [{
        name: 'iam-app',
        script: 'server.js',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'production',
          PORT: 3000
        },
        error_file: '/home/eric/.pm2/logs/iam-error.log',
        out_file: '/home/eric/.pm2/logs/iam-out.log',
        time: true
    }]
}