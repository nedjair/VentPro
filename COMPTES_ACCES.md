# 🔐 Comptes d'Accès - Gestion Commerciale TPE

Ce document centralise tous les comptes d'accès disponibles pour l'application de gestion commerciale TPE.

## 📱 Application Web

### URL d'Accès
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001
- **Documentation API** : http://localhost:3001/docs

### 👥 Comptes Utilisateurs de Démonstration

| Rôle | Email | Mot de passe | Permissions |
|------|-------|--------------|-------------|
| **🔴 Admin** | admin@demo-tpe.fr | demo123 | Accès complet à toutes les fonctionnalités |
| **🟡 Manager** | manager@demo-tpe.fr | demo123 | Gestion des clients, produits, commandes, factures |
| **🟢 Employé** | employee@demo-tpe.fr | demo123 | Consultation et saisie limitée |

### 🏢 Entreprise de Démonstration
- **Nom** : Demo TPE SARL
- **SIRET** : 12345678901234
- **Adresse** : 123 Rue de la Démo, 75001 Paris, France
- **Email** : contact@demo-tpe.fr
- **Téléphone** : 01 23 45 67 89

## 🗄️ Base de Données

### PostgreSQL 16
- **Host** : localhost
- **Port** : 5432 (direct) / 6432 (via PgBouncer)
- **Base de données** : gestion_commerciale
- **Utilisateur** : gestion_user
- **Mot de passe** : gestion_password_secure_2024

### Interface Adminer
- **URL** : http://localhost:8080
- **Serveur** : postgres (ou localhost)
- **Utilisateur** : gestion_user
- **Mot de passe** : gestion_password_secure_2024
- **Base de données** : gestion_commerciale

## 🔄 Cache Redis

### Redis 7
- **Host** : localhost
- **Port** : 6379
- **Mot de passe** : redis_password_secure_2024

### Interface Redis Commander
- **URL** : http://localhost:8081
- **Utilisateur** : admin
- **Mot de passe** : admin_password_2024

## 🐳 Services Docker

### Commandes Utiles
```bash
# Voir l'état des services
docker-compose ps

# Voir les logs en temps réel
docker-compose logs -f

# Redémarrer tous les services
docker-compose restart

# Arrêter tous les services
docker-compose down

# Démarrer tous les services
docker-compose up -d
```

### Services Disponibles
| Service | Container | Port | Status |
|---------|-----------|------|--------|
| PostgreSQL | gestion-postgres | 5432 | ✅ Running |
| PgBouncer | gestion-pgbouncer | 6432 | ✅ Running |
| Redis | gestion-redis | 6379 | ✅ Running |
| Adminer | gestion-adminer | 8080 | ✅ Running |
| Redis Commander | gestion-redis-commander | 8081 | ✅ Running |

## 🔧 Outils de Développement

### API Testing
- **Swagger UI** : http://localhost:3001/docs
- **Health Check** : http://localhost:3001/health
- **Métriques** : http://localhost:3001/metrics

### Prisma Studio
```bash
# Ouvrir l'interface Prisma Studio
pnpm db:studio
# URL: http://localhost:5555
```

## 📊 Données de Test Disponibles

### Clients de Démonstration
1. **TechStart SAS**
   - Type : Entreprise
   - Email : contact@techstart.fr
   - SIRET : 98765432109876

2. **Marie Dupont**
   - Type : Particulier
   - Email : marie.dupont@email.fr
   - Téléphone : 06 12 34 56 78

3. **Solutions Pro SARL**
   - Type : Entreprise
   - Email : info@solutions-pro.fr
   - SIRET : 11223344556677

### Produits de Démonstration
1. **Ordinateur Portable Pro**
   - SKU : LAPTOP-PRO-001
   - Prix : 1299.00 €
   - Stock : 15 unités

2. **Souris Ergonomique**
   - SKU : MOUSE-ERG-001
   - Prix : 45.00 €
   - Stock : 50 unités

3. **Service Installation**
   - SKU : SERV-INSTALL-001
   - Prix : 150.00 €
   - Type : Service (pas de stock)

### Catégories de Produits
- **Informatique**
  - Ordinateurs
  - Périphériques
- **Services**
  - Installation
  - Maintenance

## 🔒 Sécurité

### Tokens JWT
- **Secret** : your-super-secret-jwt-key-change-in-production-min-32-chars
- **Refresh Secret** : your-super-secret-refresh-key-change-in-production-min-32-chars
- **Durée Access Token** : 15 minutes
- **Durée Refresh Token** : 7 jours

⚠️ **IMPORTANT** : Ces secrets doivent être changés en production !

### Rate Limiting
- **Limite** : 1000 requêtes par minute par IP
- **Fenêtre** : 1 minute

## 🧪 Tests API

### Exemples de Requêtes

#### Connexion
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo-tpe.fr",
    "password": "demo123"
  }'
```

#### Récupérer les statistiques du dashboard
```bash
curl -X GET http://localhost:3001/api/v1/dashboard/stats \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Créer un client
```bash
curl -X POST http://localhost:3001/api/v1/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "type": "INDIVIDUAL",
    "firstName": "Jean",
    "lastName": "Martin",
    "email": "jean.martin@email.fr",
    "phone": "01 23 45 67 89"
  }'
```

## 📈 Monitoring

### Health Checks
- **Application** : http://localhost:3001/health
- **Base de données** : Inclus dans le health check
- **Redis** : Inclus dans le health check

### Logs
```bash
# Logs de l'application
pnpm dev

# Logs Docker
docker-compose logs -f

# Logs spécifiques à un service
docker-compose logs -f postgres
docker-compose logs -f redis
```

## 🆘 Dépannage

### Problèmes Courants

#### Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001
netstat -tulpn | grep :5432

# Arrêter les services
pnpm docker:down
```

#### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Redémarrer PostgreSQL
docker-compose restart postgres

# Vérifier les logs
docker-compose logs postgres
```

#### Erreur de connexion Redis
```bash
# Vérifier que Redis est démarré
docker-compose ps redis

# Tester la connexion
docker-compose exec redis redis-cli -a redis_password_secure_2024 ping
```

## 📞 Support

En cas de problème :
1. Vérifiez les logs : `pnpm docker:logs`
2. Consultez la documentation : [README.md](./README.md)
3. Vérifiez les issues GitHub
4. Redémarrez les services : `pnpm docker:down && pnpm docker:up`

---

## 🎨 Phase 3 - Frontend Core Components

### 🌐 Pages Disponibles
- **Connexion** : http://localhost:3000/auth/login
- **Inscription** : http://localhost:3000/auth/register
- **Dashboard** : http://localhost:3000/dashboard
- **Clients** : http://localhost:3000/dashboard/clients
- **Nouveau Client** : http://localhost:3000/dashboard/clients/new

### 🔐 Test de Connexion Rapide
1. Accédez à http://localhost:3000
2. Utilisez un des comptes ci-dessus
3. Explorez le dashboard et la gestion des clients

### 🧪 Fonctionnalités Testables
- ✅ **Authentification** : Login/logout avec gestion des rôles
- ✅ **Dashboard** : Statistiques, activité récente, alertes
- ✅ **Clients** : CRUD complet avec filtres et recherche
- ✅ **Navigation** : Sidebar responsive avec permissions
- ✅ **Breadcrumbs** : Navigation contextuelle automatique

---

**Dernière mise à jour** : Phase 3 - Frontend Core Components
**Version** : 1.0.0
**Environnement** : Développement
