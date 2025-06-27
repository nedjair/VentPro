# Guide de Test du Module de Stock

## 🚀 Étapes de Test Manuel

### 1. Démarrage des Serveurs

```bash
# Terminal 1 - Backend (port 3001)
cd "d:\Gestion Commerciale\apps\backend"
npm run dev

# Terminal 2 - Frontend (port 3000)  
cd "d:\Gestion Commerciale\apps\frontend"
npm run dev
```

### 2. Création des Données de Test

```bash
# Dans le terminal backend
cd "d:\Gestion Commerciale\apps\backend"
npm run seed:stocks
```

### 3. Tests Frontend

#### A. Navigation vers les Stocks
1. Ouvrir http://localhost:3000
2. Se connecter avec vos identifiants
3. Vérifier que "Stock" apparaît dans le menu de navigation (icône entrepôt)
4. Cliquer sur "Stock" pour accéder à `/stocks`

#### B. Page Liste des Stocks
**URL:** http://localhost:3000/stocks

**Tests à effectuer:**
- ✅ La page se charge sans erreur
- ✅ Le titre "Gestion de Stock" s'affiche
- ✅ Le bouton "Nouveau Stock" est présent
- ✅ La barre de recherche fonctionne
- ✅ Les filtres (Stock faible, Rupture) fonctionnent
- ✅ Les stocks s'affichent dans un tableau
- ✅ Les badges de statut (rouge/orange/vert) s'affichent
- ✅ Les montants sont en format DA (Dinar Algérien)
- ✅ Les actions (Voir, Modifier, Supprimer) sont présentes

#### C. Création d'un Stock
**URL:** http://localhost:3000/stocks/new

**Tests à effectuer:**
1. Cliquer sur "Nouveau Stock"
2. Vérifier que le formulaire s'affiche
3. Sélectionner un produit dans la liste déroulante
4. Remplir les quantités (actuelle, minimale, maximale)
5. Cliquer sur "Sauvegarder"
6. Vérifier la redirection vers la liste des stocks

#### D. Modification d'un Stock
**URL:** http://localhost:3000/stocks/[id]/edit

**Tests à effectuer:**
1. Cliquer sur l'icône "Modifier" d'un stock
2. Vérifier que le formulaire est pré-rempli
3. Modifier les quantités
4. Sauvegarder et vérifier les changements

#### E. Détails d'un Stock
**URL:** http://localhost:3000/stocks/[id]

**Tests à effectuer:**
1. Cliquer sur l'icône "Voir" d'un stock
2. Vérifier l'affichage des informations complètes
3. Vérifier le statut du stock (Normal/Faible/Rupture)
4. Vérifier les valeurs calculées en DA

### 4. Tests Dashboard

#### Alertes de Stock
**URL:** http://localhost:3000/dashboard

**Tests à effectuer:**
- ✅ Section "Alertes de Stock" visible
- ✅ Badge avec nombre total d'alertes
- ✅ Produits en rupture (badge rouge)
- ✅ Produits en stock faible (badge orange)
- ✅ Bouton "Gérer les stocks" fonctionnel
- ✅ Bouton "Actualiser" fonctionnel
- ✅ Clic sur un produit redirige vers ses détails

### 5. Tests API Backend

#### A. Test de Connectivité
```bash
# Test simple avec curl ou dans le navigateur
curl http://localhost:3001/api/v1/health
```

#### B. Test des Endpoints Stock (avec authentification)
```bash
# Récupérer le token JWT depuis le frontend (DevTools > Application > LocalStorage)
# Puis tester les endpoints:

# Liste des stocks
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/stock

# Alertes de stock  
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/stock/alerts

# Détails d'un stock
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3001/api/v1/stock/STOCK_ID
```

### 6. Tests de Programmation Défensive

#### Vérifications à effectuer:
1. **Arrays vides:** Vider la base de données et vérifier que les pages affichent "Aucun stock trouvé"
2. **Recherche vide:** Effectuer une recherche sans résultats
3. **Filtres sans résultats:** Activer des filtres qui ne retournent rien
4. **Données manquantes:** Vérifier le comportement avec des produits sans catégorie

### 7. Tests des Données Algériennes

#### Vérifier la présence de:
- ✅ Couscous Ferrero 1kg
- ✅ Huile Elio 1L (stock faible)
- ✅ Thé Vert Palais des Thés (rupture)
- ✅ Harissa Traditionnelle (stock faible)
- ✅ Savon Doux Alger
- ✅ Dentifrice Signal (rupture)

#### Vérifier les formats:
- ✅ Quantités en unités métriques (kg, L, pièce)
- ✅ Prix en format DA
- ✅ Seuils d'alerte appropriés

### 8. Tests d'Intégration

#### A. Workflow Complet
1. Créer un nouveau stock
2. Vérifier qu'il apparaît dans la liste
3. Le modifier pour créer une alerte (quantité ≤ minimum)
4. Vérifier que l'alerte apparaît sur le dashboard
5. Supprimer le stock
6. Vérifier qu'il disparaît de partout

#### B. Test CORS
1. Ouvrir DevTools > Network
2. Effectuer des actions sur les stocks
3. Vérifier que les requêtes vers localhost:3001 passent sans erreur CORS

### 9. Tests de Performance

#### Vérifications:
- ✅ Temps de chargement des pages < 2 secondes
- ✅ Pagination fonctionne avec de nombreux stocks
- ✅ Recherche réactive
- ✅ Pas de fuites mémoire lors de la navigation

### 10. Tests d'Erreurs

#### Scénarios à tester:
1. **Backend arrêté:** Vérifier les messages d'erreur frontend
2. **Données invalides:** Essayer de créer un stock avec des valeurs négatives
3. **Produit inexistant:** Tenter d'accéder à un stock supprimé
4. **Token expiré:** Vérifier la redirection vers la connexion

## 🎯 Critères de Réussite

### ✅ Tests Réussis Si:
1. Toutes les pages se chargent sans erreur
2. La navigation fonctionne parfaitement
3. Les CRUD operations fonctionnent
4. Les alertes s'affichent correctement
5. Les formats DA sont respectés
6. La programmation défensive fonctionne
7. Les données algériennes sont présentes
8. Aucune erreur CORS
9. Performance acceptable

### ❌ Tests Échoués Si:
1. Erreurs 404 ou 500
2. Problèmes CORS
3. Arrays undefined causant des crashes
4. Formats de devise incorrects
5. Navigation cassée
6. Alertes non fonctionnelles

## 🔧 Dépannage

### Problèmes Courants:

1. **Port déjà utilisé:**
   ```bash
   # Tuer les processus sur les ports
   npx kill-port 3000 3001
   ```

2. **Client Prisma non généré:**
   ```bash
   cd packages/database
   npx prisma generate
   ```

3. **Migration non appliquée:**
   ```bash
   cd apps/backend  
   npx prisma migrate dev
   ```

4. **Données manquantes:**
   ```bash
   cd apps/backend
   npm run seed:stocks
   ```

## 📊 Rapport de Test

Après avoir effectué tous les tests, documentez:
- ✅ Tests réussis
- ❌ Tests échoués  
- ⚠️ Problèmes identifiés
- 💡 Améliorations suggérées
