# 🏢 Gestion Commerciale TPE - Phase 5 Analytics

> **Application complète de gestion commerciale pour Très Petites Entreprises**
> Architecture simplifiée avec Next.js 14 + Fastify + PostgreSQL + Redis
> **Phase 5 : Analytics et Reporting Avancés avec KPI temps réel**

[![Production](https://img.shields.io/badge/Status-Production%20Ready-success)](./GUIDE-CONNEXION-FRONTEND-BACKEND.md)
[![Phase 5](https://img.shields.io/badge/Phase%205-Analytics%20Ready-purple)](./start-phase5-analytics.ps1)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014-blue)](./frontend-nextjs-production)
[![Backend](https://img.shields.io/badge/Backend-Fastify-green)](./production-backend.js)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016-blue)](./docker)
[![Analytics](https://img.shields.io/badge/Analytics-Recharts-orange)](http://localhost:3003/analytics)

## 🚀 Stack Technique

- **Frontend**: Next.js 14 + App Router + Tailwind CSS + Lucide Icons
- **Backend**: Fastify + Node.js
- **Base de données**: PostgreSQL 16 + PgBouncer
- **Cache**: Redis 7
- **État global**: Zustand + Axios
- **Analytics**: Recharts + KPI temps réel
- **Conteneurisation**: Docker + Docker Compose
- **Gestionnaire de paquets**: npm/yarn

## 📊 Nouveautés Phase 5 - Analytics

- **KPI Temps Réel**: CA, marge brute, taux de conversion, panier moyen
- **Analytics de Ventes**: Évolution mensuelle, top clients, répartition par type
- **Performance Produits**: Top ventes par CA, analyse par catégorie
- **Segmentation Clients**: VIP/Premium/Standard/Nouveau automatique
- **Graphiques Interactifs**: Courbes, barres, secteurs avec Recharts
- **Tableaux de Bord**: Personnalisables avec filtres temporels

## 📁 Structure du Projet (Simplifiée)

```
gestion-commerciale-tpe/
├── frontend-nextjs-production/    # Frontend Next.js 14 UNIQUE (Port 3003)
├── production-backend.js          # API Fastify (Port 3001)
├── docker/                        # PostgreSQL + Redis + PgBouncer
├── packages/
│   ├── shared/                    # Types et utilitaires partagés
│   └── database/                  # Schéma et migrations
├── scripts/                       # Scripts d'automatisation
└── docs/                          # Documentation
```

## 🛠️ Prérequis

- **Node.js**: 20 LTS ou supérieur
- **pnpm**: 8.0.0 ou supérieur
- **Docker**: 24.0 ou supérieur
- **Docker Compose**: 2.20 ou supérieur

## ⚡ Démarrage Rapide Phase 5

### 🚀 Démarrage Complet avec Analytics (1 commande)

```powershell
# Démarrage automatique complet Phase 5
.\start-phase5-analytics.ps1
```

### 🚀 Démarrage Manuel (3 étapes)

```powershell
# 1. Démarrer l'infrastructure (PostgreSQL + Redis)
docker-compose up -d

# 2. Démarrer le backend de production avec Analytics
.\start-production-backend.ps1

# 3. Démarrer le frontend Next.js avec Analytics
.\start-frontend-nextjs.ps1
```

### ⚡ Démarrage Ultra-Rapide

```powershell
# Démarrage optimisé pour développement
.\quick-start-phase5.ps1
```

### 🌐 URLs d'Accès Phase 5

L'application sera accessible sur :
- **Frontend**: http://localhost:3003
- **Analytics Phase 5**: http://localhost:3003/analytics 📊
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Métriques**: http://localhost:3001/metrics
- **Analytics API**: http://localhost:3001/analytics/*
- **Adminer** (DB): http://localhost:8080
- **Redis Commander**: http://localhost:8081

### 🔐 Identifiants de Connexion

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Admin** | admin@demo-tpe.fr | demo123 |

## 🏗️ Architecture Simplifiée

L'application utilise une architecture simplifiée avec deux composants principaux :

| Port | Service | Description | Script |
|------|---------|-------------|--------|
| **3001** | Backend Production | Serveur Fastify avec API complète | `.\start-production-backend.ps1` |
| **3003** | Frontend Next.js | Interface utilisateur moderne | `.\start-frontend-nextjs.ps1` |

### 🔧 Scripts de Démarrage Phase 5
```powershell
# Démarrage complet Phase 5
.\start-phase5-analytics.ps1

# Démarrage rapide
.\quick-start-phase5.ps1

# Tests Phase 5
.\test-phase5-analytics.ps1

# Démarrage classique
.\start-application-complete.ps1

# Vérification des connexions
.\test-frontend-backend-connexion.ps1
```

📖 **Documentation complète** : [GUIDE-CONNEXION-FRONTEND-BACKEND.md](./GUIDE-CONNEXION-FRONTEND-BACKEND.md)

## 🔧 Scripts Disponibles Phase 5

### Démarrage Phase 5 Analytics
```powershell
# Démarrage complet automatique
.\start-phase5-analytics.ps1            # Démarrage avec validation Analytics

# Démarrage rapide
.\quick-start-phase5.ps1                # Démarrage optimisé

# Démarrage classique
.\start-application-complete.ps1        # Démarrage avec tests complets
```

### Tests et Validations Phase 5
```powershell
.\test-phase5-analytics.ps1             # Tests complets Analytics Phase 5
.\test-frontend-backend-connexion.ps1   # Tester les connexions
.\verification-finale-complete.ps1      # Tests complets (10 tests)
.\test-auth.ps1                         # Tester l'authentification
```

### Démarrage Manuel
```powershell
# Infrastructure
docker-compose up -d                    # Démarrer PostgreSQL + Redis

# Backend avec Analytics
.\start-production-backend.ps1          # Démarrer le backend (port 3001)

# Frontend avec Analytics
.\start-frontend-nextjs.ps1             # Démarrer Next.js (port 3003)
```

### Base de données
```powershell
.\init-database.ps1                     # Initialiser la base de données
.\setup-database.ps1                    # Configuration complète
```

### Arrêt
```powershell
.\stop-production-backend.ps1           # Arrêter le backend
docker-compose down                     # Arrêter l'infrastructure
```

## 🔐 Configuration

### Variables d'environnement

Créer les fichiers `.env` dans chaque application :

**apps/backend/.env**
```env
# Base de données
DATABASE_URL="postgresql://gestion_user:gestion_password_secure_2024@localhost:6432/gestion_commerciale"
DIRECT_DATABASE_URL="postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"

# Redis
REDIS_URL="redis://:redis_password_secure_2024@localhost:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"

# Application
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"
```

**apps/frontend/.env.local**
```env
# API Backend
NEXT_PUBLIC_API_URL="http://localhost:3001"

# Application
NODE_ENV="development"
```

## 🏗️ Architecture Modulaire

L'application suit une architecture **Modular Monolith** avec des modules clairement séparés :

### Backend (Fastify)
- **auth/** - Authentification et autorisation
- **clients/** - Gestion des clients
- **products/** - Catalogue produits
- **inventory/** - Gestion des stocks
- **orders/** - Commandes et devis
- **invoices/** - Facturation
- **analytics/** - Tableaux de bord et rapports

### Frontend (Next.js)
- **auth/** - Pages d'authentification
- **dashboard/** - Tableaux de bord
- **clients/** - Interface clients
- **products/** - Interface produits
- **inventory/** - Interface stocks
- **orders/** - Interface commandes
- **invoices/** - Interface facturation

## 🧪 Tests

```bash
# Tests unitaires
pnpm test:unit

# Tests d'intégration
pnpm test:integration

# Tests E2E
pnpm test:e2e

# Couverture de code
pnpm test:coverage
```

## 📊 Monitoring et Logs

- **Logs structurés** avec Pino
- **Health checks** sur `/health`
- **Métriques** sur `/metrics`
- **Documentation API** sur `/docs`

## 🚀 Déploiement

### Production avec Docker

```bash
# Construire les images
docker-compose -f docker-compose.prod.yml build

# Déployer en production
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Documentation

- [Guide de développement](./docs/development.md)
- [Architecture détaillée](./docs/architecture.md)
- [API Documentation](./docs/api.md)
- [Guide de déploiement](./docs/deployment.md)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -m 'Ajout nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une [issue](../../issues)
- Consulter la [documentation](./docs/)
- Contacter l'équipe de développement
