# 🏢 Gestion Commerciale TPE - Déploiement Docker

> **Application complète de gestion commerciale pour Très Petites Entreprises**
> Architecture Monorepo avec Next.js 14 + Fastify + PostgreSQL + Redis

## 🚀 Stack Technique

- **Frontend**: Next.js 14 (Port 3000)
- **Backend**: Fastify + Prisma ORM (Port 3001)
- **Base de données**: PostgreSQL 16 + PgBouncer
- **Cache**: Redis 7
- **Orchestration**: Docker Compose
- **Gestionnaire de paquets**: pnpm 8+ (Workspace)

## 🛠️ Déploiement Rapide (Docker)

Le projet est entièrement conteneurisé. Pour lancer l'application complète (Base de données, Redis, Backend et Frontend) :

```bash
# 1. Démarrer tous les services
docker-compose up -d

# 2. Initialiser la base de données (Migrations + Seed)
docker exec -it ventespro-backend pnpm --filter "@gestion/database" exec prisma db push
docker exec -it ventespro-backend pnpm --filter "@gestion/backend" run db:seed:dev
```

## 🌐 URLs d'Accès

L'application est accessible sur les adresses suivantes :

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | [http://localhost:3000](http://localhost:3000) | Interface utilisateur principale |
| **Backend API** | [http://localhost:3001](http://localhost:3001) | API REST Fastify |
| **Adminer** | [http://localhost:8080](http://localhost:8080) | Gestionnaire de base de données |
| **PostgreSQL** | `localhost:5434` | Accès direct DB (Hôte) |

## 🔐 Identifiants par défaut (Développement)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| **Administrateur** | `admin@example.com` | `admin123` |

## 📁 Structure du Monorepo

```
.
├── apps/
│   ├── frontend/          # Application Next.js
│   └── backend/           # API Fastify
├── packages/
│   ├── database/          # Schéma Prisma et Client partagé
│   └── shared/            # Types et utilitaires communs
├── docker/                # Scripts d'initialisation PostgreSQL
└── docker-compose.yml     # Orchestration complète
```

## 🔧 Maintenance et Logs

- **Voir les logs du backend** : `docker logs -f ventespro-backend`
- **Voir les logs du frontend** : `docker logs -f ventespro-frontend`
- **Redémarrer les services** : `docker-compose restart`
- **Nettoyer l'espace Docker** : `docker system prune -f`

---
*Note : Pour le développement local sous Windows, assurez-vous que Docker Desktop est lancé sur le disque possédant le plus d'espace (ex: Disque D:).*
