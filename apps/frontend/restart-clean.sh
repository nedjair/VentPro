#!/bin/bash
echo "🔄 Redémarrage propre de l'application Next.js..."

# Arrêter tous les processus Node.js
echo "🛑 Arrêt des processus existants..."
pkill -f "next" || true
pkill -f "node.*3002" || true

# Nettoyer les caches
echo "🧹 Nettoyage des caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .next/cache

# Réinstaller les dépendances si nécessaire
if [ "$1" = "--reinstall" ]; then
  echo "📦 Réinstallation des dépendances..."
  rm -rf node_modules
  rm -f package-lock.json
  npm install
fi

# Redémarrer l'application
echo "🚀 Redémarrage de l'application..."
npm run dev

echo "✅ Redémarrage terminé"
