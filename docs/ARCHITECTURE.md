# 🏗️ Architecture - Gestion Commerciale TPE

## Vue d'Ensemble

L'application suit une architecture **Modular Monolith** qui permet une évolution future vers des microservices tout en conservant la simplicité de déploiement d'un monolithe.

## 📊 Diagramme d'Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Pages     │ │ Components  │ │      Stores (Zustand)   │ │
│  │             │ │             │ │                         │ │
│  │ • Dashboard │ │ • UI Kit    │ │ • Auth Store            │ │
│  │ • Auth      │ │ • Layout    │ │ • Client Store          │ │
│  │ • Clients   │ │ • Forms     │ │ • Product Store         │ │
│  │ • Products  │ │ • Tables    │ │ • Order Store           │ │
│  │ • Orders    │ │ • Charts    │ │ • Invoice Store         │ │
│  │ • Invoices  │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │ TanStack Query
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Fastify)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │   Routes    │ │  Services   │ │      Middleware         │ │
│  │             │ │             │ │                         │ │
│  │ • Auth      │ │ • Auth      │ │ • Authentication        │ │
│  │ • Clients   │ │ • Clients   │ │ • Authorization         │ │
│  │ • Products  │ │ • Products  │ │ • Validation (Zod)     │ │
│  │ • Orders    │ │ • Orders    │ │ • Rate Limiting         │ │
│  │ • Invoices  │ │ • Invoices  │ │ • CORS                  │ │
│  │ • Analytics │ │ • Analytics │ │ • Helmet (Security)     │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │ PostgreSQL  │ │ PgBouncer   │ │      Redis              │ │
│  │             │ │             │ │                         │ │
│  │ • Users     │ │ • Connection│ │ • Sessions              │ │
│  │ • Companies │ │   Pooling   │ │ • Refresh Tokens        │ │
│  │ • Clients   │ │ • Load      │ │ • Cache                 │ │
│  │ • Products  │ │   Balancing │ │ • Rate Limiting         │ │
│  │ • Orders    │ │             │ │                         │ │
│  │ • Invoices  │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🏢 Structure Modulaire

### Frontend (Next.js 14)
```
apps/frontend/
├── app/                    # App Router (Next.js 14)
│   ├── (auth)/            # Groupe de routes d'authentification
│   ├── dashboard/         # Interface principale
│   ├── globals.css        # Styles globaux
│   ├── layout.tsx         # Layout racine
│   └── providers.tsx      # Providers React
├── components/            # Composants réutilisables
│   ├── ui/               # Composants UI de base (Shadcn/ui)
│   ├── layout/           # Composants de layout
│   └── forms/            # Composants de formulaires
├── hooks/                # Hooks personnalisés
├── lib/                  # Utilitaires et configuration
├── stores/               # Stores Zustand
└── types/                # Types TypeScript spécifiques
```

### Backend (Fastify)
```
apps/backend/
├── src/
│   ├── routes/           # Définition des routes API
│   │   ├── auth.ts       # Authentification
│   │   ├── clients.ts    # Gestion clients
│   │   ├── products.ts   # Gestion produits
│   │   ├── orders.ts     # Gestion commandes
│   │   └── invoices.ts   # Gestion factures
│   ├── services/         # Logique métier
│   ├── middleware/       # Middleware personnalisés
│   ├── utils/           # Utilitaires
│   ├── plugins/         # Plugins Fastify
│   ├── server.ts        # Configuration serveur
│   └── index.ts         # Point d'entrée
└── dist/                # Code compilé
```

### Packages Partagés
```
packages/
├── shared/              # Types et utilitaires partagés
│   ├── types/          # Types TypeScript communs
│   ├── utils/          # Fonctions utilitaires
│   └── index.ts        # Exports principaux
└── database/           # Schéma et client Prisma
    ├── schema.prisma   # Définition du schéma
    ├── seed.ts         # Données de test
    ├── client.ts       # Configuration client
    └── generated/      # Client Prisma généré
```

## 🔄 Flux de Données

### 1. Authentification
```
Frontend → API /auth/login → Validation → JWT Generation → Redis Storage → Response
```

### 2. Opérations CRUD
```
Frontend → TanStack Query → API Routes → Validation (Zod) → Service Layer → Prisma → PostgreSQL
```

