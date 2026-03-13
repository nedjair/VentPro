# Documentation des modules de gestion des ventes et des achats

Ce document décrit les nouvelles fonctionnalités de gestion des ventes et des achats ajoutées au projet GCTPE.

## Gestion des ventes

### Création de devis

La fonctionnalité de création de devis permet de générer rapidement des devis à envoyer aux clients.

**Fonctionnalités principales :**
- Création de devis avec articles, prix, quantités et TVA
- Gestion des remises par article
- Conversion automatique des devis en commandes
- Suivi du statut des devis (brouillon, envoyé, accepté, refusé, expiré)
- Export des devis en PDF

**Endpoints API :**
- `GET /api/v1/quotes` - Liste des devis avec filtrage et pagination
- `GET /api/v1/quotes/:id` - Détails d'un devis
- `POST /api/v1/quotes` - Création d'un devis
- `PUT /api/v1/quotes/:id` - Mise à jour d'un devis
- `PATCH /api/v1/quotes/:id/status` - Changement de statut d'un devis
- `POST /api/v1/quotes/:id/convert-to-order` - Conversion d'un devis en commande
- `DELETE /api/v1/quotes/:id` - Suppression d'un devis
- `GET /api/v1/quotes/:id/export/pdf` - Export d'un devis en PDF

### Facturation

La fonctionnalité de facturation permet d'émettre des factures personnalisables avec gestion de la TVA, des remises et des conditions de paiement.

**Fonctionnalités principales :**
- Création de factures à partir de commandes ou directement
- Gestion des différents types de factures (facture, avoir, facture proforma)
- Suivi du statut des factures (brouillon, envoyée, payée, partiellement payée, en retard, annulée)
- Calcul automatique des montants (sous-total, TVA, total)
- Export des factures en PDF

**Endpoints API :**
- Les endpoints existants pour les factures ont été conservés

### Suivi des paiements

La fonctionnalité de suivi des paiements permet de suivre les règlements clients et de générer des relances automatiques.

**Fonctionnalités principales :**
- Enregistrement des paiements reçus
- Suivi des montants payés et restant à payer
- Mise à jour automatique du statut des factures
- Génération de relances automatiques pour les factures impayées
- Différents niveaux de relance selon le retard de paiement

**Endpoints API :**
- `GET /api/v1/payments` - Liste des paiements avec filtrage et pagination
- `GET /api/v1/payments/:id` - Détails d'un paiement
- `POST /api/v1/payments` - Création d'un paiement
- `PUT /api/v1/payments/:id` - Mise à jour d'un paiement
- `DELETE /api/v1/payments/:id` - Suppression d'un paiement
- `GET /api/v1/payments/invoice/:invoiceId` - Paiements d'une facture
- `GET /api/v1/payments/client/:clientId` - Paiements d'un client
- `POST /api/v1/payments/reminders/generate` - Génération des relances de paiement
- `GET /api/v1/payments/reminders` - Liste des relances de paiement
- `PATCH /api/v1/payments/reminders/:id/mark-sent` - Marquer une relance comme envoyée

### Historique client

La fonctionnalité d'historique client permet d'accéder à l'historique des commandes et paiements d'un client.

**Fonctionnalités principales :**
- Vue consolidée de toutes les interactions avec un client
- Historique des commandes, devis, factures et paiements
- Suivi de la situation financière du client (montants dus, en retard, etc.)

**Endpoints API :**
- Les endpoints existants pour les clients ont été conservés
- Les nouveaux endpoints de paiements permettent d'accéder à l'historique des paiements

## Gestion des achats

### Commandes fournisseurs

La fonctionnalité de commandes fournisseurs permet de créer et suivre les bons de commande.

**Fonctionnalités principales :**
- Création de commandes fournisseurs avec articles, prix, quantités et TVA
- Suivi du statut des commandes (brouillon, commandée, partiellement reçue, reçue, annulée)
- Calcul automatique des montants (sous-total, TVA, total)
- Export des commandes en PDF

**Endpoints API :**
- `GET /api/v1/purchase-orders` - Liste des commandes fournisseurs avec filtrage et pagination
- `GET /api/v1/purchase-orders/:id` - Détails d'une commande fournisseur
- `POST /api/v1/purchase-orders` - Création d'une commande fournisseur
- `PUT /api/v1/purchase-orders/:id` - Mise à jour d'une commande fournisseur
- `PATCH /api/v1/purchase-orders/:id/status` - Changement de statut d'une commande fournisseur
- `DELETE /api/v1/purchase-orders/:id` - Suppression d'une commande fournisseur
- `GET /api/v1/purchase-orders/:id/export/pdf` - Export d'une commande fournisseur en PDF

### Réception des marchandises

La fonctionnalité de réception des marchandises permet d'enregistrer les livraisons avec vérification des quantités.

**Fonctionnalités principales :**
- Enregistrement des réceptions partielles ou complètes
- Mise à jour automatique du stock
- Suivi des quantités commandées vs reçues
- Historique des réceptions

**Endpoints API :**
- `POST /api/v1/purchase-orders/:id/receive` - Réception d'articles d'une commande fournisseur
- `GET /api/v1/purchase-orders/receptions` - Liste des réceptions de marchandises
- `GET /api/v1/purchase-orders/receptions/:id` - Détails d'une réception de marchandises

### Gestion des fournisseurs

La fonctionnalité de gestion des fournisseurs permet de maintenir des fiches fournisseurs avec historique des achats.

**Fonctionnalités principales :**
- Fiches fournisseurs complètes (coordonnées, conditions commerciales, etc.)
- Historique des commandes et réceptions
- Suivi des performances des fournisseurs

**Endpoints API :**
- Les endpoints existants pour les fournisseurs ont été conservés

## Modèles de données

### Nouveaux modèles

- `Payment` - Paiements des factures
- `PaymentReminder` - Relances de paiement
- `PurchaseOrder` - Commandes fournisseurs
- `PurchaseOrderItem` - Articles des commandes fournisseurs
- `GoodsReception` - Réceptions de marchandises
- `GoodsReceptionItem` - Articles des réceptions de marchandises

### Relations

- Un client peut avoir plusieurs paiements et relances
- Une facture peut avoir plusieurs paiements et relances
- Un fournisseur peut avoir plusieurs commandes fournisseurs
- Une commande fournisseur peut avoir plusieurs articles et réceptions
- Un produit peut être présent dans plusieurs commandes fournisseurs

## Installation et configuration

1. Appliquer les migrations de base de données :
   ```bash
   cd apps/backend
   npx prisma migrate dev
   ```

2. Redémarrer le serveur backend :
   ```bash
   npm run dev
   ```

## Utilisation

### Gestion des ventes

1. Créer un devis pour un client
2. Envoyer le devis au client (export PDF)
3. Convertir le devis en commande si accepté
4. Créer une facture à partir de la commande
5. Enregistrer les paiements reçus
6. Générer des relances pour les factures impayées

### Gestion des achats

1. Créer une commande fournisseur
2. Envoyer la commande au fournisseur (export PDF)
3. Réceptionner les articles à leur arrivée
4. Suivre l'état des commandes et des stocks