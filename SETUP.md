# 🚀 Guide d'Installation - Gestion Commerciale TPE

Ce guide vous accompagne dans l'installation et la configuration complète de l'application de gestion commerciale pour TPE.

## 📋 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

### Obligatoire
- **Node.js 20 LTS** ou supérieur ([télécharger](https://nodejs.org/))
- **Docker Desktop** ([télécharger](https://www.docker.com/products/docker-desktop/))
- **Git** ([télécharger](https://git-scm.com/))

### Recommandé
- **pnpm 8+** (sera installé automatiquement si absent)
- **VS Code** avec les extensions TypeScript et Prisma

## ⚡ Installation Automatique (Recommandée)

### Sur Linux/macOS
```bash
# Cloner le repository
git clone <repository-url>
cd gestion-commerciale-tpe

# Rendre le script exécutable et l'exécuter
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Sur Windows (PowerShell)
```powershell
# Cloner le repository
git clone <repository-url>
cd gestion-commerciale-tpe

# Exécuter le script de configuration
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup.ps1
```

Le script automatique va :
1. ✅ Vérifier tous les prérequis
2. ✅ Configurer les variables d'environnement
3. ✅ Installer toutes les dépendances
4. ✅ Démarrer l'infrastructure Docker
5. ✅ Configurer la base de données
6. ✅ Insérer les données de test
7. ✅ Vérifier l'installation

## 🔧 Installation Manuelle

Si vous préférez une installation étape par étape :

### 1. Cloner et installer les dépendances
```bash
git clone <repository-url>
cd gestion-commerciale-tpe

# Installer pnpm si nécessaire
npm install -g pnpm@latest

# Installer toutes les dépendances
pnpm install
```

### 2. Configurer les variables d'environnement
```bash
# Copier les fichiers d'exemple
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# Modifier les fichiers selon vos besoins (optionnel pour le développement)
```

### 3. Démarrer l'infrastructure
```bash
# Démarrer PostgreSQL, Redis et PgBouncer
pnpm docker:up

# Attendre que les services soient prêts (30-60 secondes)
pnpm docker:logs
```

### 4. Configurer la base de données
```bash
# Générer le client Prisma
pnpm db:generate

# Appliquer le schéma
pnpm db:push

# Insérer les données de test
pnpm db:seed
```

### 5. Démarrer l'application
```bash
# Démarrer backend et frontend
pnpm dev
```

## 🔍 Vérification de l'Installation

Après l'installation, vérifiez que tout fonctionne :

### Services Docker
```bash
# Vérifier que tous les services sont en cours d'exécution
docker-compose ps

# Vous devriez voir :
# - gestion-postgres (Up)
# - gestion-redis (Up)
# - gestion-pgbouncer (Up)
# - gestion-adminer (Up) [profil dev]
# - gestion-redis-commander (Up) [profil dev]
```

### Connectivité Base de Données
```bash
# Test de connexion PostgreSQL
docker-compose exec postgres pg_isready -U gestion_user -d gestion_commerciale

# Test de connexion Redis
docker-compose exec redis redis-cli -a redis_password_secure_2024 ping
```

### URLs de Test
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:3001/health
- **Documentation API** : http://localhost:3001/docs
- **Adminer (DB)** : http://localhost:8080
- **Redis Commander** : http://localhost:8081

## 🔐 Comptes de Test

L'installation crée automatiquement des comptes de démonstration :

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Admin | admin@demo-tpe.fr | demo123 |
| Manager | manager@demo-tpe.fr | demo123 |
| Employé | employee@demo-tpe.fr | demo123 |

## 🛠️ Commandes Utiles

### Développement
```bash
pnpm dev              # Démarrer en mode développement
pnpm build            # Construire pour la production
pnpm start            # Démarrer en mode production
pnpm test             # Exécuter tous les tests
pnpm lint             # Vérifier le code avec ESLint
pnpm type-check       # Vérification TypeScript
```

### Base de données
```bash
pnpm db:generate      # Générer le client Prisma
pnpm db:push          # Appliquer le schéma à la DB
pnpm db:migrate       # Créer et appliquer une migration
pnpm db:seed          # Insérer les données de test
pnpm db:studio        # Ouvrir Prisma Studio
```

### Docker
```bash
pnpm docker:up        # Démarrer les services
pnpm docker:down      # Arrêter les services
pnpm docker:logs      # Voir les logs en temps réel
```

## 🚨 Résolution des Problèmes

### Erreur de port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -tulpn | grep :5432  # PostgreSQL
netstat -tulpn | grep :6379  # Redis
netstat -tulpn | grep :3000  # Frontend
netstat -tulpn | grep :3001  # Backend

# Arrêter les services conflictuels
pnpm docker:down
```

### Problème de permissions Docker (Linux)
```bash
# Ajouter votre utilisateur au groupe docker
sudo usermod -aG docker $USER
newgrp docker

# Ou utiliser sudo pour les commandes docker
sudo docker-compose up -d
```

### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres

# Redémarrer si nécessaire
docker-compose restart postgres
```

### Problème avec pnpm
```bash
# Nettoyer le cache
pnpm store prune

# Réinstaller les dépendances
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

## 🔄 Mise à Jour

Pour mettre à jour l'application :

```bash
# Récupérer les dernières modifications
git pull origin main

# Mettre à jour les dépendances
pnpm install

# Appliquer les nouvelles migrations
pnpm db:migrate

# Redémarrer les services
pnpm docker:down
pnpm docker:up
```

## 📞 Support

Si vous rencontrez des problèmes :

1. Consultez les logs : `pnpm docker:logs`
2. Vérifiez les [issues GitHub](../../issues)
3. Consultez la [documentation complète](./README.md)

## 🎯 Prochaines Étapes

Une fois l'installation terminée :

1. 📖 Lisez le [README.md](./README.md) pour comprendre l'architecture
2. 🧪 Explorez l'application avec les comptes de test
3. 📚 Consultez la [documentation API](http://localhost:3001/docs)
4. 🛠️ Commencez le développement selon le [plan de développement](./plan%20de%20développement.txt)

Bon développement ! 🚀