### 3. Cache Strategy
```
API Request → Check Redis Cache → If Miss: Database Query → Cache Result → Return Data
```

## 🛡️ Sécurité

### Authentification & Autorisation
- **JWT** avec refresh tokens
- **RBAC** (Role-Based Access Control)
- **Sessions** stockées dans Redis
- **Rate limiting** par IP

### Protection des Données
- **Validation** stricte avec Zod
- **Sanitization** des inputs
- **CORS** configuré
- **Helmet** pour les headers de sécurité
- **HTTPS** en production

### Base de Données
- **Connection pooling** avec PgBouncer
- **Prepared statements** via Prisma
- **Transactions** pour les opérations critiques
- **Backup** automatique

## 📈 Performance

### Frontend
- **Code splitting** automatique (Next.js)
- **Image optimization** intégrée
- **Static generation** pour les pages statiques
- **Caching** intelligent avec TanStack Query

### Backend
- **Connection pooling** PostgreSQL
- **Redis caching** pour les données fréquentes
- **Compression** des réponses
- **Pagination** optimisée

### Base de Données
- **Index** optimisés pour les requêtes fréquentes
- **Vues matérialisées** pour les analytics
- **Partitioning** pour les gros volumes (futur)

## 🔧 Patterns Architecturaux

### 1. Repository Pattern
```typescript
// Service Layer
class ClientService {
  async getClients(filters: ClientFilters): Promise<Client[]> {
    return await this.clientRepository.findMany(filters)
  }
}

// Repository Layer (Prisma)
class ClientRepository {
  async findMany(filters: ClientFilters): Promise<Client[]> {
    return await prisma.client.findMany({
      where: this.buildWhereClause(filters),
      include: this.getIncludes()
    })
  }
}
```

### 2. Command Query Responsibility Segregation (CQRS)
```typescript
// Commands (Write operations)
class CreateClientCommand {
  async execute(data: CreateClientData): Promise<Client> {
    // Validation, business logic, persistence
  }
}

// Queries (Read operations)
class GetClientsQuery {
  async execute(filters: ClientFilters): Promise<Client[]> {
    // Optimized read operations, caching
  }
}
```

### 3. Event-Driven Architecture (Futur)
```typescript
// Events pour découplage
class ClientCreatedEvent {
  constructor(public client: Client) {}
}

// Handlers
class SendWelcomeEmailHandler {
  async handle(event: ClientCreatedEvent) {
    // Envoi email de bienvenue
  }
}
```

## 🚀 Évolutivité

### Vers les Microservices
L'architecture modulaire permet une migration progressive :

1. **Extraction de modules** en services indépendants
2. **API Gateway** pour le routage
3. **Event sourcing** pour la communication
4. **Service mesh** pour l'observabilité

### Scaling Horizontal
- **Load balancing** avec Nginx
- **Database sharding** par entreprise
- **CDN** pour les assets statiques
- **Containerisation** avec Docker

## 📊 Monitoring & Observabilité

### Logs
- **Structured logging** avec Pino
- **Correlation IDs** pour le tracing
- **Log aggregation** avec ELK Stack (futur)

### Métriques
- **Health checks** sur tous les services
- **Performance metrics** avec Prometheus (futur)
- **Business metrics** personnalisées

### Alerting
- **Sentry** pour les erreurs
- **Uptime monitoring** avec Pingdom (futur)
- **Slack notifications** pour les incidents

## 🧪 Testing Strategy

### Frontend
- **Unit tests** avec Jest
- **Component tests** avec Testing Library
- **E2E tests** avec Playwright
- **Visual regression** avec Chromatic (futur)

### Backend
- **Unit tests** pour la logique métier
- **Integration tests** pour les APIs
- **Contract tests** avec Pact (futur)
- **Load tests** avec Artillery (futur)

## 📚 Documentation

### Code
- **JSDoc** pour les fonctions complexes
- **README** dans chaque module
- **Architecture Decision Records** (ADR)

### API
- **OpenAPI/Swagger** automatique
- **Postman collections** pour les tests
- **Examples** et cas d'usage

Cette architecture garantit une base solide pour le développement, la maintenance et l'évolution future de l'application.
