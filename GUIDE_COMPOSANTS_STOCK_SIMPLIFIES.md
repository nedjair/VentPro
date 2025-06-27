# 📊 Guide des Composants Stock Simplifiés

## 🎯 Objectif

Simplifier l'affichage des alertes de stock dans le dashboard en supprimant les détails individuels et en affichant uniquement des compteurs par statut avec synchronisation temps réel.

## 🔧 Composants Disponibles

### 1. UnifiedStockAlerts (Version Simplifiée)
**Fichier :** `apps/frontend/src/components/dashboard/unified-stock-alerts.tsx`

**Utilisation :**
```typescript
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'

<UnifiedStockAlerts />
```

**Fonctionnalités :**
- ✅ Affichage compact par type d'alerte
- ✅ Compteurs visuels colorés
- ✅ Synchronisation temps réel
- ✅ Cliquable pour redirection vers gestion des stocks
- ✅ Boutons d'actualisation et de gestion

**Design :**
- **Rupture de stock** : Fond rouge clair, icône AlertTriangle, compteur rouge
- **Stock faible** : Fond orange clair, icône TrendingDown, compteur orange  
- **Surstock** : Fond bleu clair, icône Package, compteur bleu
- **Aucune alerte** : Icône verte CheckCircle avec message positif

### 2. CompactStockSummary (Nouvelles Variantes)
**Fichier :** `apps/frontend/src/components/dashboard/compact-stock-summary.tsx`

#### Variante Default
```typescript
<CompactStockSummary />
// ou
<CompactStockSummary 
  showTitle={true} 
  showActions={true} 
  variant="default" 
/>
```
- Affichage en grille 3 colonnes
- Icônes et compteurs pour chaque type
- Titre et actions complètes

#### Variante Minimal
```typescript
<CompactStockSummary 
  variant="minimal"
  showTitle={true}
  showActions={true}
/>
```
- Affichage horizontal compact
- Chiffres en gras avec labels courts
- Idéal pour sidebars ou espaces restreints

#### Variante Inline
```typescript
<CompactStockSummary 
  variant="inline"
  showTitle={false}
  showActions={true}
/>
```
- Affichage ultra-compact en ligne
- Points colorés + chiffres
- Parfait pour headers ou status bars

## 🎨 Codes Couleur Standardisés

