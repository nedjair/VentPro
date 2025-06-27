# 🚀 Guide de Production - Gestion Commerciale TPE

## Démarrage rapide (2 minutes)

### 1. Prérequis
- Docker Desktop installé et démarré
- Ports 3000, 3001, 5432 libres

### 2. Démarrage simple
```powershell
# Dans le répertoire du projet
.\start-simple.ps1
```

### 3. Accès à l'application
- **Application web** : http://localhost:3000
- **API Backend** : http://localhost:3001
- **Documentation API** : http://localhost:3001/docs
- **Health Check** : http://localhost:3001/health

## 🏗️ Architecture déployée

### Services Docker
- **PostgreSQL** (port 5432) : Base de données
- **Backend API** (port 3001) : API REST avec serveur simple
- **Frontend Nginx** (port 3000) : Interface web + reverse proxy

### Fonctionnalités disponibles
- ✅ Authentification JWT
- ✅ Gestion des clients (CRUD)
- ✅ Dashboard avec statistiques
- ✅ Documentation API interactive
- ✅ Health checks
- ✅ Interface web de monitoring

## 🔐 Compte de test

```
Email: admin@test.com
Password: password123
```

## 📊 Interface de monitoring

L'interface web à http://localhost:3000 inclut :
- **Statut des services** en temps réel
- **Logs** de l'application
- **Tests intégrés** (login, clients)
- **Liens directs** vers API et docs

## 🛠️ Commandes utiles

### Gestion des services
```powershell
# Voir les logs
docker-compose -f docker-compose.simple.yml logs -f

# Statut des conteneurs
docker-compose -f docker-compose.simple.yml ps

# Arrêter les services
docker-compose -f docker-compose.simple.yml down

# Redémarrer un service
docker-compose -f docker-compose.simple.yml restart backend
```

### Tests API
```powershell
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'

# Clients (avec token)
curl http://localhost:3001/api/v1/clients \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Dépannage

### Services ne démarrent pas
```powershell
# Vérifier les ports occupés
netstat -an | findstr "3000\|3001\|5432"

# Forcer l'arrêt des conteneurs
docker-compose -f docker-compose.simple.yml down --remove-orphans

# Nettoyer complètement
docker system prune -f
```

### API inaccessible
```powershell
# Vérifier les logs du backend
docker logs gestion_backend

# Redémarrer le backend
docker-compose -f docker-compose.simple.yml restart backend
```

### Base de données
```powershell
# Accès direct à PostgreSQL
docker exec -it gestion_postgres psql -U gestion_user -d gestion_commerciale

# Test de connexion
docker exec gestion_postgres pg_isready -U gestion_user
```

## 📈 Données de test

Le système contient des données de test :
- **Utilisateurs** : 1 admin
- **Clients** : 2 clients fictifs
- **Produits** : Données de démonstration
- **Statistiques** : Données générées

## 🔄 Mise à jour

Pour mettre à jour l'application :
```powershell
# Arrêter les services
docker-compose -f docker-compose.simple.yml down

# Récupérer les changements
git pull

# Redémarrer
.\start-simple.ps1
```

## ⚡ Performance

L'architecture simple est optimisée pour :
- **Démarrage rapide** : ~30 secondes
- **Consommation mémoire** : ~500MB
- **Résilience** : Health checks et auto-restart
- **Development-friendly** : Logs détaillés

## 🎯 Pour aller plus loin

Cette version de production simple est idéale pour :
- Démonstration
- Tests d'intégration
- Validation fonctionnelle
- Environnement de développement

Pour une production réelle, considérez :
- SSL/HTTPS
- Monitoring avancé
- Sauvegardes automatiques
- Load balancing
- Secrets management

---

## 🚀 Commande magique

```powershell
.\start-simple.ps1 && start http://localhost:3000
```

Cette commande démarre tout et ouvre automatiquement l'interface web ! 🎉