# Guide d'Installation - Module Utilisateurs

## Prérequis

Avant d'installer le module utilisateurs, assurez-vous que les éléments suivants sont en place :

### Infrastructure
- **Node.js** : Version 18+ 
- **PostgreSQL** : Version 13+
- **Redis** : Version 6+
- **pnpm** : Gestionnaire de paquets

### Base de données
- Base de données PostgreSQL configurée
- Utilisateur avec privilèges de création de tables
- Connexion réseau autorisée

## Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd gestion-commerciale
```

### 2. Installer les dépendances

```bash
# Installation des dépendances globales
pnpm install

# Installation des dépendances spécifiques
pnpm install --filter @gestion/backend
pnpm install --filter @gestion/frontend
```

### 3. Configuration de l'environnement

Créez les fichiers d'environnement :

**Backend (.env) :**
```env
# Base de données
DATABASE_URL="postgresql://username:password@localhost:5432/gestion_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="24h"

# Redis
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="production"
PORT=3001
CORS_ORIGIN="http://localhost:3006"

# Sécurité
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_TIME=900000

# Logs
LOG_LEVEL="info"
LOG_FILE="logs/app.log"
```

**Frontend (.env.local) :**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_NAME="Gestion Commerciale"
NEXT_PUBLIC_VERSION="1.0.0"
```

### 4. Configuration de la base de données

```bash
# Générer le client Prisma
pnpm run prisma:generate

# Exécuter les migrations
pnpm run prisma:migrate

# (Optionnel) Peupler avec des données de test
pnpm run db:seed
```

### 5. Démarrage des services

#### Développement
```bash
# Démarrer tous les services
pnpm start

# Ou démarrer individuellement
pnpm run backend:dev
pnpm run frontend:dev
```

#### Production
```bash
# Construire les applications
pnpm run build

# Démarrer en production
pnpm run start:prod
```

## Configuration avancée

### Sécurité JWT

Générez une clé JWT sécurisée :

```bash
# Générer une clé aléatoire
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Configuration Redis

Pour une installation Redis personnalisée :

```env
REDIS_URL="redis://username:password@host:port/database"
REDIS_PASSWORD="your-redis-password"
REDIS_DB=0
```

### Configuration PostgreSQL

Optimisations recommandées pour PostgreSQL :

```sql
-- Créer des index pour les performances
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## Tests

### Tests unitaires

```bash
# Backend
cd apps/backend
pnpm test

# Frontend
cd apps/frontend
pnpm test
```

### Tests d'intégration

```bash
# Tests complets avec couverture
pnpm run test:coverage
```

### Tests E2E (si configurés)

```bash
pnpm run test:e2e
```

## Déploiement

### Docker

#### Construction des images

```bash
# Backend
docker build -t gestion-backend ./apps/backend

# Frontend
docker build -t gestion-frontend ./apps/frontend
```

#### Docker Compose

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:13
    environment:
      POSTGRES_DB: gestion_db
      POSTGRES_USER: gestion_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  backend:
    image: gestion-backend
    environment:
      DATABASE_URL: postgresql://gestion_user:secure_password@postgres:5432/gestion_db
      REDIS_URL: redis://redis:6379
      JWT_SECRET: your-jwt-secret
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

  frontend:
    image: gestion-frontend
    environment:
      NEXT_PUBLIC_API_URL: http://backend:3001
    ports:
      - "3006:3006"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Déploiement sur serveur

#### Nginx (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### PM2 (Process Manager)

```json
{
  "apps": [
    {
      "name": "gestion-backend",
      "script": "dist/index.js",
      "cwd": "./apps/backend",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": 3001
      }
    },
    {
      "name": "gestion-frontend",
      "script": "server.js",
      "cwd": "./apps/frontend",
      "instances": 1,
      "env": {
        "NODE_ENV": "production",
        "PORT": 3006
      }
    }
  ]
}
```

## Monitoring et Logs

### Configuration des logs

```javascript
// Backend logging configuration
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Métriques de performance

Surveillez ces métriques clés :
- Temps de réponse des API
- Utilisation CPU/Mémoire
- Connexions base de données
- Erreurs d'authentification
- Tentatives de connexion échouées

## Maintenance

### Sauvegardes

```bash
# Sauvegarde PostgreSQL
pg_dump -h localhost -U gestion_user gestion_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Sauvegarde Redis
redis-cli --rdb dump.rdb
```

### Mises à jour

```bash
# Mettre à jour les dépendances
pnpm update

# Appliquer les nouvelles migrations
pnpm run prisma:migrate

# Redémarrer les services
pm2 restart all
```

## Dépannage

### Problèmes courants

**Erreur de connexion base de données :**
- Vérifiez la chaîne de connexion DATABASE_URL
- Assurez-vous que PostgreSQL est démarré
- Vérifiez les permissions utilisateur

**Erreur JWT :**
- Vérifiez que JWT_SECRET est défini
- Assurez-vous que la clé est suffisamment longue (64+ caractères)

**Problèmes de performance :**
- Vérifiez les index de base de données
- Surveillez l'utilisation Redis
- Optimisez les requêtes lentes

### Logs utiles

```bash
# Logs backend
tail -f apps/backend/logs/combined.log

# Logs système
journalctl -u gestion-backend -f

# Logs PM2
pm2 logs gestion-backend
```

## Support

Pour obtenir de l'aide :
1. Consultez les logs d'erreur
2. Vérifiez la configuration
3. Consultez la documentation API
4. Ouvrez une issue sur le repository

---

*Guide mis à jour pour la version 1.0.0*
