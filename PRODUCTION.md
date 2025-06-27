# Guide de Déploiement en Production

## 🚀 Démarrage rapide

### Prérequis
- Docker et Docker Compose installés
- Git
- Node.js 18+ (pour le développement)
- PowerShell (pour les scripts Windows)

### Démarrage en une commande
```powershell
# Build et démarrage complet
.\scripts\start-production.ps1 -Build -Detached

# Accès aux applications
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Documentation API: http://localhost:3001/docs
```

## 📋 Étapes détaillées

### 1. Préparation de l'environnement

```powershell
# Clone du projet
git clone <repository-url>
cd "Gestion Commerciale"

# Configuration des variables d'environnement
cp .env.production.example .env.production
# Éditez .env.production avec vos valeurs

# Installation des dépendances
pnpm install
```

### 2. Build des applications

```powershell
# Build automatique
.\scripts\build-production.ps1 -Clean

# Ou build manuel
pnpm --filter "@gestion/shared" build
pnpm --filter "backend" build  
pnpm --filter "frontend" build
```

### 3. Démarrage des services

```powershell
# Démarrage complet avec build
.\scripts\start-production.ps1 -Build -Detached

# Ou avec Docker Compose directement
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### 4. Configuration de la base de données

```powershell
# Attendre que PostgreSQL soit prêt puis configurer
.\scripts\setup-database.ps1 -Reset -Seed

# Ou manuellement
cd packages/database
pnpm prisma migrate deploy
pnpm prisma db seed
```

## 🏗️ Architecture de production

### Services Docker
- **PostgreSQL 16** : Base de données principale (port 5432)
- **PgBouncer** : Pool de connexions (port 6432)  
- **Redis 7** : Cache et sessions (port 6379)
- **Backend API** : API Fastify (port 3001)
- **Frontend** : Application Next.js (port 3000)
- **Nginx** : Reverse proxy et load balancer (ports 80/443)

### Réseau et volumes
- **Réseau** : `gestion-network-prod` (172.21.0.0/16)
- **Volumes persistants** :
  - `postgres_prod_data` : Données PostgreSQL
  - `redis_prod_data` : Données Redis
  - `uploads_prod_data` : Fichiers uploadés

## ⚙️ Configuration

### Variables d'environnement importantes

#### Base de données
```env
POSTGRES_DB=gestion_commerciale
POSTGRES_USER=gestion_user
POSTGRES_PASSWORD=<mot-de-passe-fort>
DATABASE_URL=postgresql://user:pass@pgbouncer:5432/db
DIRECT_DATABASE_URL=postgresql://user:pass@postgres:5432/db
```

#### Sécurité
```env
JWT_SECRET=<clé-jwt-sécurisée-32-caractères-minimum>
JWT_REFRESH_SECRET=<clé-refresh-sécurisée-32-caractères-minimum>
REDIS_PASSWORD=<mot-de-passe-redis-fort>
```

#### URLs et CORS
```env
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3000
```

## 🔧 Commandes de gestion

### Démarrage/Arrêt
```powershell
# Démarrer tous les services
.\scripts\start-production.ps1 -Detached

# Démarrer un service spécifique
.\scripts\start-production.ps1 -Service backend

# Arrêter tous les services
docker-compose -f docker-compose.prod.yml down

# Arrêter et supprimer les volumes
docker-compose -f docker-compose.prod.yml down -v
```

### Logs et monitoring
```powershell
# Voir tous les logs
docker-compose -f docker-compose.prod.yml logs -f

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f backend

# Status des services
docker-compose -f docker-compose.prod.yml ps
```

### Base de données
```powershell
# Accès direct à PostgreSQL
docker exec -it gestion-postgres-prod psql -U gestion_user -d gestion_commerciale

# Prisma Studio
cd packages/database
pnpm prisma studio

# Backup de la base
docker exec gestion-postgres-prod pg_dump -U gestion_user gestion_commerciale > backup.sql

# Restore de la base
docker exec -i gestion-postgres-prod psql -U gestion_user gestion_commerciale < backup.sql
```

## 🔒 Sécurité

### Checklist de sécurité
- [ ] Mots de passe forts pour PostgreSQL et Redis
- [ ] Clés JWT sécurisées (32+ caractères)
- [ ] CORS configuré correctement
- [ ] Rate limiting activé
- [ ] Logs de sécurité activés
- [ ] Mise à jour régulière des images Docker
- [ ] Certificats SSL configurés (production)

### Rate limiting
- API générale : 100 requêtes/minute
- Connexion : 5 tentatives/minute
- Configuré dans Nginx

## 📊 Monitoring et maintenance

### Health checks
- **Backend** : `GET /health`  
- **Frontend** : `GET /api/health`
- **PostgreSQL** : `pg_isready`
- **Redis** : `redis-cli ping`

### Métriques disponibles
- Logs d'accès Nginx (`logs/nginx/`)
- Logs application (`logs/backend/`)
- Métriques Docker (`docker stats`)
- Métriques PostgreSQL (`pg_stat_statements`)

### Sauvegarde automatique
```bash
# Cron job pour backup quotidien
0 2 * * * docker exec gestion-postgres-prod pg_dump -U gestion_user gestion_commerciale | gzip > /backups/db_$(date +%Y%m%d).sql.gz
```

## 🚨 Dépannage

### Problèmes courants

#### Services ne démarrent pas
```powershell
# Vérifier les ports
netstat -an | findstr "3000\|3001\|5432"

# Vérifier Docker
docker ps -a
docker logs <container-name>
```

#### Base de données inaccessible
```powershell
# Tester la connexion
docker exec gestion-postgres-prod pg_isready -U gestion_user

# Recréer la base
.\scripts\setup-database.ps1 -Reset -Seed
```

#### Problèmes de performance
```powershell
# Voir l'utilisation des ressources
docker stats

# Redémarrer les services
docker-compose -f docker-compose.prod.yml restart
```

### Logs de débogage
```powershell
# Activer les logs verbeux (temporairement)
$env:DEBUG = "true"
$env:LOG_LEVEL = "debug"

# Redémarrer le backend
docker-compose -f docker-compose.prod.yml restart backend
```

## 🔄 Mise à jour

### Déploiement d'une nouvelle version
```powershell
# 1. Arrêter les services
docker-compose -f docker-compose.prod.yml down

# 2. Mettre à jour le code
git pull origin main

# 3. Rebuild et redémarrer
.\scripts\start-production.ps1 -Build -Detached

# 4. Migrer la base si nécessaire
.\scripts\setup-database.ps1
```

### Rollback
```powershell
# Revenir à la version précédente
git checkout <previous-commit>
.\scripts\start-production.ps1 -Build -Detached
```

## 📈 Optimisation

### Performance
- **PgBouncer** : Pool de connexions configuré
- **Redis** : Cache pour les sessions et données fréquentes
- **Nginx** : Compression et cache des assets
- **Docker** : Images multi-stage optimisées

### Scaling
```yaml
# Ajouter plus de workers backend
backend:
  scale: 3
  
# Load balancer automatique via Nginx
# Configuration dans docker/nginx/nginx.conf
```

---

## 📞 Support

En cas de problème :
1. Consultez les logs : `docker-compose logs`
2. Vérifiez la configuration : `.env.production`
3. Testez les health checks : `/health`
4. Consultez cette documentation

## 🎯 URLs importantes

- **Application** : http://localhost:3000
- **API** : http://localhost:3001  
- **Documentation API** : http://localhost:3001/docs
- **Health Check** : http://localhost:3001/health
- **Nginx Status** : http://localhost/nginx-health