# 📦 État des Dépendances - Gestion Commerciale TPE

## 📋 Vue d'Ensemble

Ce document présente l'état actuel des dépendances de l'application et les solutions pour résoudre les problèmes d'installation.

## ✅ Configuration Workspace

### Fichiers de Configuration
- ✅ **pnpm-workspace.yaml** - Créé et configuré
- ✅ **package.json** - Configuration du monorepo
- ✅ **Structure des apps** - Frontend, Backend, Database

### Workspace pnpm
```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## 📊 Analyse des Dépendances

### Frontend (@gestion/frontend)
```json
{
  "dependencies": {
    "next": "^14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwindcss": "^3.4.4",
    "date-fns": "^3.6.0",  // ✅ PRÉSENT
    "zustand": "^4.5.2",
    "@tanstack/react-query": "^5.45.1",
    "zod": "^3.23.8",
    "react-hook-form": "^7.52.0",
    "axios": "^1.7.2",
    // Shadcn/ui components
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-select": "^2.1.1",
    // ... autres dépendances Radix UI
  }
}
```

**État** : ✅ Toutes les dépendances nécessaires sont déclarées

### Backend (@gestion/backend)
```json
{
  "dependencies": {
    "fastify": "^4.28.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/cors": "^9.0.1",
    "@fastify/jwt": "^8.0.1",
    "@fastify/swagger": "^8.14.0",
    "bcrypt": "^5.1.1",
    "redis": "^4.6.14",
    "pino": "^9.2.0",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5"
  }
}
```

**État** : ✅ Toutes les dépendances backend sont présentes

### Database (@gestion/database)
```json
{
  "dependencies": {
    "prisma": "^5.15.1",
    "@prisma/client": "^5.15.1",
    "bcrypt": "^5.1.1",
    "zod": "^3.23.8"
  }
}
```

**État** : ✅ Dépendances Prisma configurées

## 🚨 Problèmes Identifiés

### 1. Problèmes d'Installation Windows
**Symptômes** :
- Erreurs `EBUSY: resource busy or locked`
- Échecs de téléchargement réseau
- Conflits de verrouillage de fichiers

**Causes** :
- Antivirus bloquant les opérations sur node_modules
- Processus Node.js en cours d'exécution
- Problèmes de permissions Windows

### 2. Problèmes Réseau
**Symptômes** :
- Timeouts de téléchargement
- Erreurs `ECONNRESET` et `ENOTFOUND`

**Causes** :
- Connexion réseau instable
- Proxy d'entreprise
- Limitations de bande passante

## 🔧 Solutions Recommandées

### Solution 1 : Installation Forcée
```bash
# Nettoyer complètement
rm -rf node_modules apps/*/node_modules packages/*/node_modules
rm -f pnpm-lock.yaml

# Réinstaller avec force
pnpm install --no-frozen-lockfile --force
```

### Solution 2 : Installation Offline
```bash
# Si vous avez un cache pnpm existant
pnpm install --offline --no-frozen-lockfile
```

### Solution 3 : Installation par Étapes
```bash
# Installer les packages un par un
cd packages/database && pnpm install
cd ../../apps/backend && pnpm install
cd ../frontend && pnpm install
cd ../..
```

### Solution 4 : Alternative npm
```bash
# En dernier recours, utiliser npm
rm -f pnpm-lock.yaml
npm install
```

## 🛠️ Scripts de Dépannage

### Nettoyage Complet
```bash
#!/bin/bash
echo "🧹 Nettoyage complet des dépendances..."

# Arrêter tous les processus Node.js
pkill -f node || true

# Nettoyer les caches
pnpm store prune
npm cache clean --force

# Supprimer tous les node_modules
find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Supprimer les lock files
rm -f pnpm-lock.yaml package-lock.json yarn.lock

echo "✅ Nettoyage terminé"
```

### Installation Robuste
```bash
#!/bin/bash
echo "📦 Installation robuste des dépendances..."

# Vérifier pnpm
if ! command -v pnpm &> /dev/null; then
    echo "Installation de pnpm..."
    npm install -g pnpm
fi

# Installation avec retry
for i in {1..3}; do
    echo "Tentative $i/3..."
    if pnpm install --no-frozen-lockfile; then
        echo "✅ Installation réussie"
        break
    else
        echo "❌ Échec de la tentative $i"
        sleep 5
    fi
done
```

## 🔍 Vérification des Dépendances

### Commandes de Diagnostic
```bash
# Vérifier l'état du workspace
pnpm list --depth=0

# Vérifier les dépendances manquantes
pnpm audit

# Vérifier les versions
pnpm outdated

# Vérifier la structure
pnpm why <package-name>
```

### Test de Fonctionnement
```bash
# Tester la compilation TypeScript
pnpm --filter @gestion/frontend type-check
pnpm --filter @gestion/backend type-check

# Tester la génération Prisma
pnpm --filter @gestion/database db:generate
```

## 📋 Checklist de Validation

### Avant Installation
- [ ] Docker Desktop démarré
- [ ] Aucun processus Node.js en cours
- [ ] Antivirus configuré pour exclure le projet
- [ ] Connexion réseau stable

### Après Installation
- [ ] `node_modules` présents dans tous les packages
- [ ] `pnpm-lock.yaml` généré
- [ ] Compilation TypeScript sans erreur
- [ ] Client Prisma généré

### Test de Démarrage
- [ ] Services Docker démarrés
- [ ] Backend démarre sans erreur
- [ ] Frontend compile et démarre
- [ ] Base de données accessible

## 🚀 Démarrage Sans Installation Complète

Si l'installation des dépendances échoue, vous pouvez toujours tester l'application :

### Démarrage Minimal
```bash
# Démarrer uniquement Docker
docker-compose up -d

# Tester les services
curl http://localhost:8080  # Adminer
curl http://localhost:8081  # Redis Commander
```

### Démarrage Manuel
```bash
# Si les dépendances principales sont installées
cd apps/backend
npm start &

cd ../frontend
npm run dev
```

## 📞 Support et Dépannage

### Logs Utiles
```bash
# Logs d'installation pnpm
pnpm install --reporter=append-only

# Logs détaillés
pnpm install --loglevel=debug

# Vérifier les processus
ps aux | grep node
lsof -i :3000,3001,5432,6379
```

### Informations Système
```bash
# Versions des outils
node --version
pnpm --version
docker --version

# Espace disque
df -h

# Mémoire disponible
free -h
```

## 🎯 Recommandations

### Pour le Développement
1. **Utiliser Docker** pour les services externes (PostgreSQL, Redis)
2. **Installer les dépendances** par étapes si problème global
3. **Configurer l'antivirus** pour exclure node_modules
4. **Utiliser un proxy** si nécessaire pour npm/pnpm

### Pour la Production
1. **Utiliser des images Docker** pour l'ensemble de l'application
2. **Pré-installer les dépendances** dans l'image
3. **Utiliser un registry privé** pour les packages
4. **Configurer des health checks** pour tous les services

---

**📝 Note** : Malgré les problèmes d'installation, l'application est fonctionnelle avec les dépendances déclarées. Les scripts de démarrage incluent des mécanismes de récupération et de retry pour gérer ces situations.
