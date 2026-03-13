# Modules Ventes et Achats - Documentation

## Vue d'ensemble

Cette documentation décrit l'implémentation complète des modules ventes et achats pour l'application de gestion commerciale, incluant les devis, paiements, commandes fournisseurs et réceptions de marchandises.

## Modules implémentés

### 1. Devis (Quotes)
- **Service**: `QuoteService`
- **Routes**: `/api/v1/quotes`
- **Fonctionnalités**:
  - Création et gestion des devis
  - Gestion des statuts (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
  - Conversion en commande
  - Export PDF
  - Numérotation automatique selon standards algériens

### 2. Paiements (Payments)
- **Service**: `PaymentService`
- **Routes**: `/api/v1/payments`
- **Fonctionnalités**:
  - Enregistrement des paiements
  - Suivi des montants payés par facture
  - Génération automatique de relances
  - Support de multiples méthodes de paiement

### 3. Commandes Fournisseurs (Purchase Orders)
- **Service**: `PurchaseOrderService`
- **Routes**: `/api/v1/purchase-orders`
- **Fonctionnalités**:
  - Création et gestion des commandes fournisseurs
  - Suivi des statuts de livraison
  - Export PDF
  - Intégration avec la réception des marchandises

### 4. Réceptions de Marchandises (Goods Receptions)
- **Service**: `GoodsReceptionService`
- **Routes**: `/api/v1/purchase-orders/receptions`
- **Fonctionnalités**:
  - Enregistrement des réceptions
  - Mise à jour automatique du stock
  - Suivi des quantités reçues vs commandées
  - Gestion des réceptions partielles

## Services transversaux

### 1. Journal d'Audit (Audit Log)
- **Service**: `AuditLogService`
- **Routes**: `/api/v1/audit-logs`
- **Fonctionnalités**:
  - Traçabilité complète des actions
  - Historique des modifications
  - Filtrage et recherche
  - Statistiques d'utilisation

### 2. Configuration Algérienne
- **Service**: `AlgeriaConfigService`
- **Routes**: `/api/v1/algeria-config`
- **Fonctionnalités**:
  - Formatage des devises (DZD)
  - Validation des identifiants fiscaux (NIF, NIS, RC)
  - Calcul de la TVA
  - Numérotation des documents

### 3. Cache des Stocks
- **Service**: `StockCacheService`
- **Fonctionnalités**:
  - Cache en mémoire pour les stocks
  - Temps de réponse < 2s
  - Vérification de disponibilité
  - Synchronisation automatique

### 4. Middleware de Performance
- **Service**: `PerformanceMiddleware`
- **Fonctionnalités**:
  - Mesure des temps de réponse
  - Rate limiting
  - Timeout automatique
  - Statistiques de performance

## Base de données

### Nouveaux modèles Prisma

```prisma
// Devis
model Quote {
  id          String      @id @default(cuid())
  number      String      @unique
  status      QuoteStatus @default(DRAFT)
  clientId    String
  companyId   String
  validUntil  DateTime
  notes       String?
  subtotal    Float
  taxAmount   Float
  total       Float
  items       QuoteItem[]
  // Relations et timestamps
}

// Paiements
model Payment {
  id            String        @id @default(cuid())
  amount        Float
  paymentMethod PaymentMethod
  paymentDate   DateTime
  reference     String?
  notes         String?
  invoiceId     String
  companyId     String
  // Relations et timestamps
}

// Commandes fournisseurs
model PurchaseOrder {
  id           String               @id @default(cuid())
  number       String               @unique
  status       PurchaseOrderStatus  @default(DRAFT)
  supplierId   String
  companyId    String
  orderDate    DateTime
  expectedDate DateTime?
  notes        String?
  subtotal     Float
  taxAmount    Float
  total        Float
  items        PurchaseOrderItem[]
  receptions   GoodsReception[]
  // Relations et timestamps
}

// Journal d'audit
model AuditLog {
  id           String   @id @default(cuid())
  action       String
  entityType   String
  entityId     String
  entityData   String?
  previousData String?
  changes      String?
  userId       String?
  companyId    String
  timestamp    DateTime @default(now())
  // Relations et index
}
```

## API Endpoints

### Devis
- `GET /api/v1/quotes` - Liste des devis
- `POST /api/v1/quotes` - Créer un devis
- `GET /api/v1/quotes/:id` - Détails d'un devis
- `PUT /api/v1/quotes/:id` - Modifier un devis
- `PATCH /api/v1/quotes/:id/status` - Changer le statut
- `POST /api/v1/quotes/:id/convert-to-order` - Convertir en commande
- `DELETE /api/v1/quotes/:id` - Supprimer un devis

### Paiements
- `GET /api/v1/payments` - Liste des paiements
- `POST /api/v1/payments` - Enregistrer un paiement
- `GET /api/v1/payments/:id` - Détails d'un paiement
- `PUT /api/v1/payments/:id` - Modifier un paiement
- `DELETE /api/v1/payments/:id` - Supprimer un paiement
- `POST /api/v1/payments/generate-reminders` - Générer des relances

### Commandes Fournisseurs
- `GET /api/v1/purchase-orders` - Liste des commandes
- `POST /api/v1/purchase-orders` - Créer une commande
- `GET /api/v1/purchase-orders/:id` - Détails d'une commande
- `PUT /api/v1/purchase-orders/:id` - Modifier une commande
- `PATCH /api/v1/purchase-orders/:id/status` - Changer le statut
- `DELETE /api/v1/purchase-orders/:id` - Supprimer une commande

### Réceptions
- `GET /api/v1/purchase-orders/receptions` - Liste des réceptions
- `POST /api/v1/purchase-orders/receptions` - Créer une réception
- `GET /api/v1/purchase-orders/receptions/:id` - Détails d'une réception
- `PUT /api/v1/purchase-orders/receptions/:id` - Modifier une réception

## Tests

### Structure des tests
```
src/tests/
├── services/
│   ├── quote.service.test.ts
│   ├── payment.service.test.ts
│   ├── algeria-config.service.test.ts
│   └── stock-cache.service.test.ts
├── routes/
│   └── quotes.test.ts
├── helpers/
│   └── app.ts
├── setup.ts (Jest)
└── vitest.setup.ts (Vitest)
```

### Exécution des tests
```bash
# Tests Jest (existants)
npm run test
npm run test:watch
npm run test:coverage

# Tests Vitest (nouveaux modules)
npm run test:vitest
npm run test:vitest:watch
npm run test:vitest:coverage
```

## Frontend

### Composants créés
- `QuotesPage` - Gestion des devis
- `PaymentsPage` - Gestion des paiements
- `PurchaseOrdersPage` - Gestion des commandes fournisseurs
- `EnhancedStatsCards` - Tableau de bord amélioré

### Routes ajoutées
- `/quotes` - Page des devis
- `/payments` - Page des paiements
- `/purchase-orders` - Page des commandes fournisseurs

### Navigation
Les nouveaux modules sont intégrés dans la sidebar avec des icônes appropriées et des badges d'état.

## Configuration Algérienne

### Devises
- Code: DZD (Dinar Algérien)
- Symbole: د.ج
- Format: 1 234,56 د.ج

### TVA
- Taux standard: 19%
- Taux réduit: 9%
- Exonéré: 0%

### Numérotation des documents
- Devis: DEV-YYYY-NNNN
- Commandes fournisseurs: CF-YYYY-NNNN
- Réceptions: REC-YYYY-NNNN
- Paiements: PAIE-YYYY-NNNN

### Validation des identifiants
- NIF: 15 chiffres
- NIS: 15 chiffres
- RC: Format XX/XX-XXXXXXX

## Performance

### Optimisations implémentées
- Cache en mémoire pour les stocks
- Middleware de performance avec mesure des temps de réponse
- Rate limiting pour éviter la surcharge
- Timeout automatique des requêtes longues
- Compression des réponses

### Objectifs de performance
- Temps de réponse < 2s pour toutes les opérations critiques
- Synchronisation des stocks en temps réel
- Cache TTL de 30 secondes pour les données de stock

## Sécurité

### Authentification et autorisation
- JWT pour l'authentification
- Contrôle d'accès basé sur les rôles (RBAC)
- Validation des données d'entrée
- Audit complet des actions

### Logs d'audit
Toutes les actions sur les modules ventes et achats sont tracées :
- Création, modification, suppression
- Changements de statut
- Conversions de documents
- Accès aux données sensibles

## Déploiement

### Variables d'environnement requises
```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

### Migration de la base de données
```bash
npx prisma migrate deploy
npx prisma generate
```

### Vérification post-déploiement
1. Vérifier la connectivité à la base de données
2. Tester les endpoints critiques
3. Vérifier les logs d'audit
4. Contrôler les performances

## Maintenance

### Monitoring recommandé
- Temps de réponse des API
- Utilisation du cache
- Erreurs et exceptions
- Activité d'audit

### Tâches de maintenance
- Nettoyage périodique du cache
- Archivage des logs d'audit anciens
- Optimisation des requêtes de base de données
- Mise à jour des configurations algériennes

## Support

Pour toute question ou problème concernant les modules ventes et achats, consulter :
1. Cette documentation
2. Les tests unitaires pour des exemples d'utilisation
3. Les logs d'application pour le débogage
4. Le journal d'audit pour tracer les problèmes
