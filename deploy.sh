#!/bin/bash
set -e
echo "Starting staging deployment..."

cd /var/www/staging.iameric.me/iam-next-mongo

echo "Pulling latest code..."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
git pull origin staging

echo "Installing dependencies..."
pnpm install

CHANGED=$(git diff HEAD@{1} HEAD --name-only 2>/dev/null || echo "all")
NEEDS_CLEAN=$(echo "$CHANGED" | grep -cE "^(pnpm-lock\.yaml|package\.json|next\.config)" || true)

if [ "$NEEDS_CLEAN" -gt "0" ] || [ "$1" = "--clean" ]; then
echo "Cleaning build cache..."
rm -rf .next
else
echo "Skipping cache clean (incremental build)..."
fi

echo "Building Next.js application..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=1536" pnpm build

echo "Clearing logs..."
pm2 flush

echo "Restarting server..."
pm2 delete iam-staging 2>/dev/null || true
pm2 start ecosystem.staging.config.js --env production

echo "Staging deployment complete!"
pm2 logs iam-staging --lines 20