#!/bin/bash
set -e
echo "Starting deployment..."

cd /var/www/iameric.me/html/iam-next-mongo

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
pnpm install

# Detect what changed since the last deploy
CHANGED=$(git diff HEAD@{1} HEAD --name-only 2>/dev/null || echo "")

# Check if any non-API file changed (frontend, config, dependencies)
NEEDS_FRONTEND_BUILD=$(echo "$CHANGED" | grep -cvE "^api/" || true)

# Check if deps or Next.js config changed (warrants a cache wipe)
NEEDS_CLEAN=$(echo "$CHANGED" | grep -cE "^(pnpm-lock\.yaml|package\.json|next\.config)" || true)

if [ "$NEEDS_FRONTEND_BUILD" -gt "0" ] || [ "$1" = "--full" ]; then
  # Frontend or config changed — full Next.js build required
  if [ "$NEEDS_CLEAN" -gt "0" ] || [ "$1" = "--clean" ]; then
    echo "Cleaning build cache (deps or config changed)..."
    rm -rf .next
  else
    echo "Skipping cache clean (code-only change — incremental build)..."
  fi

  echo "Building Next.js application..."
  NODE_ENV=production NODE_OPTIONS="--max-old-space-size=1536" pnpm build

  echo "Clearing logs..."
  pm2 flush

  echo "Restarting all processes..."
  pm2 delete iam-app 2>/dev/null || true
  pm2 delete api-server 2>/dev/null || true
  pm2 start ecosystem.config.js --env production

  echo "Deployment complete (full build)!"
  pm2 logs iam-app --lines 20
else
  # Only api/** changed — skip pnpm build, just restart the Hono API server
  echo "Only api/** changed — skipping Next.js build..."

  echo "Clearing logs..."
  pm2 flush

  echo "Restarting API server only..."
  pm2 restart api-server || pm2 start ecosystem.config.js --only api-server --env production

  echo "Deployment complete (API-only restart)!"
  pm2 logs api-server --lines 20
fi
