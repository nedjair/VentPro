# Guide de Validation de la Cohérence des Données de Stock

## 🎯 Objectif

Vérifier que les pages **Produits** (`/products`) et **Stocks** (`/stocks`) affichent des statuts de stock cohérents après l'unification des données.

## 📋 Checklist de Validation

### 1. Préparation

- ✅ Backend fonctionnel sur `http://localhost:3003`
- ✅ Frontend fonctionnel sur `http://localhost:3002`
- ✅ Connexion avec `admin@gestion-dz.com` / `admin123`

### 2. Tests de Cohérence des Statuts

#### 2.1 Comparaison Page Produits vs Page Stocks

1. **Ouvrir la page Produits** : `http://localhost:3002/products`
2. **Ouvrir la page Stocks** : `http://localhost:3002/stocks`
3. **Comparer les statuts** pour les mêmes produits :

| Produit | Page Produits | Page Stocks | Cohérent ? |
|---------|---------------|-------------|------------|
| Produit 1 | 🔴 Rupture | 🔴 Rupture | ✅ |
| Produit 2 | 🟠 Stock faible | 🟠 Stock faible | ✅ |
| Produit 3 | 🟢 Stock normal | 🟢 Stock normal | ✅ |

#### 2.2 Vérification des Critères de Statut

**Statuts attendus :**
- 🔴 **Rupture** : `stockQuantity = 0`
- 🟠 **Stock faible** : `0 < stockQuantity ≤ minStock`
- 🟢 **Stock normal** : `stockQuantity > minStock`

#### 2.3 Test avec Produits Spécifiques

Vérifiez ces produits algériens typiques :
- **Couscous Ferrero 1kg** - Vérifier cohérence statut
- **Huile d'olive Afia 1L** - Vérifier cohérence statut
- **Thé Lipton Menthe** - Vérifier cohérence statut

### 3. Tests du Tableau de Bord

#### 3.1 Alertes de Stock

1. **Ouvrir le tableau de bord** : `http://localhost:3002/dashboard`
2. **Vérifier les alertes** dans la section "Alertes de Stock"
3. **Comparer avec les pages** Produits et Stocks

#### 3.2 Compteurs d'Alertes

Les compteurs doivent correspondre :
- **Badge rouge** (rupture) = Nombre de produits avec `stockQuantity = 0`
- **Badge orange** (stock faible) = Nombre de produits avec `0 < stockQuantity ≤ minStock`

### 4. Tests de Synchronisation

#### 4.1 Unification via Interface Web

1. **Aller sur** : `http://localhost:3002/auto-sync`
2. **Cliquer sur "Synchroniser maintenant"**
3. **Vérifier le message de succès**
4. **Recharger les pages** Produits et Stocks
5. **Confirmer la cohérence**

#### 4.2 Test de Modification

1. **Modifier un stock** via la page Stocks
2. **Vérifier la mise à jour** sur la page Produits
3. **Confirmer la synchronisation** automatique

### 5. Validation des Données Algériennes

#### 5.1 Format de Devise

- ✅ Tous les prix affichés en **DA** (Dinar Algérien)
- ✅ Pas de format **DZD** ou **Euro**

#### 5.2 Données Localisées

- ✅ Noms de produits algériens authentiques
- ✅ Unités métriques (kg, L, pièce)
- ✅ Villes algériennes dans les adresses

### 6. Tests de Performance

#### 6.1 Temps de Chargement

- **Page Produits** : < 3 secondes
- **Page Stocks** : < 3 secondes
- **Tableau de bord** : < 5 secondes

#### 6.2 Réactivité

- **Filtres** : Réponse immédiate
- **Tri** : Réponse immédiate
- **Pagination** : < 1 seconde

## 🔧 Actions Correctives

### Si Incohérences Détectées

1. **Exécuter l'unification** :
   ```bash
   # Via interface web
   http://localhost:3002/auto-sync → "Synchroniser maintenant"
   ```

2. **Redémarrer les serveurs** si nécessaire :
   ```bash
   # Backend
   cd apps/backend && npm run dev
   
   # Frontend  
   cd apps/frontend && npx next dev -p 3002
   ```

3. **Vider le cache** du navigateur (Ctrl+F5)

### Si Problèmes Persistants

1. **Vérifier les logs backend** pour erreurs de synchronisation
2. **Contrôler la base de données** PostgreSQL directement
3. **Réexécuter les scripts** de diagnostic

## ✅ Critères de Validation Réussie

### Cohérence Parfaite

- [ ] Tous les statuts identiques entre pages Produits et Stocks
- [ ] Alertes du tableau de bord correspondent aux données
- [ ] Aucune erreur dans la console du navigateur
- [ ] Synchronisation automatique fonctionnelle

### Performance Acceptable

- [ ] Temps de chargement < 5 secondes
- [ ] Interface réactive
- [ ] Pas de blocages ou erreurs

### Données Correctes

- [ ] Format DA pour toutes les devises
- [ ] Données algériennes authentiques
- [ ] Calculs de stock corrects

## 📊 Rapport de Validation

### Résultats Attendus

```
✅ VALIDATION RÉUSSIE
   - 20 produits testés
   - 0 incohérence détectée
   - Synchronisation automatique : OK
   - Performance : Excellente
   - Données algériennes : Conformes
```

### En Cas d'Échec

```
⚠️  PROBLÈMES DÉTECTÉS
   - X incohérences de statuts
   - Y produits sans stock
   - Actions correctives nécessaires
```

## 🎯 Validation Finale

Une fois tous les tests passés :

1. **Documenter les résultats** dans ce guide
2. **Confirmer la cohérence** sur toutes les pages
3. **Valider avec l'utilisateur** final
4. **Marquer la tâche** comme terminée

## 📝 Notes Importantes

- **Toujours tester** après modifications du code
- **Vérifier la cohérence** avant déploiement
- **Maintenir les données** algériennes authentiques
- **Surveiller les performances** en continu

---

**Date de validation :** _À compléter_  
**Validé par :** _À compléter_  
**Statut :** _En cours / Réussi / Échec_
