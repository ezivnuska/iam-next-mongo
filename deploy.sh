  #!/bin/bash
  echo "🚀 Starting deployment..."

  cd /var/www/iameric.me/html/iam-next-mongo

  echo "📥 Pulling latest code..."
  git pull origin main

  echo "📦 Installing dependencies..."
  pnpm install

  echo "🔨 Building application..."
  NODE_OPTIONS="--max-old-space-size=1536" pnpm build

  echo "🔄 Restarting application..."
  pm2 restart iam-app

  echo "✅ Deployment complete!"
  pm2 logs iam-app --lines 20
