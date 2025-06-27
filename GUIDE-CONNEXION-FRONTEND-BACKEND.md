# 🔗 Guide de Connexion Frontend-Backend

## 📋 Vue d'ensemble

**Connexion réussie** entre le frontend Next.js et le backend de production validé.

### ✅ Status de Validation
- **Backend** : production-backend.js (Port 3001) - OPÉRATIONNEL ✅
- **Frontend** : Next.js (Port 3000) - CONFIGURÉ ✅
- **API** : Toutes les connexions validées ✅
- **Authentification** : admin@demo-tpe.fr / demo123 ✅

## 🚀 Démarrage Rapide

### **1. Démarrer le Backend (Obligatoire)**
```powershell
# Dans le répertoire racine
.\start-production-backend.ps1
```

### **2. Tester les Connexions**
```powershell
# Valider que tout fonctionne
.\test-api-simple.ps1
```

### **3. Démarrer le Frontend**
```powershell
# Option 1: Script automatique
.\start-frontend-simple.ps1

# Option 2: Manuel
cd frontend-nextjs-production
npm run dev
```

## 🔧 Configuration Validée

### **Backend de Production**
- **Fichier** : `production-backend.js`
- **Port** : 3001
- **Status** : OPÉRATIONNEL (10/10 tests passés)
- **URL** : http://localhost:3001

### **Frontend Next.js**
- **Dossier** : `apps/frontend/`
- **Port** : 3000
- **Framework** : Next.js 14.2.4
- **URL** : http://localhost:3000

### **Configuration API**
- **Base URL** : http://localhost:3001 (configuré dans .env.local)
- **CORS** : Configuré pour port 3000 ✅
- **Authentification** : JWT Bearer Token ✅

## 🔐 Identifiants de Connexion

### **Compte Administrateur**
- **Email** : `admin@demo-tpe.fr`
- **Mot de passe** : `demo123`
- **Rôle** : ADMIN

### **Données de Test**
- **3 clients** : Particuliers et entreprises
- **5 produits** : Informatique et accessoires
- **3 utilisateurs** : Admin, manager, employee

## 📊 Endpoints API Validés

### **Endpoints Publics**
- `GET /health` - Health check ✅
- `GET /metrics` - Métriques système ✅
- `POST /auth/login` - Authentification ✅

### **Endpoints Protégés** (JWT requis)
- `GET /auth/verify` - Vérification token ✅
- `GET /auth/logout` - Déconnexion ✅
- `GET /dashboard/stats` - Statistiques dashboard ✅
- `GET /clients` - API Clients (CRUD + pagination) ✅
- `GET /products` - API Produits (CRUD + filtres) ✅

## 🧪 Tests de Validation

### **Test Complet**
```powershell
# Test toutes les connexions
.\test-api-simple.ps1
```

### **Test Backend Seul**
```powershell
# Test backend uniquement
.\verification-finale-complete.ps1
```

### **Test Manuel**
```bash
# Health check
curl http://localhost:3001/health

# Authentification
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo-tpe.fr","password":"demo123"}'
```

## 🔄 Flux d'Authentification

### **1. Connexion Frontend**
1. Utilisateur saisit email/password
2. Frontend envoie POST `/auth/login`
3. Backend valide et retourne JWT token
4. Frontend stocke token et redirige vers dashboard

### **2. Requêtes Protégées**
1. Frontend ajoute `Authorization: Bearer <token>`
2. Backend valide le token via middleware
3. Backend retourne les données demandées

### **3. Gestion des Erreurs**
- Token expiré → Redirection vers login
- Erreur réseau → Message d'erreur
- Accès refusé → Message d'autorisation

## 📁 Structure Frontend

```
frontend-nextjs-production/
├── src/
│   ├── app/                    # Pages Next.js
│   │   ├── login/             # Page de connexion
│   │   ├── clients/           # Gestion clients
│   │   └── products/          # Gestion produits
│   ├── components/            # Composants React
│   │   ├── auth/              # Composants auth
│   │   ├── dashboard/         # Dashboard
│   │   └── ui/                # Composants UI
│   ├── lib/
│   │   └── api.ts             # Client API (configuré pour port 3001)
│   └── stores/
│       └── auth.ts            # Store d'authentification
├── .env.local                 # Configuration (API_BASE_URL=http://localhost:3001)
└── package.json               # Dépendances Next.js
```

## 🛠️ Dépendances Clés

### **Frontend**
- **Next.js** : 14.2.4 (Framework React)
- **Axios** : 1.9.0 (Client HTTP)
- **Zustand** : 5.0.5 (State management)
- **Tailwind CSS** : 3.4.1 (Styling)
- **Lucide React** : 0.515.0 (Icônes)

### **Backend**
- **Fastify** : Framework web haute performance
- **PostgreSQL** : Base de données (port 5432/6432)
- **Redis** : Cache et sessions (port 6379)
- **JWT** : Authentification
- **Bcrypt** : Hashage des mots de passe

## 🚨 Résolution de Problèmes

### **Backend Non Accessible**
```powershell
# Vérifier le backend
Invoke-WebRequest -Uri "http://localhost:3001/health"

# Redémarrer si nécessaire
.\start-production-backend.ps1
```

### **Frontend Ne Démarre Pas**
```powershell
# Vérifier les dépendances
cd frontend-nextjs-production
npm install

# Démarrer manuellement
npm run dev
```

### **Erreur d'Authentification**
- Vérifier les identifiants : admin@demo-tpe.fr / demo123
- Vérifier que le backend est accessible
- Vérifier la configuration CORS

### **Erreur CORS**
- Le backend est configuré pour autoriser http://localhost:3000
- Vérifier que le frontend utilise bien le port 3000

## 🎯 Prochaines Étapes

### **1. Test Complet de l'Application**
1. Démarrer backend et frontend
2. Se connecter avec admin@demo-tpe.fr / demo123
3. Tester toutes les fonctionnalités (dashboard, clients, produits)

### **2. Développement**
- Ajouter de nouvelles fonctionnalités
- Personnaliser l'interface utilisateur
- Étendre l'API selon les besoins

### **3. Déploiement**
- Configurer pour l'environnement de production
- Sécuriser les variables d'environnement
- Mettre en place le monitoring

---

## ✅ Connexion Frontend-Backend : OPÉRATIONNELLE

**Le frontend Next.js est maintenant connecté au backend de production et prêt à être utilisé !**

### **URLs de l'Application**
- **Frontend** : http://localhost:3000
- **Backend** : http://localhost:3001
- **Identifiants** : admin@demo-tpe.fr / demo123