### Rupture de Stock (OUT_OF_STOCK)
- **Couleur** : Rouge (#DC2626)
- **Fond** : Rouge clair (#FEF2F2)
- **Bordure** : Rouge clair (#FECACA)
- **Icône** : AlertTriangle
- **Emoji** : 🔴

### Stock Faible (LOW_STOCK)
- **Couleur** : Orange (#EA580C)
- **Fond** : Orange clair (#FFF7ED)
- **Bordure** : Orange clair (#FED7AA)
- **Icône** : TrendingDown
- **Emoji** : 🟠

### Surstock (OVERSTOCK)
- **Couleur** : Bleu (#2563EB)
- **Fond** : Bleu clair (#EFF6FF)
- **Bordure** : Bleu clair (#BFDBFE)
- **Icône** : Package
- **Emoji** : 🔵

### Aucune Alerte
- **Couleur** : Vert (#16A34A)
- **Icône** : CheckCircle
- **Message** : "Aucune alerte de stock"

## 🔄 Synchronisation Temps Réel

### Hook Unifié
Tous les composants utilisent le même hook :
```typescript
const { 
  alerts, 
  loading, 
  error, 
  refresh,
  totalAlerts
} = useUnifiedAlerts()
```

### Calcul des Compteurs
```typescript
const alertCounts = {
  outOfStock: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
  lowStock: alerts.filter(a => a.type === 'LOW_STOCK').length,
  overStock: alerts.filter(a => a.type === 'OVERSTOCK').length,
  total: totalAlerts
}
```

### États de Synchronisation
- **Loading** : Icône RefreshCw animée + "Synchronisation..."
- **Error** : Icône AlertTriangle rouge + boutons "Réessayer" et "Forcer"
- **Success** : Affichage normal des compteurs

## 🎯 Actions Disponibles

### Navigation
```typescript
// Vers la gestion des stocks
const handleViewStockManagement = () => {
  router.push('/stocks')
}

// Vers la liste des produits
const handleViewProducts = () => {
  router.push('/products')
}
```

### Actualisation
```typescript
// Actualisation normale
const handleRefresh = () => {
  refresh()
}

// Actualisation forcée
const handleForceRefresh = () => {
  forceRefresh()
}
```

## 📱 Responsive Design

### Desktop
- Grille 3 colonnes pour les compteurs
- Boutons et actions complètes
- Espacement généreux

### Tablet
- Grille maintenue mais plus compacte
- Boutons légèrement réduits

### Mobile
- Passage en version inline automatique
- Compteurs horizontaux
- Actions simplifiées

## 🔧 Personnalisation

### Props Disponibles
```typescript
interface CompactStockSummaryProps {
  showTitle?: boolean      // Afficher le titre (défaut: true)
  showActions?: boolean    // Afficher les boutons (défaut: true)
  variant?: 'default' | 'minimal' | 'inline'  // Variante d'affichage
}
```

### Classes CSS Personnalisables
```css
/* Conteneur principal */
.stock-summary-container { }

/* Compteurs d'alertes */
.alert-counter-critical { }  /* Rupture */
.alert-counter-warning { }   /* Stock faible */
.alert-counter-info { }      /* Surstock */

/* États */
.stock-summary-loading { }
.stock-summary-error { }
.stock-summary-success { }
```

## 📊 Métriques Affichées

### Compteurs Principaux
1. **Rupture de stock** : Produits avec stock = 0
2. **Stock faible** : Produits sous le seuil minimum
3. **Surstock** : Produits au-dessus du seuil maximum
4. **Total alertes** : Somme de toutes les alertes actives

### Informations Contextuelles
- Nombre de produits concernés
- Type d'alerte avec description
- Actions recommandées
- Dernière synchronisation

## 🚀 Intégration dans le Dashboard

### Remplacement de l'Ancien Composant
```typescript
// Ancien (détaillé)
import { StockAlerts } from '@/components/dashboard/stock-alerts'
<StockAlerts />

// Nouveau (simplifié)
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'
<UnifiedStockAlerts />
```

### Ajout de Variantes Compactes
```typescript
// Dans une sidebar
<CompactStockSummary variant="minimal" showTitle={false} />

// Dans un header
<CompactStockSummary variant="inline" showActions={false} />

// Dans une card dédiée
<CompactStockSummary variant="default" />
```

## ✅ Avantages de la Simplification

### Performance
- ✅ Moins de données à afficher
- ✅ Rendu plus rapide
- ✅ Moins de DOM elements

### UX/UI
- ✅ Information essentielle en un coup d'œil
- ✅ Design plus épuré
- ✅ Navigation claire vers les détails

### Maintenance
- ✅ Code plus simple
- ✅ Moins de bugs potentiels
- ✅ Synchronisation plus fiable

### Synchronisation
- ✅ Données cohérentes partout
- ✅ Temps réel garanti
- ✅ Gestion d'erreurs centralisée

## 🎯 Cas d'Usage Recommandés

### Dashboard Principal
```typescript
<UnifiedStockAlerts />
```
- Vue complète avec actions
- Design attractif et informatif

### Sidebar/Navigation
```typescript
<CompactStockSummary variant="minimal" showTitle={false} />
```
- Compact mais lisible
- Accès rapide aux chiffres clés

### Header/Status Bar
```typescript
<CompactStockSummary variant="inline" showActions={false} />
```
- Ultra-compact
- Indicateur de statut global

### Mobile/Responsive
```typescript
<CompactStockSummary 
  variant={isMobile ? "inline" : "default"}
  showTitle={!isMobile}
/>
```
- Adaptation automatique
- Expérience optimisée

---

**Version :** 2.0  
**Dernière mise à jour :** 26 Juin 2025  
**Auteur :** Équipe Développement - Simplification Stock Alerts
