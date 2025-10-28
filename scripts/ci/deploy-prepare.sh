#!/usr/bin/env bash
set -euo pipefail

# prepare a .deploy directory suitable for ZIP deployment (standalone Next + public + production deps)
# Usage: ./scripts/ci/deploy-prepare.sh

ROOT_DIR=$(pwd)
DEPLOY_DIR="$ROOT_DIR/.deploy"
ZIP_PATH="$ROOT_DIR/.deploy.zip"

echo "Workspace: $ROOT_DIR"

echo "1) Ensure dependencies and build"
npm ci
npm run build

echo "2) Prepare .deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# If standalone build exists, copy it
if [ -d ".next/standalone" ]; then
  echo "Copying .next/standalone -> .deploy"
  rsync -a .next/standalone/ "$DEPLOY_DIR/"
fi

# Copy public into .deploy/public to preserve static assets
if [ -d "public" ]; then
  echo "Copying public -> .deploy/public"
  rsync -a public/ "$DEPLOY_DIR/public/"
fi

# Copy package.json so production deps can be installed
cp -f package.json "$DEPLOY_DIR/package.json" || true

echo "3) Install production deps into .deploy (best-effort)"
# Use npm install in the .deploy to avoid strict lockfile requirements of npm ci
npm --prefix "$DEPLOY_DIR" install --omit=dev --no-audit --no-fund || true

echo "4) Run deploy checks"
node scripts/check-deploy.js "$DEPLOY_DIR"

echo "5) Pack .deploy -> .deploy.zip"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" "$DEPLOY_DIR" >/dev/null

echo "Done. Artifact: $ZIP_PATH"
exit 0
