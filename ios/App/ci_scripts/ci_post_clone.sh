#!/bin/sh
set -e

echo "Installing npm dependencies..."

# Aller à la racine du repo (où se trouve package.json)
cd "$CI_WORKSPACE/repository" || cd ../../..

# Installer Node si besoin (Xcode Cloud a Node préinstallé via nvm/brew selon l'image)
npm ci

echo "npm install done, syncing Capacitor..."

# Optionnel mais recommandé : s'assurer que les plateformes natives sont synchronisées
npx cap sync ios

echo "Post-clone script finished."