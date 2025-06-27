# 📋 Guide de Synchronisation des Données de Stock

## 🎯 Problème Résolu

**Avant :** Incohérences entre le dashboard (2 alertes) et la page de gestion des stocks (5 produits)
**Après :** Synchronisation parfaite de toutes les données de stock en temps réel

## 🔧 Architecture de la Solution

### 1. Hook Unifié Principal
```typescript
// apps/frontend/src/hooks/useUnifiedStockData.ts
import { useUnifiedStockData } from '@/hooks/useUnifiedStockData'

const { 
  dashboard,    // Données du tableau de bord
  alerts,       // Alertes de stock
  products,     // Produits avec statuts
  loading,      // État de chargement
  error,        // Erreurs éventuelles
  lastUpdate,   // Dernière mise à jour
  refresh,      // Actualisation manuelle
  forceRefresh  // Actualisation forcée
} = useUnifiedStockData()
```

### 2. Hooks Spécialisés
```typescript
// Pour les alertes uniquement
import { useUnifiedAlerts } from '@/hooks/useUnifiedStockData'
const { alerts, totalAlerts, criticalAlerts } = useUnifiedAlerts()

// Pour le dashboard uniquement
import { useUnifiedDashboard } from '@/hooks/useUnifiedStockData'
const { dashboard, loading, error } = useUnifiedDashboard()

// Pour les produits uniquement
import { useUnifiedProducts } from '@/hooks/useUnifiedStockData'
const { products, lowStockProducts, outOfStockProducts } = useUnifiedProducts()
```

## 🎨 Composants Unifiés

### 1. Alertes de Stock
```typescript
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'

// Remplace l'ancien composant StockAlerts
<UnifiedStockAlerts />
```

### 2. Dashboard de Stock
```typescript
import { UnifiedStockDashboard } from '@/components/stock/UnifiedStockDashboard'

<UnifiedStockDashboard
  onViewAlerts={() => router.push('/stock/alerts')}
  onViewProducts={() => router.push('/products')}
/>
```

### 3. Liste des Produits
```typescript
import { UnifiedProductsList } from '@/components/stock/UnifiedProductsList'

<UnifiedProductsList
  showFilters={true}
  showActions={true}
  maxHeight="600px"
/>
```

## 📊 Outils de Monitoring

### 1. Moniteur Temps Réel
Le moniteur est automatiquement intégré dans le layout principal :

```typescript
// apps/frontend/src/components/layout/main-layout.tsx
<MainLayout showStockMonitor={true}>
  {/* Votre contenu */}
</MainLayout>
```

**Fonctionnalités :**
- Indicateur de synchronisation en bas à droite
- Notifications automatiques des changements
- Historique des synchronisations
- Détection des incohérences

### 2. Page de Test et Diagnostic
Accès : `http://localhost:3002/test-unified-stock`

**Onglets disponibles :**
- **Diagnostic** : Test des APIs en temps réel
- **Comparaison** : Comparaison détaillée des endpoints
- **Tests Auto** : Tests automatisés avec scoring
- **Dashboard** : Vue unifiée du tableau de bord
- **Alertes** : Gestion des alertes
- **Produits** : Liste des produits

## 🔍 Tests Automatisés

### 1. Utilisation du Testeur
```typescript
import { stockSyncTester } from '@/utils/stockSyncTester'

// Test manuel
const result = await stockSyncTester.runSyncTest()

// Tests automatiques (toutes les 30 secondes)
stockSyncTester.startAutoTesting(30000)

// Arrêter les tests
stockSyncTester.stopAutoTesting()

// Statistiques
const stats = stockSyncTester.getTestStats()
```

### 2. Métriques de Performance
- **Score de synchronisation** : 0-100 (100 = parfait)
- **Taux de succès** : Pourcentage de tests réussis
- **Durée moyenne** : Temps de réponse des APIs
- **Incohérences** : Nombre de différences détectées

