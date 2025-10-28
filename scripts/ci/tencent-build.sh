#!/usr/bin/env bash
set -euo pipefail

# Tencent Cloud CI build helper (Linux)
# Steps:
# 1. Install full deps
# 2. Build Next
# 3. Prepare .deploy minimal artifact
# 4. Install production deps into .deploy
# 5. Run deploy checks
# 6. Zip .deploy for upload

ROOT_DIR=$(pwd)
DEPLOY_DIR="$ROOT_DIR/.deploy"
ZIP_PATH="$ROOT_DIR/.deploy.zip"

echo "Workspace: $ROOT_DIR"

echo "1) Install full dependencies"
npm ci

echo "2) Build Next"
npm run build

echo "3) Prepare .deploy"
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# If standalone build exists, copy it
if [ -d ".next/standalone" ]; then
  echo "Copying .next/standalone -> .deploy"
  rsync -a .next/standalone/ "$DEPLOY_DIR/"
fi

# Copy public and package.json
cp -a public "$DEPLOY_DIR/" || true
cp -f package.json "$DEPLOY_DIR/package.json" || true

echo "4) Install production deps into .deploy"
# Use npm to install production dependencies in .deploy
npm --prefix "$DEPLOY_DIR" ci --production

echo "5) Run deploy checks"
node scripts/check-deploy.js "$DEPLOY_DIR"

echo "6) Pack .deploy -> .deploy.zip"
rm -f "$ZIP_PATH"
zip -r "$ZIP_PATH" "$DEPLOY_DIR" >/dev/null

echo "Done. Artifact: $ZIP_PATH"
exit 0
