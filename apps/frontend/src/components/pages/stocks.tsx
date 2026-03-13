'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  Edit,
  Eye,
  Filter
} from 'lucide-react'
import { api } from '@/lib/api-patch'
import { formatCurrency } from '@/lib/utils'
import {
  calculateStockStatus,
  getStockStatusClasses,
  getStockStatusIcon,
  formatStockQuantity,
  formatStockThresholds,
  type ProductWithStock
} from '@/lib/stock-utils'
import { useUnifiedProducts } from '@/hooks/useUnifiedStockCache'

interface Stock {
  id: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale?: number
  dateLastUpdate: string
  product: {
    id: string
    name: string
    sku?: string
    price: number
    unit: string
    category?: {
      id: string
      name: string
    }
  }
}

interface StockFilters {
  search: string
  lowStock: boolean
  outOfStock: boolean
  categoryId: string
}

export function StocksPage() {
  const router = useRouter()

  // Utilisation du hook unifié pour les données de stock
  const {
    products: unifiedProducts,
    loading: unifiedLoading,
    error: unifiedError,
    refresh: refreshUnified,
    lowStockProducts,
    outOfStockProducts,
    overStockProducts,
    normalStockProducts
  } = useUnifiedProducts()

  // États locaux pour les filtres
  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    lowStock: false,
    outOfStock: false,
    categoryId: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Filtrer les produits unifiés selon les critères
  const filteredProducts = unifiedProducts.filter(product => {
    // Filtre de recherche
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!product.name.toLowerCase().includes(searchLower) &&
          !product.sku?.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Filtre par catégorie
    if (filters.categoryId && product.category !== filters.categoryId) {
      return false
    }

    // Filtre par statut de stock
    if (filters.lowStock && product.status !== 'low') {
      return false
    }

    if (filters.outOfStock && product.status !== 'out') {
      return false
    }

    return true
  })



  // Statistiques basées sur les données unifiées
  const stats = {
    total: unifiedProducts.length,
    outOfStock: outOfStockProducts.length,
    lowStock: lowStockProducts.length,
    overStock: overStockProducts.length,
    normal: normalStockProducts.length
  }

  const actions = (
    <button
      onClick={() => router.push('/stocks/new')}
      className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nouveau Stock
    </button>
  )

  if (unifiedLoading) {
    return (
      <MainLayout title="Gestion de Stock" subtitle="Chargement..." actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout
      title="Gestion de Stock"
      subtitle={`${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {unifiedError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-destructive">Erreur</h3>
                <div className="mt-2 text-sm text-destructive">
                  <p>{unifiedError}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={refreshUnified}
                    className="bg-destructive/10 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/20"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-card text-card-foreground placeholder:text-muted-foreground"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="bg-secondary p-4 rounded-lg space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Stock faible</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.outOfStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, outOfStock: e.target.checked }))}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm">Rupture de stock</span>
              </label>
            </div>
          </div>
        )}

        {/* Liste des stocks */}
        <div className="bg-card border border-border shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Stock Actuel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Seuils
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valeur
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => {
                    const StatusIcon = getStockStatusIcon({ status: product.status } as any)

                    return (
                      <tr key={product.id} className="hover:bg-secondary">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-8 w-8 text-muted-foreground mr-3" />
                            <div>
                              <div className="text-sm font-medium text-card-foreground">
                                {product.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {product.sku && `SKU: ${product.sku}`}
                                {product.category && ` • ${product.category}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-card-foreground">
                              {product.stockQuantity} {product.unit}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              MAJ: {new Date(product.lastUpdate).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-card-foreground">
                            Min: {product.minStock} {product.maxStock ? `• Max: ${product.maxStock}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-card-foreground">
                            {formatCurrency(product.value)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === 'out' ? 'bg-destructive/10 text-destructive' :
                            product.status === 'low' ? 'bg-accent text-accent-foreground' :
                            product.status === 'over' ? 'bg-secondary text-card-foreground' :
                            'bg-primary/10 text-primary'
                          }`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {product.statusLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => router.push(`/products/${product.id}`)}
                            className="text-primary hover:text-card-foreground"
                            title="Voir le produit"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/products/${product.id}/edit`)}
                            className="text-primary hover:text-card-foreground"
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                      {unifiedLoading ? 'Chargement...' : 'Aucun produit trouvé'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
