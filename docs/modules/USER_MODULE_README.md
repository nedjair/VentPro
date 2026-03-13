# Module Utilisateurs - Gestion Commerciale

## 📋 Vue d'ensemble

Le module utilisateurs est un système complet de gestion des utilisateurs pour l'application de gestion commerciale. Il fournit toutes les fonctionnalités nécessaires pour l'authentification, l'autorisation basée sur les rôles, et la gestion complète des comptes utilisateurs.

## ✨ Fonctionnalités

### 🔐 Authentification & Sécurité
- **JWT Authentication** : Authentification sécurisée par tokens
- **Hachage bcrypt** : Mots de passe sécurisés avec salt
- **Politique de mots de passe** : Validation stricte (8+ caractères, majuscule, minuscule, chiffre)
- **Protection contre les attaques** : Limitation des tentatives de connexion
- **Sessions sécurisées** : Gestion automatique des tokens

### 👥 Gestion des Rôles
- **ADMIN** : Accès complet à toutes les fonctionnalités
- **MANAGER** : Gestion des employés de son entreprise
- **EMPLOYEE** : Accès limité à ses propres données

### 🛠️ Opérations CRUD
- **Création d'utilisateurs** : Formulaire complet avec validation
- **Modification** : Mise à jour des informations personnelles et rôles
- **Suppression** : Suppression sécurisée avec confirmation
- **Activation/Désactivation** : Gestion du statut des comptes

### 🔍 Recherche & Filtrage
- **Recherche en temps réel** : Par nom, prénom, email
- **Filtres avancés** : Par rôle, statut, entreprise
- **Pagination** : Navigation efficace dans les listes
- **Tri** : Classement par différents critères

### 📊 Statistiques & Reporting
- **Tableau de bord** : Vue d'ensemble des utilisateurs
- **Compteurs visuels** : Indicateurs colorés par rôle et statut
- **Historique** : Suivi des dernières connexions
- **Audit logs** : Traçabilité complète des actions

## 🏗️ Architecture

### Backend (Fastify + Prisma)

```
apps/backend/src/
├── routes/users/           # Routes API utilisateurs
├── services/UserService.ts # Logique métier
├── middleware/auth.ts      # Authentification JWT
├── middleware/rbac.ts      # Contrôle d'accès basé sur les rôles
├── utils/validation.ts     # Validation des données
└── types/user.ts          # Types TypeScript
```

### Frontend (Next.js + React)

```
apps/frontend/src/
├── app/users/             # Pages utilisateurs
├── components/users/      # Composants React
├── services/userService.ts # Client API
├── types/user.ts          # Types TypeScript
└── hooks/useUsers.ts      # Hooks personnalisés
```

### Base de données (PostgreSQL + Prisma)

```sql
-- Table principale des utilisateurs
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  first_name VARCHAR NOT NULL,
  last_name VARCHAR NOT NULL,
  role user_role NOT NULL,
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);
```

## 🚀 Installation Rapide

### 1. Prérequis
```bash
# Node.js 18+, PostgreSQL 13+, Redis 6+
node --version  # v18+
psql --version  # 13+
redis-server --version  # 6+
```

### 2. Installation
```bash
# Cloner et installer
git clone <repo>
cd gestion-commerciale
pnpm install

# Configuration base de données
pnpm run prisma:migrate
pnpm run db:seed
```

### 3. Démarrage
```bash
# Développement
pnpm start

# Production
pnpm run build
pnpm run start:prod
```

## 📚 Documentation

### API Documentation
- **[API Users](../api/users.md)** : Documentation complète de l'API
- **Endpoints** : 8 routes principales avec authentification
- **Validation** : Schémas de validation détaillés
- **Exemples** : Requêtes et réponses complètes

### Guide Utilisateur
- **[Guide Utilisateur](../user/user-management.md)** : Manuel d'utilisation
- **Interface** : Description détaillée de l'UI
- **Workflows** : Processus étape par étape
- **Bonnes pratiques** : Recommandations de sécurité

### Déploiement
- **[Guide Déploiement](../deployment/user-module-setup.md)** : Installation production
- **Docker** : Configuration conteneurs
- **Nginx** : Configuration reverse proxy
- **Monitoring** : Surveillance et logs

## 🧪 Tests

### Tests Backend
```bash
cd apps/backend
pnpm test                    # Tests unitaires
pnpm test:coverage          # Couverture de code
pnpm test:integration       # Tests d'intégration
```

### Tests Frontend
```bash
cd apps/frontend
pnpm test                   # Tests composants
pnpm test:coverage         # Couverture de code
pnpm test:e2e             # Tests end-to-end
```

### Couverture de tests
- **Backend** : 95%+ de couverture
- **Frontend** : 90%+ de couverture
- **Tests d'intégration** : Tous les endpoints API
- **Tests E2E** : Workflows utilisateur complets

## 🔧 Configuration

### Variables d'environnement

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db"
JWT_SECRET="your-super-secret-key"
REDIS_URL="redis://localhost:6379"
BCRYPT_ROUNDS=12
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_APP_NAME="Gestion Commerciale"
```

### Personnalisation

Le module est entièrement personnalisable :
- **Rôles** : Ajout de nouveaux rôles dans le schéma Prisma
- **Validation** : Modification des règles de validation
- **UI** : Personnalisation des composants React
- **Permissions** : Ajustement des contrôles d'accès

## 📈 Performance

### Optimisations implémentées
- **Index base de données** : Sur email, role, company_id
- **Cache Redis** : Sessions et données fréquentes
- **Pagination** : Chargement efficace des listes
- **Lazy loading** : Composants chargés à la demande

### Métriques cibles
- **Temps de réponse API** : < 200ms
- **Chargement page** : < 2s
- **Authentification** : < 100ms
- **Recherche** : < 500ms

## 🛡️ Sécurité

### Mesures implémentées
- **Hachage bcrypt** : Salt rounds configurables
- **JWT sécurisé** : Expiration automatique
- **Validation stricte** : Sanitisation des entrées
- **RBAC** : Contrôle d'accès granulaire
- **Audit logs** : Traçabilité complète
- **Rate limiting** : Protection contre les attaques

### Conformité
- **RGPD** : Gestion des données personnelles
- **Sécurité** : Chiffrement des mots de passe
- **Audit** : Logs de toutes les actions sensibles

## 🤝 Contribution

### Structure du code
- **TypeScript** : Typage strict
- **ESLint** : Linting automatique
- **Prettier** : Formatage du code
- **Husky** : Hooks Git
- **Conventional Commits** : Messages standardisés

### Workflow de développement
1. Fork du repository
2. Création d'une branche feature
3. Développement avec tests
4. Pull request avec review
5. Merge après validation

## 📞 Support

### Ressources
- **Documentation** : Guides complets
- **Tests** : Exemples d'utilisation
- **Issues** : Suivi des bugs et features
- **Wiki** : Base de connaissances

### Contact
- **Issues GitHub** : Pour les bugs et features
- **Discussions** : Pour les questions générales
- **Email** : support@gestion-commerciale.com

---

## 📄 Licence

Ce module fait partie de l'application Gestion Commerciale.
Tous droits réservés © 2024

---

*Dernière mise à jour : Janvier 2024*
*Version : 1.0.0*
