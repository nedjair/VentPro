# 🌐 Stratégie de Ports Dédiés - Gestion Commerciale TPE

## 📋 Vue d'ensemble

Cette documentation décrit la stratégie de ports dédiés mise en place pour éviter les conflits et permettre l'exécution simultanée de plusieurs environnements frontend dans le projet Gestion Commerciale TPE.

## 🎯 Allocation des Ports

### 🚀 Backend
| Port | Service | Description | Statut |
|------|---------|-------------|--------|
| **3001** | Backend Principal | Serveur Fastify de production | 🔒 **Réservé** |

### 🌐 Frontend
| Port | Environnement | Description | Utilisation |
|------|---------------|-------------|-------------|
| **3002** | ~~Express.js Production~~ | ⚪ **LIBRE** (Ex-Express.js supprimé) | 🆓 **Disponible** |
| **3003** | Next.js Production | **Frontend Next.js principal** | 🚀 **Principal** |
| **3004** | ~~Tests Isolés~~ | ⚪ **LIBRE** (Port libéré) | 🆓 **Disponible** |
| **3005** | Développement | Mode développement avec hot-reload | 🔥 **Développement** |

### 🗄️ Infrastructure
| Port | Service | Description | Statut |
|------|---------|-------------|--------|
| **5432** | PostgreSQL | Base de données principale | 🔒 **Réservé** |
| **6379** | Redis | Cache et sessions | 🔒 **Réservé** |
| **6432** | PgBouncer | Connection pooling PostgreSQL | 🔒 **Réservé** |

### 🛠️ Outils d'Administration (Optionnels)
| Port | Service | Description | Statut |
|------|---------|-------------|--------|
| **8080** | Adminer | Interface PostgreSQL | ⚪ **Optionnel** |
| **8081** | Redis Commander | Interface Redis | ⚪ **Optionnel** |

## 🚀 Scripts de Démarrage

### Frontend Express.js Production (Port 3002)
```powershell
# Démarrage
.\start-frontend-express.ps1

# Avec installation des dépendances
.\start-frontend-express.ps1 -Install

# Vérification du statut
.\start-frontend-express.ps1 -Status

# Arrêt
.\start-frontend-express.ps1 -Stop
```

### Frontend Next.js Tests (Port 3003)
```powershell
# Démarrage
.\start-frontend-nextjs-test.ps1

# Avec exécution des tests
.\start-frontend-nextjs-test.ps1 -RunTests

# Vérification du statut
.\start-frontend-nextjs-test.ps1 -Status

# Arrêt
.\start-frontend-nextjs-test.ps1 -Stop
```

### Tests Frontend Isolés (Port 3004)
```powershell
# Démarrage
.\start-frontend-test.ps1

# Avec exécution des tests
.\start-frontend-test.ps1 -RunTests

# Vérification du statut
.\start-frontend-test.ps1 -Status

# Arrêt
.\start-frontend-test.ps1 -Stop
```

### Développement Frontend (Port 3005)
```powershell
# Démarrage avec hot-reload
.\start-frontend-dev.ps1

# Avec installation des dépendances
.\start-frontend-dev.ps1 -Install

# Vérification du statut
.\start-frontend-dev.ps1 -Status

# Arrêt
.\start-frontend-dev.ps1 -Stop
```

## 🔍 Vérification des Ports

### Script de Vérification Global
```powershell
# Vérification standard
.\check-ports-strategy.ps1

# Vérification détaillée
.\check-ports-strategy.ps1 -Detailed

# Arrêter tous les processus frontend
.\check-ports-strategy.ps1 -Kill

# Arrêter un processus spécifique
.\check-ports-strategy.ps1 -KillPort 3002
```

## ⚙️ Configuration

### Variables d'Environnement

#### Backend (production-backend.js, minimal-backend.js)
```javascript
// CORS - Stratégie de ports dédiés
fastify.register(require('@fastify/cors'), {
  origin: [
    'http://localhost:3002',  // Express.js Production
    'http://localhost:3003',  // Next.js Tests
    'http://localhost:3004',  // Tests isolés
    'http://localhost:3005'   // Développement
  ],
  credentials: true
});
```

