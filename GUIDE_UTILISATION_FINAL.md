# 📚 Guide d'utilisation - Application de Gestion Commerciale

## 🎯 Vue d'ensemble

L'application de gestion commerciale est maintenant **opérationnelle** avec :
- ✅ Backend TypeScript/Fastify sur port 3001
- ✅ Frontend Next.js/React sur port 3000  
- ✅ Base de données PostgreSQL
- ✅ API REST complète pour les fournisseurs
- ✅ Authentification JWT
- ✅ Interface utilisateur moderne

## 🚀 Démarrage rapide

### 1. Démarrer l'application

```bash
# Terminal 1 : Backend
cd apps/backend
npm run dev

# Terminal 2 : Frontend  
cd apps/frontend
npm run dev
```

### 2. Accéder à l'application

- **Frontend** : http://localhost:3000
- **API Backend** : http://localhost:3001
- **Documentation API** : http://localhost:3001/docs
- **Health Check** : http://localhost:3001/health

### 3. Connexion

- **Email** : `admin@test.com`
- **Mot de passe** : `password123`

## 📋 Fonctionnalités disponibles

### 🏢 Gestion des fournisseurs
- ✅ Liste des fournisseurs avec pagination
- ✅ Création de nouveaux fournisseurs
- ✅ Modification des fournisseurs existants
- ✅ Suppression de fournisseurs
- ✅ Recherche et filtrage
- ✅ Import/Export de données

### 🔐 Authentification
- ✅ Connexion/Déconnexion
- ✅ Gestion des tokens JWT
- ✅ Refresh automatique des tokens
- ✅ Protection des routes

### 📊 API REST
- ✅ Endpoints CRUD complets
- ✅ Validation des données
- ✅ Gestion d'erreurs
- ✅ Documentation Swagger
- ✅ CORS configuré

## 🛠️ Utilisation de l'interface

### Page des fournisseurs

1. **Accéder** : http://localhost:3000/suppliers
2. **Se connecter** avec les identifiants admin
3. **Créer un fournisseur** :
   - Cliquer sur "Nouveau fournisseur"
   - Remplir le formulaire
   - Sauvegarder

4. **Modifier un fournisseur** :
   - Cliquer sur l'icône d'édition
   - Modifier les informations
   - Sauvegarder

5. **Supprimer un fournisseur** :
   - Cliquer sur l'icône de suppression
   - Confirmer la suppression

### Création de données de test

Utilisez le fichier `create-test-data.html` pour créer rapidement des fournisseurs de test :

1. Ouvrir : `file:///d:/Gestion%20Commerciale/create-test-data.html`
2. Cliquer sur "Se connecter"
3. Cliquer sur "Créer 3 fournisseurs"
4. Vérifier avec "Lister les fournisseurs"

## 🔧 Configuration

### Variables d'environnement

#### Backend (`apps/backend/.env`)
```env
NODE_ENV=development
HOST=0.0.0.0
PORT=3001
DATABASE_URL="postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"
JWT_SECRET="your-secret-key-change-in-production-2024"
CORS_ORIGIN="http://localhost:3000"
```

#### Frontend (`apps/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Base de données

La base de données PostgreSQL doit être configurée avec :
- **Host** : localhost
- **Port** : 5432
- **Database** : gestion_commerciale
- **User** : gestion_user
- **Password** : gestion_password_secure_2024

## 🧪 Tests

### Tests automatisés
```bash
# Tests backend
cd apps/backend
npm test

# Tests frontend
cd apps/frontend
npm test
```

### Tests manuels
- Utilisez `test-login-simple.html` pour tester l'API
- Utilisez `create-test-data.html` pour créer des données

## 🚀 Déploiement en production

### 1. Préparation
```bash
# Exécuter le script de déploiement
node deploy-production.js
```

### 2. Configuration HTTPS
- Obtenir un certificat SSL
- Configurer Nginx/Apache
- Mettre à jour les variables d'environnement

### 3. Variables de production
```env
NODE_ENV=production
HTTPS_PORT=443
SSL_CERT_PATH=/etc/ssl/certs/gestion-commerciale.crt
SSL_KEY_PATH=/etc/ssl/private/gestion-commerciale.key
```

## 🔒 Sécurité

### Fonctionnalités de sécurité activées
- ✅ HTTPS en production
- ✅ Headers de sécurité (HSTS, CSP, etc.)
- ✅ Rate limiting
- ✅ Validation et sanitisation des entrées
- ✅ Protection CORS
- ✅ Authentification JWT

### Bonnes pratiques
- Changer le `JWT_SECRET` en production
- Utiliser des mots de passe forts
- Configurer un certificat SSL valide
- Mettre à jour régulièrement les dépendances

## 📈 Évolutions futures

### Fonctionnalités prévues
- 📦 Gestion des produits
- 👥 Gestion des clients
- 📋 Gestion des commandes
- 🧾 Gestion des factures
- 📊 Tableaux de bord et rapports
- 📱 Application mobile

### Améliorations techniques
- Tests E2E automatisés
- CI/CD avec GitHub Actions
- Monitoring et alertes
- Sauvegarde automatique
- Mise à l'échelle horizontale

## 🆘 Dépannage

### Problèmes courants

#### Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est démarré
sudo systemctl status postgresql

# Vérifier la connexion
psql -h localhost -U gestion_user -d gestion_commerciale
```

#### Port déjà utilisé
```bash
# Tuer les processus Node.js
taskkill /F /IM node.exe

# Ou trouver le processus spécifique
netstat -ano | findstr :3001
```

#### Erreurs CORS
- Vérifier que le frontend utilise le bon port (3000)
- Vérifier la configuration CORS dans le backend
- S'assurer que les origines sont correctement configurées

## 📞 Support

Pour toute question ou problème :
1. Consulter les logs du serveur
2. Vérifier la documentation API : http://localhost:3001/docs
3. Utiliser les outils de test fournis
4. Consulter ce guide d'utilisation

---

**🎉 Félicitations ! Votre application de gestion commerciale est maintenant opérationnelle !**
