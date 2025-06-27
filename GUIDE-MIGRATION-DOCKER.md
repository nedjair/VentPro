# Guide de Migration vers Docker Production

## 🎯 Objectif
Migrer votre ancienne solution (Frontend-NextJS-production + Backend) vers une architecture Docker complète pour la production.

## 🚀 Démarrage rapide (Recommandé)

### Option 1: Migration complète automatique
```powershell
# Migration + Corrections + Démarrage en une seule commande
.\launch-production-complete.ps1 -Migrate -Force -CleanAll
```

### Option 2: Étape par étape
```powershell
# 1. Migration des fichiers
.\migrate-to-docker-production.ps1

# 2. Corrections Docker
.\fix-docker-production.ps1

# 3. Démarrage
.\scripts\start-production.ps1 -Build -Detached
```

## 📋 Ce qui est migré automatiquement

### Frontend (frontend-nextjs-production → apps/frontend)
- ✅ Code source NextJS (src/, public/)
- ✅ Configuration (package.json, next.config.mjs, tailwind.config.ts)
- ✅ Dockerfile optimisé pour NextJS
- ✅ Configuration standalone pour Docker

### Backend (production-backend.js → apps/backend)
- ✅ Conversion en TypeScript moderne
- ✅ Structure modulaire (routes, middleware, services)
- ✅ Configuration Fastify + Prisma
- ✅ Dockerfile multi-stage

### Configuration
- ✅ Variables d'environnement adaptées
- ✅ Docker Compose pour production
- ✅ Workspace pnpm configuré
- ✅ Scripts de démarrage/arrêt

## 🔧 Corrections automatiques appliquées

### Dockerfiles
- Configuration Next.js standalone
- Multi-stage builds optimisés
- Users non-root pour la sécurité
- Health checks configurés

### Variables d'environnement
- URLs corrigées pour Docker
- CORS configuré correctement
- Ports standardisés (3000/3001)

### Packages
- Noms de packages standardisés
- Dépendances mises à jour
- Scripts adaptés pour Docker

## 📁 Structure après migration

```
d:/Gestion Commerciale/
├── apps/
│   ├── frontend/          # Application Next.js
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── next.config.mjs
│   └── backend/           # API Fastify
│       ├── src/
│       ├── Dockerfile
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── shared/            # Types et utilitaires partagés
│   └── database/          # Configuration Prisma
├── docker-compose.prod.yml
├── .env.production
└── scripts/               # Scripts de gestion
```

## 🎛️ Commandes disponibles après migration

### Démarrage/Arrêt
```powershell
# Démarrage complet
.\scripts\start-production.ps1 -Build -Detached

# Arrêt
docker-compose -f docker-compose.prod.yml down

# Redémarrage
docker-compose -f docker-compose.prod.yml restart
```

### Développement
```powershell
# Mode développement
pnpm dev

# Build manuel
pnpm run build:all

# Tests
pnpm test
```

### Maintenance
```powershell
# Logs
docker-compose -f docker-compose.prod.yml logs -f

# État des services
docker-compose -f docker-compose.prod.yml ps

# Nettoyage
.\fix-docker-production.ps1 -Force
```

## 🌐 URLs après migration

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Documentation API:** http://localhost:3001/docs
- **Health Check:** http://localhost:3001/health

## ⚠️ Points importants

### Différences avec l'ancienne solution
1. **Ports standardisés:** 3000 (Frontend) / 3001 (Backend)
2. **Architecture conteneurisée:** Isolation complète des services
3. **Configuration centralisée:** Tout dans `.env.production`
4. **Builds optimisés:** Images Docker multi-stage

### Ce qui est conservé
- Toutes vos données et fonctionnalités
- Configuration de base de données
- Logique métier
- Interface utilisateur

## 🔧 Dépannage

### Problèmes courants après migration

#### 1. Conteneurs ne démarrent pas
```powershell
# Vérifier Docker
docker --version
docker-compose --version

# Nettoyer et relancer
.\launch-production-complete.ps1 -Force -CleanAll
```

#### 2. Ports occupés
```powershell
# Vérifier les ports
netstat -an | findstr "3000\|3001"

# Arrêter les anciens processus
Get-Process -Name "node" | Stop-Process -Force
```

#### 3. Erreurs de build
```powershell
# Nettoyage complet
Remove-Item -Recurse -Force node_modules, apps/*/node_modules
pnpm install
.\scripts\build-production.ps1 -Clean
```

#### 4. Base de données
```powershell
# Réinitialiser la DB
.\fix-docker-production.ps1 -ResetDB

# Vérifier la connexion
docker exec -it gestion-postgres-prod psql -U gestion_user -d gestion_commerciale
```

### Commandes de diagnostic
```powershell
# État général
docker ps -a

# Logs détaillés
docker-compose -f docker-compose.prod.yml logs --tail=100

# Ressources système
docker stats

# Test des endpoints
curl http://localhost:3001/health
curl http://localhost:3000
```

## 📚 Scripts disponibles

### Scripts de migration
- `migrate-to-docker-production.ps1` - Migration complète
- `fix-docker-production.ps1` - Corrections Docker
- `launch-production-complete.ps1` - Lancement complet

### Scripts de test
- `test-corrected-app.ps1` - Test après corrections
- `start-migrated-app.ps1` - Démarrage rapide après migration

### Scripts existants
- `scripts/start-production.ps1` - Démarrage production
- `scripts/build-production.ps1` - Build production
- `scripts/setup-database.ps1` - Configuration DB

## 🔄 Processus de rollback (si nécessaire)

Si vous devez revenir à l'ancienne solution :

1. **Arrêter Docker:**
   ```powershell
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Restaurer depuis backup:**
   ```powershell
   # Les anciens fichiers sont dans backup-old-config-*
   # Restaurer manuellement si nécessaire
   ```

3. **Redémarrer l'ancienne solution:**
   ```powershell
   # Utiliser vos anciens scripts de démarrage
   ```

## ✅ Validation post-migration

### Checklist de vérification
- [ ] Frontend accessible sur http://localhost:3000
- [ ] Backend API répond sur http://localhost:3001
- [ ] Documentation API disponible
- [ ] Connexion base de données OK
- [ ] Toutes les fonctionnalités testées
- [ ] Logs sans erreurs critiques

### Tests recommandés
1. **Connexion utilisateur**
2. **CRUD clients/produits**
3. **Génération factures/devis**
4. **Exports PDF/Excel**
5. **Analytics et rapports**

## 🎯 Avantages de la nouvelle architecture

### Production
- **Isolation:** Chaque service dans son conteneur
- **Scalabilité:** Facilité d'ajout de replicas
- **Monitoring:** Health checks intégrés
- **Déploiement:** Build reproductibles

### Développement
- **Environnement standardisé:** Même config pour tous
- **Hot reload:** Développement en temps réel
- **Tests:** Isolation des composants
- **CI/CD:** Intégration continue facilitée

### Maintenance
- **Backup:** Volumes Docker persistants
- **Logs:** Centralisés et structurés
- **Mises à jour:** Rolling updates possibles
- **Monitoring:** Métriques intégrées

---

## 📞 Support

En cas de problème :
1. Consultez les logs Docker
2. Vérifiez la configuration `.env.production`
3. Utilisez les scripts de diagnostic
4. Référez-vous à `PRODUCTION.md` pour plus de détails

**La migration préserve toutes vos données et fonctionnalités tout en modernisant l'infrastructure !**