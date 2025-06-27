# 🚀 Scripts de Démarrage Unifiés - Gestion Commerciale TPE

## 📋 Vue d'Ensemble

Scripts de démarrage automatisé **unifiés et modernisés** pour l'application Gestion Commerciale TPE avec Analytics Phase 5. Ces scripts remplacent tous les anciens scripts de démarrage par une approche standardisée et robuste.

## 🎯 Objectifs de la Mise à Jour

### ✅ Problèmes Résolus
- **Scripts multiples et redondants** → Script unique par OS
- **Incohérences de ports** → Stratégie unifiée (Backend 3001, Frontend 3003)
- **Gestion d'erreurs limitée** → Vérifications complètes et gestion robuste
- **Documentation dispersée** → Documentation centralisée et claire
- **Dépendances obsolètes** → Migration vers yarn et architecture moderne

### 🚀 Améliorations Apportées
- **Architecture unifiée** : Backend `production-backend.js` + Frontend Next.js
- **Gestion d'erreurs avancée** : Vérifications de santé et timeouts
- **Support Analytics Phase 5** : Test des endpoints Analytics complets
- **Options flexibles** : Modes verbose, développement, skip Docker
- **Scripts cross-platform** : Windows (PowerShell) et Linux/Mac (Bash)
- **Nettoyage automatique** : Arrêt propre des processus et nettoyage

## 📁 Fichiers Créés

### Scripts Principaux
- **`start-app-unified.ps1`** - Script de démarrage Windows (PowerShell)
- **`start-app-unified.sh`** - Script de démarrage Linux/Mac (Bash)
- **`stop-app-unified.ps1`** - Script d'arrêt Windows (PowerShell)
- **`stop-app-unified.sh`** - Script d'arrêt Linux/Mac (Bash)

### Scripts de Test et Documentation
- **`test-scripts-unified.ps1`** - Script de validation des scripts unifiés
- **`README-SCRIPTS-UNIFIED.md`** - Documentation des scripts unifiés
- **`SCRIPTS_DEMARRAGE.md`** - Documentation générale mise à jour

## 🚀 Utilisation Rapide

### Windows (PowerShell)
```powershell
# Démarrage complet
.\start-app-unified.ps1

# Arrêt complet
.\stop-app-unified.ps1

# Test des scripts
.\test-scripts-unified.ps1
```

### Linux/Mac (Bash)
```bash
# Rendre exécutables (première fois)
chmod +x start-app-unified.sh stop-app-unified.sh

# Démarrage complet
./start-app-unified.sh

# Arrêt complet
./stop-app-unified.sh
```

## ⚙️ Options Avancées

### Script de Démarrage

#### Windows
```powershell
# Options disponibles
.\start-app-unified.ps1 -SkipDocker -Verbose -DevMode

# -SkipDocker  : Ignorer le démarrage des services Docker
# -Verbose     : Affichage détaillé des opérations
# -DevMode     : Mode développement (fonctionnalités supplémentaires)
```

#### Linux/Mac
```bash
# Options disponibles
./start-app-unified.sh --skip-docker --verbose --dev

# --skip-docker : Ignorer le démarrage des services Docker
# --verbose     : Affichage détaillé des opérations
# --dev         : Mode développement
```

### Script d'Arrêt

#### Windows
```powershell
# Options disponibles
.\stop-app-unified.ps1 -KeepDocker -Force -Verbose

# -KeepDocker  : Conserver les services Docker actifs
# -Force       : Arrêt forcé de tous les processus Node.js
# -Verbose     : Affichage détaillé des opérations
```

#### Linux/Mac
```bash
# Options disponibles
./stop-app-unified.sh --keep-docker --force --verbose

# --keep-docker : Conserver les services Docker actifs
# --force       : Arrêt forcé de tous les processus Node.js
# --verbose     : Affichage détaillé des opérations
```

## 🔍 Fonctionnalités Avancées

### Vérifications Automatiques
- ✅ **Prérequis** : Node.js 20+, yarn, Docker
- ✅ **Ports** : Vérification de disponibilité et libération automatique
- ✅ **Dépendances** : Installation automatique si manquantes
- ✅ **Santé des services** : Health checks avec timeouts
- ✅ **Authentification** : Test complet du système d'auth
- ✅ **Analytics Phase 5** : Validation des endpoints Analytics

