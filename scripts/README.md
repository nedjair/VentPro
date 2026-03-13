# Scripts de Gestion Commerciale

Ce dossier contient tous les scripts utilitaires centralisés pour l'application de gestion commerciale.

## 🚀 Scripts Principaux

### `launch/start-application.js`
Point d'entrée centralisé pour le démarrage complet local.

Démarre l'application complète (Docker + Backend + Frontend).

```bash
# Depuis la racine du projet
node scripts/launch/start-application.js
# ou
pnpm start
```

### `launch/stop-application.js`
**Remplace:** `arreter-application.ps1`

Arrête tous les services et nettoie les processus.

```bash
# Depuis la racine du projet
node scripts/launch/stop-application.js
# ou
pnpm stop
```

### `launch/start-local-windows.bat`
Point d'entrée Windows centralisé pour le démarrage local.

```bat
REM Depuis la racine du projet
start-local-windows.bat
```

Le fichier racine `start-local-windows.bat` sert de point d'entrée Windows pratique
et redirige vers `scripts/launch/start-local-windows.bat`.

### `setup-development.js`
**Remplace:** `install-deps.ps1`, anciens scripts de setup

Configure l'environnement de développement complet.

```bash
# Depuis la racine du projet
node scripts/setup-development.js
# ou
pnpm setup
```

### `cleanup-old-scripts.js`
Script de nettoyage pour supprimer les anciens scripts éparpillés.

```bash
# À exécuter après avoir testé les nouveaux scripts
node scripts/cleanup-old-scripts.js
```

## 📁 Structure des Scripts

```
scripts/
├── README.md                    # Ce fichier
├── launch/                      # Scripts réels de lancement local
│   ├── start-application.js     # Démarrage complet
│   ├── stop-application.js      # Arrêt complet
│   └── start-local-windows.bat  # Point d'entrée Windows
├── setup-development.js         # Configuration initiale
├── cleanup-old-scripts.js       # Nettoyage des anciens scripts
├── tests/                       # Scripts de test déplacés
│   ├── test-login.js
│   ├── test-api-products-direct.js
│   └── ...
├── old-scripts-backup/          # Sauvegarde des anciens scripts
│   └── ...
└── MIGRATION_GUIDE.md          # Guide de migration
```

## 🔧 Scripts par Package

### Racine (`package.json`)
- `pnpm start` - Démarre l'application complète
- `pnpm stop` - Arrête l'application
- `pnpm setup` - Configuration initiale
- `pnpm dev` - Mode développement
- `pnpm build` - Build de production
- `pnpm test` - Tests globaux
- `pnpm lint` - Linting global
- `pnpm clean` - Nettoyage global

### Backend (`apps/backend/package.json`)
- `pnpm dev` - Serveur de développement avec hot reload
- `pnpm build` - Compilation TypeScript
- `pnpm start` - Serveur de production
- `pnpm start:prod` - Serveur de production avec NODE_ENV=production
- `pnpm clean` - Nettoyage des fichiers de build
- `pnpm prisma:*` - Commandes Prisma (generate, migrate, studio, etc.)
- `pnpm db:seed` - Seeding de la base de données
- `pnpm test` - Tests unitaires
- `pnpm lint` - Linting du code backend

### Frontend (`apps/frontend/package.json`)
- `pnpm dev` - Serveur Next.js de développement (port 3006)
- `pnpm dev:3005` - Serveur sur le port 3005
- `pnpm dev:3000` - Serveur sur le port 3000
- `pnpm build` - Build Next.js de production
- `pnpm start` - Serveur Next.js de production (port 3006)
- `pnpm start:prod` - Serveur de production (port 3000)
- `pnpm clean` - Nettoyage des fichiers Next.js
- `pnpm lint` - Linting du code frontend

## 🐳 Scripts Docker

### Depuis la racine
- `pnpm docker:up` - Démarre les conteneurs Docker
- `pnpm docker:down` - Arrête les conteneurs Docker
- `pnpm docker:logs` - Affiche les logs des conteneurs

### Scripts Docker spécialisés (conservés)
- `docker-monitor.ps1` - Monitoring des conteneurs
- `docker-performance-fix.ps1` - Optimisations de performance

## 🗄️ Scripts Base de Données

### Depuis la racine
- `pnpm prisma:generate` - Génère le client Prisma
- `pnpm prisma:migrate` - Applique les migrations
- `pnpm prisma:studio` - Ouvre Prisma Studio

### Depuis le backend
- `pnpm prisma:generate:safe` - Génération sécurisée du client
- `pnpm prisma:migrate` - Migrations de développement
- `pnpm prisma:deploy` - Déploiement des migrations
- `pnpm prisma:studio` - Interface d'administration
- `pnpm prisma:reset` - Reset complet de la base
- `pnpm db:seed` - Seeding général
- `pnpm db:seed:stocks` - Seeding des stocks

## 🧪 Scripts de Test

### Tests déplacés vers `scripts/tests/`
- `test-login.js` - Test de connexion API
- `test-api-products-direct.js` - Test API produits
- `test-frontend-api-connection.js` - Test connexion frontend-backend
- `simple-db-test.js` - Test simple de base de données

### Exécution des tests
```bash
# Tests backend
pnpm --filter @gestion/backend test

# Tests frontend (à implémenter)
pnpm --filter @gestion/frontend test

# Tests globaux
pnpm test
```

## 🔄 Migration depuis les Anciens Scripts

Consultez `MIGRATION_GUIDE.md` pour les équivalences entre anciens et nouveaux scripts.

### Exemples de migration courante

| Ancien Script | Nouveau Script |
|---------------|----------------|
| `demarrer-application.ps1` | `pnpm start` |
| `arreter-application.ps1` | `pnpm stop` |
| `install-deps.ps1` | `pnpm setup` |
| `restart-clean.bat` | `pnpm stop && pnpm start` |
| `sync-database-schema.ps1` | `pnpm prisma:migrate` |

## 🛠️ Développement des Scripts

### Conventions
- Scripts Node.js avec shebang `#!/usr/bin/env node`
- Gestion des couleurs pour les logs
- Gestion d'erreurs robuste
- Support multi-plateforme (Windows/Unix)
- Documentation intégrée

### Ajout d'un nouveau script
1. Créer le script dans `scripts/`
2. Ajouter le shebang et les imports nécessaires
3. Implémenter la logique avec gestion d'erreurs
4. Ajouter l'entrée dans `package.json` si nécessaire
5. Mettre à jour ce README

## 📝 Notes

- Tous les scripts sont compatibles Windows et Unix
- Les anciens scripts sont sauvegardés dans `old-scripts-backup/`
- Utilisez `pnpm` comme gestionnaire de packages principal
- Les scripts utilisent les couleurs pour une meilleure lisibilité
