#!/bin/bash
set -e

# Usage: ./deploy.sh [--branch <branch>] [--env <env>] [--clean]
#   --branch  git branch to deploy (default: main)
#   --env     PM2 environment (default: production; use 'staging' for staging)
#   --clean   force wipe of .next build cache

BRANCH="main"
ENV="production"
FORCE_CLEAN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --branch) BRANCH="$2"; shift 2 ;;
    --env)    ENV="$2";    shift 2 ;;
    --clean)  FORCE_CLEAN=true; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Select ecosystem config and app name based on environment
if [ "$ENV" = "staging" ]; then
  ECOSYSTEM="ecosystem.staging.config.js"
  APP_NAME="iam-staging"
else
  ECOSYSTEM="ecosystem.config.js"
  APP_NAME="iam-app"
fi

echo "Deploying branch '$BRANCH' with env '$ENV' (app: $APP_NAME)..."

cd /var/www/iameric.me/html/iam-next-mongo

echo "Pulling latest code..."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "Installing dependencies..."
pnpm install

# Detect what changed since the last deploy
CHANGED=$(git diff HEAD@{1} HEAD --name-only 2>/dev/null || echo "all")

# Check if deps or Next.js config changed (warrants a cache wipe)
NEEDS_CLEAN=$(echo "$CHANGED" | grep -cE "^(pnpm-lock\.yaml|package\.json|next\.config)" || true)

if [ "$NEEDS_CLEAN" -gt "0" ] || [ "$FORCE_CLEAN" = "true" ]; then
  echo "Cleaning build cache (deps or config changed)..."
  rm -rf .next
else
  echo "Skipping cache clean (incremental build)..."
fi

echo "Building Next.js application..."
NODE_ENV=production NODE_OPTIONS="--max-old-space-size=1536" pnpm build

echo "Clearing logs..."
pm2 flush

echo "Restarting server..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start "$ECOSYSTEM" --env "$ENV"

echo "Deployment complete!"
pm2 logs "$APP_NAME" --lines 20
