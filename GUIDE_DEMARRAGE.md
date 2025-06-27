# 🚀 Guide de Démarrage - Application Gestion Commerciale

## Prérequis

Avant de démarrer l'application, assurez-vous d'avoir :

- **Node.js 20+** installé ([télécharger ici](https://nodejs.org/))
- **Docker Desktop** installé et démarré ([télécharger ici](https://www.docker.com/products/docker-desktop))
- **Git** installé (optionnel)

## Méthode 1 : Démarrage Automatique (Recommandé)

### Option A : Script PowerShell Simple
```powershell
# Ouvrir PowerShell en tant qu'administrateur dans le dossier du projet
.\start-app.ps1 -Force
```

### Option B : Script PowerShell Complet
```powershell
# Si le script simple ne fonctionne pas
powershell -ExecutionPolicy Bypass -File "start-app.ps1" -Force
```

## Méthode 2 : Démarrage Manuel

### Étape 1 : Démarrer les Services Docker

```powershell
# Démarrer PostgreSQL et Redis
docker-compose up -d

# Vérifier que les services sont actifs
docker ps
```

Vous devriez voir :
- `gestion-postgres` (PostgreSQL)
- `gestion-redis` (Redis)

### Étape 2 : Démarrer le Backend

```powershell
# Aller dans le dossier backend
cd apps/backend

# Installer les dépendances (première fois seulement)
npm install

# Générer le client Prisma
npm run prisma:generate

# Démarrer le backend
npm run dev
```

Le backend sera accessible sur : **http://localhost:3001**

### Étape 3 : Démarrer le Frontend (Nouveau Terminal)

```powershell
# Ouvrir un nouveau terminal PowerShell
# Aller dans le dossier frontend
cd apps/frontend

# Installer les dépendances (première fois seulement)
npm install

# Créer le fichier de configuration
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development' > .env.local

# Démarrer le frontend
npm run dev
```

Le frontend sera accessible sur : **http://localhost:3000**

## Vérification du Démarrage

### URLs d'Accès
- **Application Frontend** : http://localhost:3000
- **API Backend** : http://localhost:3001
- **Health Check** : http://localhost:3001/health
- **Documentation API** : http://localhost:3001/docs
- **Adminer (Base de données)** : http://localhost:8080

### Identifiants par Défaut
- **Email** : admin@demo-tpe.fr
- **Mot de passe** : demo123

### Test de Connectivité

```powershell
# Tester le frontend
Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing

# Tester le backend
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
```

## Résolution des Problèmes

### Problème : Ports déjà utilisés

```powershell
# Trouver les processus utilisant les ports
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"

# Arrêter tous les processus Node.js
Get-Process -Name "node" | Stop-Process -Force
```

### Problème : Docker non démarré

```powershell
# Vérifier l'état de Docker
docker --version
docker ps

# Si Docker n'est pas démarré, lancez Docker Desktop
```

### Problème : Erreurs de dépendances

```powershell
# Nettoyer et réinstaller les dépendances backend
cd apps/backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Nettoyer et réinstaller les dépendances frontend
cd ../frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Problème : Base de données

```powershell
# Redémarrer les services Docker
docker-compose down
docker-compose up -d

# Attendre 10 secondes puis tester la connexion
```

## Arrêt de l'Application

### Méthode 1 : Ctrl+C
Dans chaque terminal où les services sont en cours d'exécution, appuyez sur `Ctrl+C`

### Méthode 2 : Script d'arrêt
```powershell
.\arreter-application.ps1 -Force
```

### Méthode 3 : Manuel
```powershell
# Arrêter tous les processus Node.js
Get-Process -Name "node" | Stop-Process -Force

# Arrêter Docker (optionnel)
docker-compose down
```

## Structure des Dossiers

```
Gestion Commerciale/
├── apps/
│   ├── backend/          # API Fastify + TypeScript
│   └── frontend/         # Application Next.js
├── packages/
│   ├── database/         # Schéma Prisma
│   └── shared/          # Types partagés
├── docker-compose.yml   # Configuration Docker
├── start-app.ps1       # Script de démarrage
└── GUIDE_DEMARRAGE.md  # Ce guide
```

## Fonctionnalités Disponibles

- **Dashboard** - Vue d'ensemble des KPI
- **Clients** - Gestion des clients avec segmentation
- **Produits** - Catalogue et gestion des stocks
- **Commandes** - Devis et commandes
- **Factures** - Facturation et paiements
- **Fournisseurs** - Gestion des fournisseurs
- **Analytics** - Tableaux de bord et graphiques
- **Import/Export** - Excel et PDF

## Support

Si vous rencontrez des problèmes :

1. Vérifiez que tous les prérequis sont installés
2. Consultez les logs dans les terminaux
3. Redémarrez les services Docker
4. Nettoyez et réinstallez les dépendances

**Bonne utilisation de votre application de gestion commerciale !** 🎉
