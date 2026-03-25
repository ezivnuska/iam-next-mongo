  #!/bin/bash
  echo "🚀 Starting deployment..."

  cd /var/www/iameric.me/html/iam-next-mongo

  echo "📥 Pulling latest code..."
  git pull origin main

  echo "📦 Installing dependencies..."
  pnpm install

  echo "🧹 Cleaning build cache..."
  rm -rf .next

  echo "🔨 Building application..."
  NODE_ENV=production NODE_OPTIONS="--max-old-space-size=1536" pnpm build
  
  echo "🔄 Clearing Logs..."
  pm2 flush

  echo "🔄 Restarting application..."
  pm2 startOrRestart ecosystem.config.js --env production

  echo "✅ Deployment complete!"
  pm2 logs iam-app --lines 20
