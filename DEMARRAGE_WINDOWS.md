# 🚀 Guide de Démarrage Windows - Gestion Commerciale TPE

## ⚡ Démarrage Rapide

### Option 1 : Script Principal (Recommandé)
```powershell
# Ouvrir PowerShell en tant qu'administrateur
.\start-app-principal.ps1
```

### Option 2 : Démarrage Rapide Quotidien
```powershell
# Pour un usage quotidien (plus rapide)
.\start-quick.ps1
```

### Option 3 : Script Unifié (Complet)
```powershell
# Version complète avec tous les tests
.\start-app-unified.ps1
```

### Option 4 : Démarrage Manuel
```powershell
# 1. Démarrer Docker
docker-compose up -d

# 2. Installer dépendances
pnpm install

# 3. Configurer DB
pnpm --filter "@gestion/database" db:generate
pnpm --filter "@gestion/database" db:push
pnpm --filter "@gestion/database" db:seed

# 4. Démarrer Backend (nouveau terminal)
cd apps\backend
pnpm dev

# 5. Démarrer Frontend (nouveau terminal)
cd apps\frontend
pnpm dev
```

## 🔧 Prérequis Windows

### Obligatoires
1. **Docker Desktop** - [Télécharger](https://docs.docker.com/desktop/windows/)
2. **Node.js 20+** - [Télécharger](https://nodejs.org/)
3. **pnpm** - Installation : `npm install -g pnpm`

### Optionnels
- **WSL2** pour utiliser les scripts Bash
- **Windows Terminal** pour une meilleure expérience

## 🛠️ Installation des Prérequis

### 1. Docker Desktop
```powershell
# Télécharger et installer Docker Desktop
# Redémarrer Windows après installation
# Vérifier : docker --version
```

### 2. Node.js
```powershell
# Télécharger depuis nodejs.org
# Installer la version LTS (20+)
# Vérifier : node --version
```

### 3. pnpm
```powershell
# Installer globalement
npm install -g pnpm

# Vérifier
pnpm --version
```

## 🚨 Problèmes Courants Windows

### Erreur "Execution Policy"
```powershell
# Solution : Changer la politique d'exécution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Ou exécuter directement
powershell -ExecutionPolicy Bypass -File start-basic.ps1
```

### Docker non démarré
```powershell
# Démarrer Docker Desktop manuellement
# Attendre que l'icône Docker soit verte dans la barre des tâches
```

### Ports occupés
```powershell
# Identifier le processus
netstat -ano | findstr :3000

# Arrêter le processus
taskkill /PID <PID> /F
```

### Problèmes de permissions
```powershell
# Exécuter PowerShell en tant qu'administrateur
# Clic droit sur PowerShell > "Exécuter en tant qu'administrateur"
```

## 📝 Scripts Disponibles

| Script | Description | Usage |
|--------|-------------|-------|
| `start-app-principal-fixed.ps1` | **Script principal complet avec Next.js (Corrigé)** | `.\start-app-principal-fixed.ps1` |
| `start-quick-simple.ps1` | **Démarrage rapide Next.js** | `.\start-quick-simple.ps1` |
| `start-nextjs-direct.ps1` | **Frontend Next.js direct** | `.\start-nextjs-direct.ps1` |
| `stop-app-principal-fixed.ps1` | **Arrêt propre complet (Corrigé)** | `.\stop-app-principal-fixed.ps1` |
| `stop-nextjs-quick.ps1` | **Arrêt rapide Next.js** | `.\stop-nextjs-quick.ps1` |
| `verification-production-complete.ps1` | **Vérification complète avec Next.js** | `.\verification-production-complete.ps1` |

### 🚀 Scripts Principaux (Recommandés)

#### **start-app-principal-fixed.ps1** - Script Principal (Corrigé)
- ✅ Démarrage complet automatisé
- ✅ Vérification des prérequis
- ✅ Configuration automatique de la base de données
- ✅ Tests de connectivité
- ✅ Gestion des erreurs et récupération
- ✅ **Compatible PowerShell Windows**
- ✅ **Sans caractères d'encodage problématiques**
- ✅ **Backend de production uniquement**

```powershell
# Démarrage complet backend
.\start-app-principal-fixed.ps1

# Options disponibles
.\start-app-principal-fixed.ps1 -Quick          # Démarrage rapide
.\start-app-principal-fixed.ps1 -SkipDocker     # Sans Docker
.\start-app-principal-fixed.ps1 -Force          # Forcer le redémarrage
.\start-app-principal-fixed.ps1 -Verbose        # Affichage détaillé
```

#### **start-quick-simple.ps1** - Démarrage Rapide Complet (Nouveau)
- ⚡ Optimisé pour l'usage quotidien
- ⚡ Backend + Frontend Next.js automatique
- ⚡ Démarrage en moins de 60 secondes
- ⚡ **Build automatique de production Next.js**
- ⚡ **Compatible PowerShell Windows**

```powershell
# Démarrage rapide complet
.\start-quick-simple.ps1

# Options
.\start-quick-simple.ps1 -SkipBuild       # Sans rebuild du frontend
.\start-quick-simple.ps1 -Force           # Forcer le redémarrage
.\start-quick-simple.ps1 -Verbose         # Affichage détaillé
```

#### **start-nextjs-direct.ps1** - Frontend Next.js Direct (Nouveau)
- 🚀 Démarrage direct de Next.js uniquement
- 🚀 Build automatique si nécessaire
- 🚀 Configuration d'environnement automatique
- 🚀 **Simple et efficace**

```powershell
# Démarrage direct Next.js
.\start-nextjs-direct.ps1
```

### 🛑 Scripts d'Arrêt

#### **stop-app-principal-fixed.ps1** - Arrêt Principal (Corrigé)
- 🛑 Arrêt propre de tous les services
- 🛑 Frontend Next.js + Backend + Docker
- 🛑 Nettoyage des processus et fichiers temporaires
- 🛑 **Compatible PowerShell Windows**

```powershell
# Arrêt complet
.\stop-app-principal-fixed.ps1

# Options
.\stop-app-principal-fixed.ps1 -KeepDocker    # Conserver Docker
.\stop-app-principal-fixed.ps1 -Force         # Arrêt forcé
.\stop-app-principal-fixed.ps1 -Verbose       # Affichage détaillé
```

#### **stop-nextjs-quick.ps1** - Arrêt Rapide Next.js (Nouveau)
- ⚡ Arrêt rapide du frontend Next.js uniquement
- ⚡ Détection intelligente des processus Next.js
- ⚡ Nettoyage automatique

```powershell
# Arrêt rapide Next.js
.\stop-nextjs-quick.ps1

# Options
.\stop-nextjs-quick.ps1 -Force         # Arrêt forcé
.\stop-nextjs-quick.ps1 -Verbose       # Affichage détaillé
```

#### **check-app-status.ps1** - Diagnostic
- 🔍 Vérification complète de l'état
- 🔍 Diagnostic des problèmes
- 🔍 Recommandations automatiques

```powershell
# Vérification standard
.\check-app-status.ps1

# Options
.\check-app-status.ps1 -Detailed         # Diagnostic détaillé
.\check-app-status.ps1 -Fix              # Correction automatique
```

## 🌐 Accès Application

Une fois démarrée :

- **Application Next.js** : http://localhost:3003
- **Test d'hydratation** : http://localhost:3003/test
- **API Backend** : http://localhost:3001
- **Health Check** : http://localhost:3001/health
- **Base de données** : http://localhost:8080 (Adminer)
- **Redis** : http://localhost:8081 (Redis Commander)

## 🔐 Comptes de Test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@demo-tpe.fr | demo123 |
| Manager | manager@demo-tpe.fr | demo123 |
| Employé | employee@demo-tpe.fr | demo123 |

## 📊 Vérification du Démarrage

### Vérifier les services
```powershell
# Processus Node.js
Get-Process -Name "node"

# Conteneurs Docker
docker ps

# Ports ouverts
netstat -an | findstr "3000\|3001\|5432\|6379"
```

### Tester les endpoints
```powershell
# Test API
Invoke-WebRequest -Uri "http://localhost:3001/health"

# Test Frontend
Invoke-WebRequest -Uri "http://localhost:3000"
```

## 📝 Logs et Débogage

### Emplacements des logs
- **Backend** : `logs\backend.log`
- **Frontend** : `logs\frontend.log`

### Commandes utiles
```powershell
# Suivre les logs
Get-Content logs\backend.log -Wait
Get-Content logs\frontend.log -Wait

# Logs Docker
docker-compose logs -f

# Logs spécifiques
docker-compose logs postgres
docker-compose logs redis
```

## 🔄 Redémarrage

### Redémarrage complet
```powershell
# Arrêter
.\stop-basic.ps1

# Attendre 5 secondes
Start-Sleep -Seconds 5

# Redémarrer
.\start-basic.ps1
```

### Redémarrage des services uniquement
```powershell
# Redémarrer Docker
docker-compose restart

# Redémarrer Node.js
Get-Process -Name "node" | Stop-Process -Force
# Puis relancer start-basic.ps1
```

## 🆘 Dépannage Avancé

### Nettoyage complet
```powershell
# Arrêter tout
.\stop-basic.ps1

# Nettoyer Docker
docker-compose down -v
docker system prune -f

# Nettoyer Node.js
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\*\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\*\node_modules -ErrorAction SilentlyContinue

# Réinstaller
pnpm install
```

### Problèmes de réseau
```powershell
# Vérifier la connectivité
Test-NetConnection -ComputerName localhost -Port 3000
Test-NetConnection -ComputerName localhost -Port 3001

# Redémarrer les services réseau
Restart-Service -Name "Docker Desktop Service" -Force
```

## 📞 Support

### Informations système utiles
```powershell
# Version Windows
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion

# Versions des outils
docker --version
node --version
pnpm --version

# Espace disque
Get-PSDrive C
```

### En cas de problème persistant
1. Redémarrer Windows
2. Vérifier que Docker Desktop est démarré
3. Exécuter PowerShell en tant qu'administrateur
4. Utiliser `.\start-basic.ps1`

---

**🎉 L'application devrait maintenant fonctionner sur Windows !**

Accédez à http://localhost:3000 et connectez-vous avec les comptes de test.
