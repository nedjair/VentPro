'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  RefreshCw,
  AlertTriangle,
  TrendingDown,
  CheckCircle,
  Plus
} from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useUnifiedProducts } from '@/hooks/useUnifiedStockData'
import { formatCurrency } from '@/lib/utils'

interface UnifiedProductsListProps {
  showFilters?: boolean
  showActions?: boolean
  maxHeight?: string
}

export function UnifiedProductsList({ 
  showFilters = true, 
  showActions = true,
  maxHeight = "600px" 
}: UnifiedProductsListProps) {
  const router = useRouter()
  const {
    products,
    loading,
    error,
    refresh,
    forceRefresh,
    lowStockProducts,
    outOfStockProducts,
    overStockProducts,
    normalStockProducts
  } = useUnifiedProducts()

  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priceRange: ''
  })
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const scrollParentRef = useRef<HTMLDivElement | null>(null)

  // Filtrage des produits
  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtre par statut
    if (filters.status) {
      filtered = filtered.filter(product => product.status === filters.status)
    }

    return filtered
  }, [products, searchTerm, filters])

  const rowVirtualizer = useVirtualizer({
    count: filteredProducts.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => (showActions ? 132 : 112),
    overscan: 8,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out':
        return <AlertTriangle className="h-4 w-4" />
      case 'low':
        return <TrendingDown className="h-4 w-4" />
      case 'over':
        return <Package className="h-4 w-4" />
      default:
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'out':
        return 'destructive'
      case 'low':
        return 'secondary'
      case 'over':
        return 'default'
      default:
        return 'outline'
    }
  }

  const handleProductClick = (productId: string) => {
    router.push(`/products/${productId}`)
  }

  const handleEditProduct = (productId: string) => {
    router.push(`/products/${productId}/edit`)
  }

  const handleNewProduct = () => {
    router.push('/products/new')
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Chargement des produits...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="text-center text-red-600">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">{error}</p>
            <div className="flex gap-2 justify-center mt-3">
              <Button variant="outline" size="sm" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Réessayer
              </Button>
              <Button variant="outline" size="sm" onClick={forceRefresh}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Forcer
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Gestion de Stock
              <span className="ml-2 text-sm text-gray-500">({products.length} produits)</span>
            </h3>
            <div className="mt-1 flex gap-4 text-sm text-gray-600">
              <span className="text-red-600">🔴 {outOfStockProducts.length} rupture</span>
              <span className="text-orange-600">🟠 {lowStockProducts.length} faible</span>
              <span className="text-blue-600">🔵 {overStockProducts.length} surstock</span>
              <span className="text-green-600">🟢 {normalStockProducts.length} normal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            {showActions && (
              <Button size="sm" onClick={handleNewProduct}>
                <Plus className="h-4 w-4 mr-1" />
                Nouveau
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filtres */}
      {showFilters && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            {/* Recherche */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtre par statut */}
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les statuts</option>
              <option value="out">🔴 Rupture</option>
              <option value="low">🟠 Stock faible</option>
              <option value="over">🔵 Surstock</option>
              <option value="normal">🟢 Stock normal</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtres
            </Button>
          </div>
        </div>
      )}

      {/* Liste des produits */}
      <div
        ref={scrollParentRef}
        style={{ height: maxHeight }}
        className="overflow-y-auto"
      >
        {filteredProducts.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Aucun produit trouvé</p>
            {searchTerm && (
              <p className="text-sm mt-1">Essayez de modifier votre recherche</p>
            )}
          </div>
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
          >
            {virtualRows.map((virtualRow) => {
              const product = filteredProducts[virtualRow.index]

              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 w-full border-b border-gray-200 p-4 hover:bg-gray-50 cursor-pointer"
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => handleProductClick(product.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 mr-3">
                        {getStatusIcon(product.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </h4>
                          <Badge variant={getStatusBadgeVariant(product.status)}>
                            {product.statusLabel}
                          </Badge>
                        </div>
                        {product.sku && (
                          <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>
                            <strong>{product.stockQuantity}</strong> {product.unit}
                          </span>
                          <span>Min: {product.minStock}</span>
                          {product.maxStock && <span>Max: {product.maxStock}</span>}
                          <span className="text-green-600 font-medium">
                            {formatCurrency(product.value)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {showActions && (
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleProductClick(product.id)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditProduct(product.id)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
