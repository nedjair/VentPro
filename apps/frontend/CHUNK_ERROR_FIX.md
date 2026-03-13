
INSTRUCTIONS POUR CORRIGER L'ERREUR DE CHUNKS:

1. 🛑 Arrêter le serveur de développement (Ctrl+C)

2. 🧹 Nettoyer complètement:
   npm run clean (si disponible) ou:
   rm -rf .next
   rm -rf node_modules/.cache

3. 🔄 Redémarrer proprement:
   npm run dev

4. 🛡️ Si le problème persiste, utiliser le script de redémarrage:
   ./restart-clean.sh
   ou sur Windows:
   npm run dev

5. 📦 Si le problème continue, réinstaller les dépendances:
   ./restart-clean.sh --reinstall
   ou manuellement:
   rm -rf node_modules
   rm package-lock.json
   npm install
   npm run dev

6. 🔧 Intégrer le composant d'erreur dans layout.tsx:
   Envelopper {children} avec <ChunkErrorBoundary>

CAUSES POSSIBLES:
- Cache Next.js corrompu
- Conflit de versions de dépendances
- Configuration webpack problématique
- Processus Node.js zombie
- Problème de réseau/timeout

PRÉVENTION:
- Redémarrer régulièrement le serveur de développement
- Nettoyer les caches après les mises à jour
- Éviter les modifications de configuration webpack complexes