## 🚀 Migration des Composants Existants

### Étape 1 : Remplacer les Imports
```typescript
// Ancien
import { StockAlerts } from '@/components/dashboard/stock-alerts'

// Nouveau
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'
```

### Étape 2 : Utiliser les Nouveaux Hooks
```typescript
// Ancien
const [products, setProducts] = useState([])
const [loading, setLoading] = useState(true)

// Nouveau
const { products, loading } = useUnifiedProducts()
```

### Étape 3 : Supprimer les Anciens Appels API
```typescript
// Ancien - À supprimer
useEffect(() => {
  api.get('/api/v1/stock/alerts').then(...)
}, [])

// Nouveau - Automatique
const { alerts } = useUnifiedAlerts()
```

## 📈 Avantages de la Solution

### 1. Cohérence des Données
- ✅ Toutes les vues affichent les mêmes données
- ✅ Synchronisation automatique toutes les 30 secondes
- ✅ Cache intelligent partagé

### 2. Performance Optimisée
- ✅ Appels API parallèles
- ✅ Cache global pour éviter les doublons
- ✅ Temps de réponse < 2 secondes

### 3. Monitoring Avancé
- ✅ Surveillance en temps réel
- ✅ Notifications automatiques
- ✅ Tests de cohérence automatisés
- ✅ Diagnostic intégré

### 4. Facilité de Maintenance
- ✅ Code centralisé
- ✅ Hooks réutilisables
- ✅ Composants modulaires
- ✅ Tests automatisés

## 🛠️ Dépannage

### Problème : Données incohérentes
1. Ouvrir `/test-unified-stock`
2. Aller dans l'onglet "Diagnostic"
3. Cliquer sur "Tester" pour vérifier les APIs
4. Vérifier l'analyse de cohérence

### Problème : Erreurs de synchronisation
1. Vérifier le moniteur en bas à droite
2. Cliquer pour voir les détails d'erreur
3. Utiliser "Forcer" pour une actualisation complète

### Problème : Performance lente
1. Aller dans l'onglet "Tests Auto"
2. Démarrer les tests automatiques
3. Vérifier les métriques de performance
4. Analyser la durée moyenne des appels

## 📝 Bonnes Pratiques

### 1. Utilisation des Hooks
```typescript
// ✅ Bon - Utiliser les hooks unifiés
const { products, loading } = useUnifiedProducts()

// ❌ Éviter - Appels API directs
const [products, setProducts] = useState([])
useEffect(() => { api.get('/products')... }, [])
```

### 2. Gestion des Erreurs
```typescript
const { products, error, refresh } = useUnifiedProducts()

if (error) {
  return (
    <div>
      <p>Erreur: {error}</p>
      <button onClick={refresh}>Réessayer</button>
    </div>
  )
}
```

### 3. Optimisation des Rendus
```typescript
// ✅ Bon - Utiliser les hooks spécialisés
const { totalAlerts } = useUnifiedAlerts() // Seulement les alertes

// ❌ Éviter - Charger toutes les données
const { dashboard, alerts, products } = useUnifiedStockData() // Tout
```

## 🔄 Cycle de Synchronisation

1. **Chargement initial** : Appels parallèles aux 3 APIs
2. **Cache global** : Stockage des données unifiées
3. **Notification** : Mise à jour de tous les abonnés
4. **Auto-refresh** : Synchronisation toutes les 30 secondes
5. **Détection** : Identification des changements
6. **Notifications** : Alertes utilisateur si nécessaire

## 📞 Support

Pour toute question ou problème :
1. Consulter la page de diagnostic : `/test-unified-stock`
2. Vérifier le moniteur de synchronisation
3. Analyser les logs dans la console du navigateur
4. Utiliser les tests automatisés pour identifier les problèmes

---

**Version :** 1.0  
**Dernière mise à jour :** 26 Juin 2025  
**Auteur :** Équipe Développement Gestion Commerciale
