# 🚀 Gestion Commerciale TPE - Frontend Next.js

Application de gestion commerciale moderne développée avec **Next.js 14**, **TypeScript**, et **Tailwind CSS**.

## ✨ Fonctionnalités

### 🎯 Dashboard
- **Métriques en temps réel** : Clients, produits, ventes, commandes
- **Tests API intégrés** : Vérification de la connectivité backend
- **Graphiques de ventes** : Évolution des performances
- **Activité récente** : Suivi des dernières actions

### 👥 Gestion des Clients
- **CRUD complet** : Création, lecture, modification, suppression
- **Types de clients** : Particuliers et entreprises
- **Recherche avancée** : Filtrage par nom, email, ville
- **Export de données** : Fonctionnalité d'export intégrée

### 📦 Gestion des Produits
- **Catalogue produits** : Gestion complète du catalogue
- **Suivi des stocks** : Alertes de stock bas et ruptures
- **Catégorisation** : Organisation par catégories
- **Gestion des prix** : Prix de vente et coût d'achat

## 🛠️ Technologies

- **Frontend** : Next.js 14 (App Router)
- **Language** : TypeScript
- **Styling** : Tailwind CSS
- **Icons** : Lucide React
- **HTTP Client** : Axios
- **Build Tool** : Next.js built-in

## 📁 Structure du Projet

```
frontend-nextjs-production/
├── src/
│   ├── app/                    # App Router (Next.js 14)
│   │   ├── layout.tsx         # Layout principal
│   │   ├── page.tsx           # Page d'accueil (Dashboard)
│   │   ├── clients/           # Pages clients
│   │   └── products/          # Pages produits
│   ├── components/            # Composants React
│   │   ├── ui/               # Composants UI de base
│   │   ├── layout/           # Composants de layout
│   │   ├── dashboard/        # Composants du dashboard
│   │   └── pages/            # Composants de pages
│   └── lib/                  # Utilitaires et services
│       ├── api.ts           # Client API
│       └── utils.ts         # Fonctions utilitaires
├── public/                   # Assets statiques
├── next.config.mjs          # Configuration Next.js
├── tailwind.config.ts       # Configuration Tailwind
└── package.json            # Dépendances
```

## 🚀 Installation et Démarrage

### Prérequis
- **Node.js** 18+ 
- **npm** ou **yarn**
- **Backend API** en cours d'exécution sur le port 3001

### Installation
```bash
cd frontend-nextjs-production
npm install
```

### Démarrage en développement
```bash
npm run dev
```

L'application sera accessible sur **http://localhost:3000**

### Build de production
```bash
npm run build
npm start
```

## 🔧 Configuration

### Variables d'environnement
Créez un fichier `.env.local` :
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NODE_ENV=development
```

### Configuration API
Le client API est configuré dans `src/lib/api.ts` :
- **Base URL** : http://localhost:3001
- **Timeout** : 10 secondes
- **Headers** : Content-Type: application/json

## 📊 API Endpoints

### Backend requis
L'application nécessite un backend avec les endpoints suivants :

- `GET /health` - Health check
- `GET /metrics` - Métriques système
- `GET /dashboard/stats` - Statistiques dashboard
- `GET /clients` - Liste des clients
- `GET /products` - Liste des produits

## 🧪 Tests

### Test automatique
```bash
# Depuis la racine du projet
powershell -ExecutionPolicy Bypass -File simple-test.ps1
```

### Test manuel
1. **Backend** : http://localhost:3001/health
2. **Frontend** : http://localhost:3002
3. **Pages** :
   - Dashboard : http://localhost:3002/
   - Clients : http://localhost:3002/clients
   - Produits : http://localhost:3002/products

## 🎨 Interface Utilisateur

### Design System
- **Couleurs** : Palette bleue moderne
- **Typography** : Inter font
- **Composants** : Design system cohérent
- **Responsive** : Mobile-first approach

### Composants UI
- **Button** : Variantes primary, secondary, danger
- **Cards** : Cartes avec hover effects
- **Tables** : Tables responsives avec tri
- **Forms** : Formulaires avec validation

## 🔄 Intégration Backend

### Client API
```typescript
import { api } from '@/lib/api'

// Récupérer les clients
const clients = await api.getClients()

// Récupérer les produits
const products = await api.getProducts()

// Statistiques dashboard
const stats = await api.getDashboardStats()
```

### Gestion d'erreurs
- **Intercepteurs Axios** : Gestion centralisée des erreurs
- **Messages d'erreur** : Affichage utilisateur convivial
- **Retry logic** : Possibilité de réessayer les requêtes

## 📱 Responsive Design

L'application est entièrement responsive :
- **Mobile** : Navigation adaptée, tables scrollables
- **Tablet** : Layout optimisé pour tablettes
- **Desktop** : Interface complète avec sidebar

## 🚀 Déploiement

### Build de production
```bash
npm run build
```

### Démarrage en production
```bash
npm start
```

### Variables d'environnement de production
```env
NEXT_PUBLIC_API_BASE_URL=https://votre-api.com
NODE_ENV=production
```

## 🔧 Scripts Disponibles

- `npm run dev` - Démarrage en développement
- `npm run build` - Build de production
- `npm start` - Démarrage en production
- `npm run lint` - Vérification ESLint

## 📈 Performance

### Optimisations Next.js
- **SSR/SSG** : Rendu côté serveur
- **Code splitting** : Chargement optimisé
- **Image optimization** : Images optimisées
- **Bundle analysis** : Analyse des bundles

### Optimisations Tailwind
- **Purge CSS** : Suppression du CSS inutilisé
- **JIT mode** : Compilation à la demande
- **Custom utilities** : Classes utilitaires personnalisées

## 🛡️ Sécurité

### Headers de sécurité
- **X-Frame-Options** : Protection contre le clickjacking
- **X-Content-Type-Options** : Protection MIME
- **Referrer-Policy** : Contrôle des referrers

### Validation
- **TypeScript** : Typage strict
- **ESLint** : Règles de qualité de code
- **Input validation** : Validation côté client

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit les changements
4. Push vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 🆘 Support

Pour toute question ou problème :
1. Vérifiez que le backend est démarré
2. Consultez les logs de la console
3. Testez les endpoints API manuellement
4. Vérifiez la configuration des variables d'environnement

---

**Développé avec ❤️ pour la gestion commerciale moderne**
