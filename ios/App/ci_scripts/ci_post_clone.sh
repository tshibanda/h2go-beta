#!/bin/zsh
set -e

echo "Repository path: $CI_PRIMARY_REPOSITORY_PATH"

# Charger nvm pour avoir accès à node/npm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "Node version: $(node -v 2>/dev/null || echo 'node not found')"
echo "npm version: $(npm -v 2>/dev/null || echo 'npm not found')"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing npm dependencies..."
npm ci

echo "Syncing Capacitor iOS..."
npx cap sync ios

echo "Post-clone script finished successfully."