### Gestion d'Erreurs
- **Timeouts configurables** : Évite les blocages infinis
- **Retry automatique** : Tentatives multiples pour les services lents
- **Nettoyage automatique** : Arrêt propre en cas d'échec
- **Messages détaillés** : Diagnostic précis des problèmes
- **Logs centralisés** : Tous les logs dans le dossier `logs/`

### Support Multi-Environnement
- **Développement** : Mode dev avec options supplémentaires
- **Production** : Configuration optimisée pour la production
- **Test** : Mode test avec validations étendues
- **Docker** : Support complet avec option de skip

## 📊 Architecture Unifiée

### Backend
- **Fichier** : `production-backend.js`
- **Port** : 3001
- **Framework** : Fastify
- **Fonctionnalités** : API complète + Analytics Phase 5

### Frontend
- **Dossier** : `frontend-nextjs-production/`
- **Port** : 3003
- **Framework** : Next.js 14 + TypeScript
- **Fonctionnalités** : Interface moderne + Tableaux de bord

### Infrastructure
- **PostgreSQL 16** : Port 5432 (direct) / 6432 (PgBouncer)
- **Redis 7** : Port 6379
- **Adminer** : Port 8080
- **Redis Commander** : Port 8081

## 🧪 Tests et Validation

### Script de Test Automatisé
```powershell
# Test complet
.\test-scripts-unified.ps1

# Test rapide (essentiels uniquement)
.\test-scripts-unified.ps1 -Quick

# Test avec détails
.\test-scripts-unified.ps1 -Verbose
```

### Tests Manuels
```bash
# Vérifier les services
curl http://localhost:3001/health
curl http://localhost:3003

# Test d'authentification
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-tpe.fr","password":"demo123"}'

# Test Analytics (avec token)
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3001/analytics/kpi
```

## 📝 Logs et Débogage

### Emplacements des Logs
- **Backend** : `logs/backend.log` et `logs/backend-error.log`
- **Frontend** : Logs dans le terminal yarn dev
- **Docker** : `docker-compose logs`

### Commandes de Débogage
```bash
# Suivre les logs backend
tail -f logs/backend.log          # Linux/Mac
Get-Content logs\backend.log -Wait # Windows

# Vérifier les processus
ps aux | grep node               # Linux/Mac
Get-Process -Name "node"         # Windows

# Vérifier les ports
netstat -tulpn | grep :300       # Linux
netstat -ano | findstr :300      # Windows
```

## 🔧 Dépannage

### Problèmes Courants

#### Ports occupés
```bash
# Utiliser l'arrêt forcé
.\stop-app-unified.ps1 -Force     # Windows
./stop-app-unified.sh --force     # Linux/Mac
```

#### Dépendances manquantes
```bash
# Dans frontend-nextjs-production/
yarn install
```

#### Docker non démarré
```bash
# Vérifier Docker
docker ps

# Démarrer sans Docker
.\start-app-unified.ps1 -SkipDocker
```

#### Échec d'authentification
```bash
# Vérifier le backend
curl http://localhost:3001/health

# Redémarrer complètement
.\stop-app-unified.ps1 -Force
.\start-app-unified.ps1
```

## 🎯 Migration depuis les Anciens Scripts

### Scripts Remplacés
Les nouveaux scripts unifiés remplacent :
- `start-app-final.ps1`
- `start-application-complete.ps1`
- `start-phase5-analytics.ps1`
- `stop-production-backend.ps1`
- Et tous les autres scripts de démarrage

### Avantages de la Migration
- **Simplicité** : Un seul script par OS au lieu de multiples
- **Robustesse** : Gestion d'erreurs et vérifications complètes
- **Modernité** : Support des dernières fonctionnalités Analytics
- **Maintenance** : Code unifié et documenté

## 🎉 Conclusion

Les scripts unifiés offrent une expérience de démarrage **simple, robuste et moderne** pour l'application Gestion Commerciale TPE avec Analytics Phase 5.

### 🚀 Commandes Essentielles
```bash
# Démarrage
.\start-app-unified.ps1    # Windows
./start-app-unified.sh     # Linux/Mac

# Arrêt
.\stop-app-unified.ps1     # Windows
./stop-app-unified.sh      # Linux/Mac

# Test
.\test-scripts-unified.ps1 # Windows
```

### 🌐 Accès Application
- **Frontend** : http://localhost:3003
- **Analytics** : http://localhost:3003/analytics
- **Backend API** : http://localhost:3001

### 🔑 Connexion
- **Email** : admin@demo-tpe.fr
- **Mot de passe** : demo123

---

**L'application est maintenant prête avec les scripts de démarrage automatisé unifiés !**
