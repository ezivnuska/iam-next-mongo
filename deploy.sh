#!/bin/bash
set -e
echo "Starting deployment..."

cd /var/www/iameric.me/html/iam-next-mongo

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
pnpm install

# Wipe the build cache only when deps or Next.js config changed, or when
# --clean is passed. Code-only changes (API routes, components) can reuse
# the incremental cache for a significantly faster build.
CHANGED=$(git diff HEAD@{1} HEAD --name-only 2>/dev/null || echo "")
NEEDS_CLEAN=$(echo "$CHANGED" | grep -cE "^(pnpm-lock\.yaml|package\.json|next\.config)" || true)

if [ "$NEEDS_CLEAN" -gt "0" ] || [ "$1" = "--clean" ]; then
  echo "Cleaning build cache (deps or config changed)..."
  rm -rf .next
else
  echo "Skipping cache clean (code-only change — incremental build)..."
fi

echo "Building application..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=1536" pnpm build

echo "Clearing logs..."
pm2 flush

echo "Restarting application..."
pm2 delete iam-app 2>/dev/null || true
pm2 start ecosystem.config.js --env production

echo "Deployment complete!"
pm2 logs iam-app --lines 20
