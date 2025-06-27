# Module de Gestion de Stock

## Vue d'ensemble

Le module de gestion de stock permet de suivre et gérer les niveaux de stock des produits avec des alertes automatiques et des fonctionnalités avancées de suivi.

## Fonctionnalités

### 🏗️ Backend (TypeScript + Fastify + Prisma ORM)

#### Modèle de données
- **Table `stocks`** avec les champs :
  - `id` : Identifiant unique
  - `productId` : Relation avec le produit
  - `quantiteActuelle` : Quantité en stock
  - `quantiteMinimale` : Seuil d'alerte minimum
  - `quantiteMaximale` : Seuil maximum (optionnel)
  - `dateLastUpdate` : Dernière mise à jour
  - `companyId` : Relation avec l'entreprise
  - `createdAt` / `updatedAt` : Audit

#### API REST
- **GET** `/api/v1/stock` - Liste des stocks avec pagination et filtres
- **GET** `/api/v1/stock/:id` - Détails d'un stock
- **POST** `/api/v1/stock` - Créer un nouveau stock
- **PUT** `/api/v1/stock/:id` - Mettre à jour un stock
- **DELETE** `/api/v1/stock/:id` - Supprimer un stock
- **GET** `/api/v1/stock/alerts` - Alertes de stock (rupture/stock faible)
- **PUT** `/api/v1/stock/:id/adjust` - Ajustement de stock avec historique

#### Filtres disponibles
- Recherche par nom/SKU de produit
- Filtrage par stock faible (`lowStock`)
- Filtrage par rupture de stock (`outOfStock`)
- Filtrage par catégorie de produit

### 🎨 Frontend (Next.js + React)

#### Pages
- `/stocks` - Liste des stocks avec filtres et recherche
- `/stocks/new` - Création d'un nouveau stock
- `/stocks/[id]` - Détails d'un stock
- `/stocks/[id]/edit` - Modification d'un stock

#### Composants
- **StocksPage** - Page principale de gestion des stocks
- **StockFormPage** - Formulaire de création/modification
- **StockDetailPage** - Page de détails d'un stock
- **StockAlerts** - Composant d'alertes pour le dashboard

#### Fonctionnalités frontend
- ✅ Programmation défensive avec `Array.isArray()` checks
- ✅ Format de devise DA (Dinar Algérien)
- ✅ Navigation intégrée au menu principal
- ✅ Alertes visuelles (badges rouge/orange)
- ✅ Actions rapides (voir, modifier, supprimer)

### 📊 Dashboard - Alertes de Stock

#### Section "Alertes de Stock"
- **Produits en rupture** (quantité = 0) avec badge rouge
- **Produits en stock faible** (quantité ≤ minimum) avec badge orange
- **Informations affichées** :
  - Nom du produit
  - SKU et catégorie
  - Quantité actuelle vs minimale
  - Actions rapides

## Installation et Configuration

### 1. Migration de la base de données

```bash
cd apps/backend
npx prisma migrate dev --name add-stock-model
npx prisma generate
```

### 2. Données de test algériennes

```bash
cd apps/backend
npm run seed:stocks
```

### 3. Tests du module

```bash
cd apps/backend
npm run test:stock-module
```

## Données de test incluses

Le module inclut des données de test algériennes réalistes :

### Produits alimentaires
- Couscous Ferrero 1kg
- Huile Elio 1L (stock faible)
- Thé Vert Palais des Thés (rupture)
- Semoule Fine Beblé 1kg
- Harissa Traditionnelle (stock faible)

### Produits d'hygiène
- Savon Doux Alger
- Shampoing Elvive
- Dentifrice Signal (rupture)

### Produits ménagers
- Lessive Ariel
- Liquide Vaisselle Fairy (stock faible)

### Autres catégories
- Produits électroniques
- Fournitures de bureau

## Configuration CORS

Le backend est configuré pour accepter les requêtes du frontend sur le port 3000 :

```typescript
// Configuration CORS dans server.ts
cors: {
  origin: ['http://localhost:3000'],
  credentials: true
}
```

## Sécurité

- ✅ Authentification JWT requise pour toutes les routes
- ✅ Validation des données d'entrée
- ✅ Vérification des permissions par entreprise
- ✅ Gestion d'erreurs complète

## Tests et Validation

### Tests automatisés
Le script `test:stock-module` valide :
- Création de stocks
- Récupération avec filtres
- Mise à jour de stocks
- Alertes de stock
- Programmation défensive
- Filtres de recherche

### Tests manuels recommandés
1. **Connectivité frontend-backend** (port 3000 → 3001)
2. **CRUD operations** complètes
3. **Alertes de stock** sur le dashboard
4. **Navigation** dans le menu principal
5. **Format DA** pour les montants
6. **Programmation défensive** avec arrays vides

## Patterns suivis

### Backend
- Service Layer pattern
- Repository pattern avec Prisma
- Validation et gestion d'erreurs
- Logging structuré
- Pagination standardisée

### Frontend
- Programmation défensive systématique
- Gestion d'état avec useState
- Loading states et error handling
- Responsive design
- Accessibilité

## Évolutions futures suggérées

1. **Tests unitaires** avec Jest/Vitest
2. **Historique des mouvements** de stock
3. **Notifications** en temps réel
4. **Import/Export** de données
5. **Rapports** de stock avancés
6. **Intégration** avec les commandes/factures
7. **Codes-barres** et scanning
8. **Prévisions** de stock

## Support

Pour toute question ou problème :
1. Vérifier les logs du backend
2. Tester la connectivité API
3. Valider les données avec le script de test
4. Consulter la documentation Prisma/Fastify/Next.js
