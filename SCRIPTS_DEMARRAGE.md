# 🚀 Scripts de Démarrage Automatisé - Gestion Commerciale TPE

## 📋 Vue d'Ensemble

Scripts de démarrage automatisé unifiés pour l'application Gestion Commerciale TPE avec Analytics Phase 5. Démarrage complet en une seule commande avec vérifications de santé et gestion d'erreurs avancée.

## 🏗️ Architecture Unifiée

### **Backend de Production**
- **Fichier** : `production-backend.js`
- **Port** : 3001
- **Framework** : Fastify (haute performance)
- **Fonctionnalités** : API complète + Analytics Phase 5

### **Frontend Next.js**
- **Dossier** : `frontend-nextjs-production/`
- **Port** : 3003
- **Framework** : Next.js 14 + TypeScript
- **Fonctionnalités** : Interface moderne + Tableaux de bord Analytics

### **Infrastructure Docker**
- **PostgreSQL 16** : Port 5432 (direct) / 6432 (PgBouncer)
- **Redis 7** : Port 6379
- **Adminer** : Port 8080 (interface PostgreSQL)
- **Redis Commander** : Port 8081 (interface Redis)

## 🔧 Prérequis

### Obligatoires
- **Docker Desktop** (Windows/Mac) ou **Docker + Docker Compose** (Linux)
- **Node.js 20+** - [Télécharger](https://nodejs.org/)
- **yarn** - Installation : `npm install -g yarn`

### Vérification des prérequis
```bash
# Vérifier Docker
docker --version
docker-compose --version

# Vérifier Node.js (version 20+ requise)
node --version

# Vérifier yarn
yarn --version
```

## 🚀 Démarrage de l'Application

### Windows (PowerShell) - RECOMMANDÉ
```powershell
# Script unifié - Démarrage complet
.\start-app-unified.ps1
```

### Linux/Mac (Bash)
```bash
# Rendre le script exécutable
chmod +x start-app-unified.sh

# Démarrer l'application
./start-app-unified.sh
```

### Démarrage Manuel (Développeurs)
```bash
# 1. Infrastructure Docker
docker-compose up -d

# 2. Backend de production
node production-backend.js

# 3. Frontend Next.js (nouveau terminal)
cd frontend-nextjs-production
yarn dev
```

## 🛑 Arrêt de l'Application

### Windows (PowerShell)
```powershell
# Script unifié - Arrêt complet
.\stop-app-unified.ps1
```

### Linux/Mac (Bash)
```bash
# Arrêt unifié
./stop-app-unified.sh
```

### Arrêt d'urgence
```bash
# Arrêter tous les conteneurs Docker
docker-compose down

# Tuer tous les processus Node.js
pkill -f node  # Linux/Mac
Get-Process -Name "node" | Stop-Process -Force  # Windows
```

## 🌐 URLs d'Accès

Une fois l'application démarrée, vous pouvez accéder aux services suivants :

| Service | URL | Description |
|---------|-----|-------------|
| **🌐 Application** | http://localhost:3003 | Interface Next.js avec Analytics |
| **📊 Analytics** | http://localhost:3003/analytics | Tableaux de bord avancés Phase 5 |
| **🔧 API Backend** | http://localhost:3001 | API REST Fastify |
| **🩺 Health Check** | http://localhost:3001/health | Status du serveur |
| **📈 Métriques** | http://localhost:3001/metrics | Métriques système |
| **🗄️ Base de données** | http://localhost:8080 | Adminer (interface PostgreSQL) |
| **🔴 Cache Redis** | http://localhost:8081 | Redis Commander |

## 🔐 Comptes de Test

| Rôle | Email | Mot de passe | Permissions |
|------|-------|--------------|-------------|
| **👑 Admin** | admin@demo-tpe.fr | demo123 | Accès complet + Analytics avancés |
| **👨‍💼 Manager** | manager@demo-tpe.fr | demo123 | Gestion + Analytics de base |
| **👨‍💻 Employé** | employee@demo-tpe.fr | demo123 | Consultation limitée |

## 📊 Services Démarrés

### 🐳 Services Docker
- **PostgreSQL 16** (port 5432/6432) - Base de données principale avec PgBouncer
- **Redis 7** (port 6379) - Cache et sessions
- **Adminer** (port 8080) - Interface de gestion PostgreSQL
- **Redis Commander** (port 8081) - Interface de gestion Redis

### 🚀 Applications
- **Backend Fastify** (port 3001) - API REST + Analytics Phase 5
- **Frontend Next.js** (port 3003) - Interface moderne avec tableaux de bord

### 📊 Fonctionnalités Analytics Phase 5
- **KPI Temps Réel** - CA, marge, conversion, panier moyen
- **Analytics de Ventes** - Évolution, top clients, répartition
- **Performance Produits** - Top ventes, catégories, rentabilité
- **Segmentation Clients** - VIP/Premium/Standard/Nouveau
- **Graphiques Interactifs** - Recharts avec courbes, barres, secteurs
- **Tableaux de Bord** - Personnalisables et temps réel

## 🔍 Vérification du Démarrage

### Vérifications automatiques
Les scripts effectuent automatiquement :
- ✅ Vérification des prérequis (Docker, Node.js, yarn)
- ✅ Vérification de la disponibilité des ports
- ✅ Installation des dépendances avec yarn
- ✅ Démarrage des services dans le bon ordre
- ✅ Vérification de la santé des services
- ✅ Test des endpoints Analytics Phase 5
- ✅ Validation de l'authentification

### Vérifications manuelles
```bash
# Vérifier les conteneurs Docker
docker-compose ps

# Vérifier les logs
docker-compose logs -f

# Vérifier les processus Node.js
ps aux | grep node  # Linux/Mac
Get-Process -Name "node"  # Windows

# Tester les endpoints
curl http://localhost:3001/health
curl http://localhost:3003
curl http://localhost:3001/analytics/kpi
```

## 📝 Logs et Débogage

### Emplacements des logs
- **Backend** : `logs/backend.log` et `logs/backend-error.log`
- **Frontend** : Logs dans le terminal ou via `yarn dev`
- **Docker** : `docker-compose logs`

### Commandes de débogage
```bash
# Suivre les logs en temps réel
tail -f logs/backend.log          # Linux/Mac
Get-Content logs\backend.log -Wait # Windows

# Logs d'erreur backend
tail -f logs/backend-error.log          # Linux/Mac
Get-Content logs\backend-error.log -Wait # Windows

# Logs Docker
docker-compose logs -f

# Logs spécifiques
docker-compose logs postgres
docker-compose logs redis
```

## 🔧 Dépannage

### Problèmes courants

#### Port déjà utilisé
```bash
# Identifier le processus utilisant le port
lsof -i :3001  # Linux/Mac
netstat -ano | findstr :3001  # Windows

# Arrêter le processus
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows

# Ou utiliser les scripts d'arrêt
.\stop-app-unified.ps1 --force  # Windows
./stop-app-unified.sh --force   # Linux/Mac
```

#### Docker non démarré
```bash
# Démarrer Docker Desktop (Windows/Mac)
# Ou démarrer le service Docker (Linux)
sudo systemctl start docker

# Vérifier l'état
docker ps
```

#### Problèmes de permissions (Linux/Mac)
```bash
# Rendre les scripts exécutables
chmod +x start-app-unified.sh stop-app-unified.sh

# Exécuter avec sudo si nécessaire
sudo ./start-app-unified.sh
```

#### Base de données corrompue
```bash
# Réinitialiser complètement
docker-compose down -v
docker-compose up -d

# Attendre l'initialisation puis redémarrer l'app
.\start-app-unified.ps1  # Windows
./start-app-unified.sh   # Linux/Mac
```

#### Dépendances manquantes
```bash
# Nettoyer et réinstaller (dans frontend-nextjs-production/)
rm -rf node_modules  # Linux/Mac
Remove-Item -Recurse -Force node_modules  # Windows

yarn install
```

#### Échec d'authentification
```bash
# Vérifier que le backend répond
curl http://localhost:3001/health

# Tester l'authentification manuellement
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-tpe.fr","password":"demo123"}'
```

### Commandes de diagnostic
```bash
# Vérifier l'état des services
docker-compose ps
yarn list --depth=0  # Dans frontend-nextjs-production/

# Vérifier la connectivité
ping localhost
telnet localhost 3001  # Backend
telnet localhost 3003  # Frontend

# Vérifier les variables d'environnement
cat .env.production  # Linux/Mac
Get-Content .env.production  # Windows

# Dans frontend-nextjs-production/
cat .env.local  # Linux/Mac
Get-Content .env.local  # Windows
```

## 🎯 Tests de Validation

### Test complet de l'application Analytics Phase 5
1. **Démarrage** : Exécuter `.\start-app-unified.ps1` (Windows) ou `./start-app-unified.sh` (Linux/Mac)
2. **Vérification** : Attendre que tous les services soient opérationnels
3. **Connexion** : Ouvrir http://localhost:3003 et se connecter avec `admin@demo-tpe.fr` / `demo123`
4. **Dashboard** : Vérifier l'affichage des KPI et statistiques générales
5. **Analytics** : Naviguer vers `/analytics` et tester les graphiques interactifs
6. **Clients** : Créer, modifier, rechercher un client et vérifier la segmentation
7. **Produits** : Créer un produit et vérifier les analytics de performance
8. **API** : Tester les endpoints Analytics via les outils de développement
9. **Arrêt** : Exécuter le script d'arrêt unifié

### Tests de performance et monitoring
```bash
# Test de santé du backend
curl http://localhost:3001/health

# Test des endpoints Analytics (avec token)
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3001/analytics/kpi

# Monitoring des ressources
docker stats
htop  # Linux/Mac
Get-Process | Where-Object {$_.ProcessName -eq "node"}  # Windows
```

### Tests automatisés
```bash
# Test rapide de connectivité
curl http://localhost:3001/health
curl http://localhost:3003

# Test d'authentification
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-tpe.fr","password":"demo123"}'
```

## 🔄 Mise à Jour

### Mise à jour des dépendances Frontend
```bash
# Arrêter l'application
.\stop-app-unified.ps1  # Windows
./stop-app-unified.sh   # Linux/Mac

# Mettre à jour les dépendances
cd frontend-nextjs-production
yarn upgrade

# Redémarrer
cd ..
.\start-app-unified.ps1  # Windows
./start-app-unified.sh   # Linux/Mac
```

### Mise à jour du Backend
```bash
# Arrêter l'application
.\stop-app-unified.ps1

# Mettre à jour les dépendances racine
yarn upgrade

# Redémarrer
.\start-app-unified.ps1
```

## 📞 Support et Diagnostic

### En cas de problème
1. **Vérifier les logs** : `logs/backend.log` et `logs/backend-error.log`
2. **Consulter Docker** : `docker-compose logs`
3. **Vérifier les prérequis** : Node.js 20+, yarn, Docker
4. **Redémarrage complet** : Scripts d'arrêt puis de démarrage
5. **Mode verbose** : Utiliser `--verbose` pour plus de détails

### Informations système utiles
```bash
# Informations système
uname -a  # Linux/Mac
systeminfo  # Windows

# Versions des outils
docker --version
node --version
yarn --version

# État des services
docker-compose ps
netstat -tulpn | grep :300  # Linux
netstat -ano | findstr :300  # Windows

# Espace disque
df -h  # Linux/Mac
Get-PSDrive  # Windows
```

### Options avancées des scripts

#### Windows (PowerShell)
```powershell
# Démarrage avec options
.\start-app-unified.ps1 -SkipDocker -Verbose -DevMode

# Arrêt avec options
.\stop-app-unified.ps1 -KeepDocker -Force -Verbose
```

#### Linux/Mac (Bash)
```bash
# Démarrage avec options
./start-app-unified.sh --skip-docker --verbose --dev

# Arrêt avec options
./stop-app-unified.sh --keep-docker --force --verbose
```

---

## 🎉 Application Gestion Commerciale TPE - Analytics Phase 5

**L'application est maintenant prête avec les fonctionnalités Analytics avancées !**

### 🚀 Démarrage Rapide
```bash
# Windows
.\start-app-unified.ps1

# Linux/Mac
./start-app-unified.sh
```

### 🌐 Accès Principal
- **Application** : http://localhost:3003
- **Analytics** : http://localhost:3003/analytics
- **API** : http://localhost:3001

### 🔑 Connexion
- **Email** : admin@demo-tpe.fr
- **Mot de passe** : demo123

Explorez les tableaux de bord Analytics, les KPI temps réel et les graphiques interactifs !