#### Fichiers .env
```env
# CORS - Ports dédiés pour les différents environnements frontend
CORS_ORIGIN="http://localhost:3002,http://localhost:3003,http://localhost:3004,http://localhost:3005"

# URLs Frontend par environnement
NEXT_PUBLIC_APP_URL_PRODUCTION="http://localhost:3002"    # Express.js Production
NEXT_PUBLIC_APP_URL_NEXTJS_TEST="http://localhost:3003"   # Next.js Tests
NEXT_PUBLIC_APP_URL_TEST="http://localhost:3004"          # Tests isolés
NEXT_PUBLIC_APP_URL_DEV="http://localhost:3005"           # Développement
```

### Package.json Scripts

#### apps/frontend/package.json
```json
{
  "scripts": {
    "dev": "next dev --port 3005",
    "dev:test": "next dev --port 3004",
    "dev:nextjs-test": "next dev --port 3003",
    "start": "next start --port 3005",
    "start:test": "next start --port 3004",
    "start:nextjs-test": "next start --port 3003"
  }
}
```

### Configuration Next.js

#### next.config.js/mjs
```javascript
env: {
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  // Ports dédiés par environnement
  NEXT_PUBLIC_APP_URL_PRODUCTION: 'http://localhost:3002',    // Express.js Production
  NEXT_PUBLIC_APP_URL_NEXTJS_TEST: 'http://localhost:3003',   // Next.js Tests
  NEXT_PUBLIC_APP_URL_TEST: 'http://localhost:3004',          // Tests isolés
  NEXT_PUBLIC_APP_URL_DEV: 'http://localhost:3005',           // Développement
}
```

## 🔄 Workflows Recommandés

### Développement
1. Démarrer le backend : `node production-backend.js`
2. Démarrer le frontend développement : `.\start-frontend-dev.ps1`
3. Accéder à l'application : http://localhost:3005

### Tests
1. Démarrer le backend : `node minimal-backend.js`
2. Démarrer l'environnement de test : `.\start-frontend-test.ps1 -RunTests`
3. Accéder aux tests : http://localhost:3004

### Production Express.js
1. Démarrer le backend : `node production-backend.js`
2. Démarrer Express.js : `.\start-frontend-express.ps1`
3. Accéder à l'application : http://localhost:3002

### Tests Next.js
1. Démarrer le backend : `node minimal-backend.js`
2. Démarrer Next.js Tests : `.\start-frontend-nextjs-test.ps1 -RunTests`
3. Accéder aux tests : http://localhost:3003

## 🛡️ Avantages de cette Stratégie

### ✅ Isolation des Environnements
- Chaque environnement a son port dédié
- Pas de conflits entre les différents modes
- Exécution simultanée possible

### ✅ Clarté et Organisation
- Ports logiquement organisés par fonction
- Documentation claire des usages
- Scripts dédiés pour chaque environnement

### ✅ Facilité de Débogage
- Identification rapide des services par port
- Logs séparés par environnement
- Monitoring simplifié

### ✅ Flexibilité de Développement
- Basculement facile entre environnements
- Tests en parallèle du développement
- Production et développement simultanés

## 🔧 Dépannage

### Port Déjà Utilisé
```powershell
# Vérifier quel processus utilise le port
.\check-ports-strategy.ps1 -Detailed

# Arrêter le processus sur un port spécifique
.\check-ports-strategy.ps1 -KillPort 3002
```

### Conflits de Ports
```powershell
# Arrêter tous les processus frontend
.\check-ports-strategy.ps1 -Kill

# Redémarrer l'environnement souhaité
.\start-frontend-dev.ps1
```

### Vérification de la Configuration
```powershell
# Vérifier l'état de tous les ports
.\check-ports-strategy.ps1

# Vérifier un service spécifique
.\start-frontend-express.ps1 -Status
```

## 📝 Notes Importantes

1. **Port 3001** est réservé exclusivement au backend principal
2. **Ports 3002-3005** sont dédiés aux différents environnements frontend
3. Les **ports 5432, 6379, 6432** sont réservés à l'infrastructure
4. Les **ports 8080, 8081** sont optionnels pour l'administration
5. Toujours vérifier les ports avant de démarrer un nouveau service
6. Utiliser les scripts dédiés pour éviter les conflits
7. Les configurations CORS incluent tous les ports frontend

## 🔗 Liens Utiles

- [Documentation Backend](./README.md)
- [Documentation Express.js](./README-EXPRESS-FRONTEND.md)
- [Documentation Next.js](./README-NextJS.md)
- [Scripts d'automatisation](./SCRIPTS_AUTOMATISATION_COMPLETE.md)
