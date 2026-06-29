#!/bin/zsh
set -e

echo "Repository path: $CI_PRIMARY_REPOSITORY_PATH"

echo "Installing Node via Homebrew..."
brew install node

echo "Node version: $(node -v)"
echo "npm version: $(npm -v)"

cd "$CI_PRIMARY_REPOSITORY_PATH"

echo "Installing npm dependencies..."
npm ci --legacy-peer-deps

echo "Syncing Capacitor iOS..."
npx cap sync ios

echo "Post-clone script finished successfully."