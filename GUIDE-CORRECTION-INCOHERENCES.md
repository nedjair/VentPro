# Guide de Correction des Incohérences de Stock

## 🔍 Problème Identifié

Les incohérences entre la page des produits et la page de gestion de stock sont causées par :

1. **Sources de données différentes** :
   - Page Produits : utilise `products.stockQuantity` et `products.minStock`
   - Page Stocks : utilise `stocks.quantiteActuelle` et `stocks.quantiteMinimale`

2. **Synchronisation défaillante** entre les tables `products` et `stocks`

3. **Produits manquants** dans la table `stocks`

## 🛠️ Solution via Interface Web

### Étape 1 : Accéder à la page de synchronisation

1. Ouvrez votre navigateur et allez sur : `http://localhost:3002/auto-sync`
2. Connectez-vous si nécessaire avec vos identifiants

### Étape 2 : Diagnostiquer les incohérences

Sur la page de synchronisation automatique, vous verrez :

- **État de la cohérence** : Nombre de produits cohérents/incohérents/manquants
- **Configuration** : Statut de l'auto-sync et du planificateur
- **Actions manuelles** disponibles

### Étape 3 : Corriger les incohérences

Cliquez sur le bouton **"Synchroniser maintenant"** pour :
- Créer les entrées manquantes dans la table `stocks`
- Synchroniser les données incohérentes
- Mettre à jour les statuts de stock

### Étape 4 : Vérifier la correction

1. Cliquez sur **"Vérifier cohérence"** pour confirmer la correction
2. Allez sur la page **Produits** : `http://localhost:3002/products`
3. Allez sur la page **Stocks** : `http://localhost:3002/stocks`
4. Vérifiez que les statuts de stock (rouge/orange/vert) sont maintenant cohérents

## 🔧 Solution Alternative via API

Si l'interface web ne fonctionne pas, utilisez ces commandes curl :

### 1. Se connecter
```bash
curl -X POST http://localhost:3003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gestion.dz","password":"admin123"}'
```

### 2. Synchroniser (remplacez TOKEN par le token reçu)
```bash
curl -X POST http://localhost:3003/api/v1/stock/sync-data \
  -H "Authorization: Bearer TOKEN"
```

### 3. Vérifier la cohérence
```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3003/api/v1/auto-sync/check-consistency
```

## 📊 Vérification des Résultats

Après la synchronisation, vérifiez que :

### Page Produits (`/products`)
- Les badges de statut (rouge/orange/vert) reflètent l'état réel
- Les quantités affichées correspondent aux données de stock
- Aucune erreur d'affichage

### Page Stocks (`/stocks`)
- Les mêmes produits affichent les mêmes statuts qu'en page produits
- Les quantités actuelles correspondent
- Les seuils minimaux sont cohérents

### Tableau de Bord (`/dashboard`)
- Les alertes de stock correspondent aux statuts des pages produits/stocks
- Les compteurs d'alertes sont corrects

## 🚨 Alertes de Stock Attendues

Après correction, vous devriez voir :

- **🔴 Rouge (Rupture)** : `stockQuantity = 0`
- **🟠 Orange (Stock faible)** : `0 < stockQuantity ≤ minStock`
- **🟢 Vert (Stock normal)** : `stockQuantity > minStock`

## 🔄 Synchronisation Automatique

Pour éviter les futures incohérences :

1. **Auto-Sync** doit être activé (visible sur `/auto-sync`)
2. **Planificateur** doit être en marche
3. Les tâches planifiées doivent être actives :
   - Synchronisation des stocks (toutes les heures)
   - Vérification de cohérence (toutes les 6 heures)

## 🐛 Dépannage

### Si la synchronisation échoue :

1. **Vérifiez les serveurs** :
   - Backend : `http://localhost:3003/health`
   - Frontend : `http://localhost:3002`

2. **Vérifiez l'authentification** :
   - Connectez-vous avec `admin@gestion.dz` / `admin123`
   - Le token doit être valide

3. **Vérifiez les logs backend** :
   - Regardez la console du serveur backend
   - Recherchez les erreurs de synchronisation

### Si les statuts restent incohérents :

1. **Rechargez les pages** (Ctrl+F5)
2. **Videz le cache** du navigateur
3. **Redémarrez les serveurs** si nécessaire

## ✅ Test de Validation

Pour confirmer que tout fonctionne :

1. Allez sur `/products` et notez le statut d'un produit
2. Allez sur `/stocks` et vérifiez le même produit
3. Les statuts doivent être identiques
4. Les quantités doivent correspondre
5. Le tableau de bord doit refléter les mêmes alertes

## 📝 Notes Importantes

- La synchronisation peut prendre quelques secondes
- Les données de test algériennes doivent être préservées
- Les produits services ne sont pas concernés par le stock
- La devise DA doit être maintenue dans tous les affichages

## 🎯 Résultat Attendu

Après correction complète :
- ✅ Cohérence parfaite entre pages produits et stocks
- ✅ Statuts visuels corrects (couleurs des badges)
- ✅ Alertes de stock précises
- ✅ Synchronisation automatique fonctionnelle
- ✅ Données algériennes préservées
