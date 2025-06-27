# 🚀 Guide de Démarrage Rapide

Bienvenue dans l'application de gestion commerciale TPE ! Ce guide vous permettra de démarrer rapidement.

## 📋 Checklist de Démarrage

### ✅ Prérequis Installés
- [ ] Node.js 20 LTS ou supérieur
- [ ] Docker Desktop
- [ ] Git
- [ ] pnpm (sera installé automatiquement si absent)

### ✅ Installation
- [ ] Repository cloné
- [ ] Script de setup exécuté
- [ ] Services Docker démarrés
- [ ] Base de données configurée
- [ ] Données de test insérées

### ✅ Vérification
- [ ] Frontend accessible sur http://localhost:3000
- [ ] Backend accessible sur http://localhost:3001/health
- [ ] Connexion possible avec les comptes de test

## 🎯 Première Connexion

1. **Ouvrez votre navigateur** sur http://localhost:3000
2. **Connectez-vous** avec un compte de test :
   - **Admin** : admin@demo-tpe.fr / demo123
   - **Manager** : manager@demo-tpe.fr / demo123
   - **Employé** : employee@demo-tpe.fr / demo123

## 🧭 Navigation dans l'Application

### Tableau de Bord
- Vue d'ensemble des KPI
- Graphiques de performance
- Commandes récentes

### Gestion des Clients
- Liste des clients
- Création/modification de fiches clients
- Historique des interactions

### Catalogue Produits
- Gestion du catalogue
- Catégories et prix
- Gestion des stocks

### Commandes et Devis
- Création de devis
- Conversion en commandes
- Suivi des statuts

### Facturation
- Génération de factures
- Suivi des paiements
- Relances automatiques

## 🛠️ Commandes Utiles

### Développement
```bash
# Démarrer l'application
pnpm dev

# Voir les logs Docker
pnpm docker:logs

# Redémarrer les services
pnpm docker:down && pnpm docker:up
```

### Base de Données
```bash
# Ouvrir Prisma Studio
pnpm db:studio

# Réinitialiser avec nouvelles données
pnpm db:reset

# Voir l'interface Adminer
# http://localhost:8080
```

### Tests et Qualité
```bash
# Lancer les tests
pnpm test

# Vérifier le code
pnpm lint

# Vérifier les types
pnpm type-check
```

## 🔧 Outils de Développement

### Interfaces d'Administration
- **Adminer** (Base de données) : http://localhost:8080
  - Serveur : postgres
  - Utilisateur : gestion_user
  - Mot de passe : gestion_password_secure_2024
  - Base : gestion_commerciale

- **Redis Commander** (Cache) : http://localhost:8081
  - Utilisateur : admin
  - Mot de passe : admin_password_2024

### Documentation API
- **Swagger UI** : http://localhost:3001/docs
- **Health Check** : http://localhost:3001/health
- **Métriques** : http://localhost:3001/metrics

## 📚 Ressources Utiles

### Documentation
- [README.md](./README.md) - Vue d'ensemble complète
- [SETUP.md](./SETUP.md) - Guide d'installation détaillé
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - Architecture technique
- [plan de développement.txt](./plan%20de%20développement.txt) - Roadmap détaillée

### Développement
- **Frontend** : Next.js 14, Tailwind CSS, Shadcn/ui
- **Backend** : Fastify, TypeScript, Prisma
- **Base de données** : PostgreSQL 16, Redis 7
- **Outils** : Docker, pnpm, ESLint, Prettier

## 🆘 Résolution de Problèmes

### L'application ne démarre pas
```bash
# Vérifier les services Docker
docker-compose ps

# Voir les logs d'erreur
pnpm docker:logs

# Redémarrer complètement
pnpm docker:down
pnpm docker:up
```

### Erreur de base de données
```bash
# Vérifier la connexion
docker-compose exec postgres pg_isready -U gestion_user

# Réinitialiser la base
pnpm db:reset
```

### Port déjà utilisé
```bash
# Voir les processus utilisant les ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Arrêter les services conflictuels
pnpm docker:down
```

## 🎯 Prochaines Étapes

1. **Explorez l'interface** avec les comptes de test
2. **Consultez la documentation API** sur http://localhost:3001/docs
3. **Lisez le plan de développement** pour comprendre la roadmap
4. **Commencez le développement** selon vos besoins

## 💡 Conseils de Développement

### Bonnes Pratiques
- Utilisez les types TypeScript fournis dans `@gestion/shared`
- Suivez les conventions de nommage établies
- Écrivez des tests pour les nouvelles fonctionnalités
- Documentez les changements importants

### Structure du Code
- **Frontend** : Composants réutilisables dans `components/ui`
- **Backend** : Logique métier dans `services/`
- **Shared** : Types et utilitaires communs
- **Database** : Schéma Prisma centralisé

### Workflow Git
- Créez des branches pour chaque fonctionnalité
- Utilisez des commits descriptifs
- Les hooks pre-commit vérifient automatiquement le code

Bon développement ! 🚀

---

**Besoin d'aide ?** Consultez la documentation ou ouvrez une issue sur le repository.
