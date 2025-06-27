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
import { useUnifiedProducts } from '@/hooks/useUnifiedStockData'

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

  // États locaux pour la compatibilité et les filtres
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<StockFilters>({
    search: '',
    lowStock: false,
    outOfStock: false,
    categoryId: '',
  })
  const [showFilters, setShowFilters] = useState(false)

  const loadStocks = async () => {
    try {
      setLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      if (filters.search) queryParams.append('search', filters.search)
      if (filters.lowStock) queryParams.append('lowStock', 'true')
      if (filters.outOfStock) queryParams.append('outOfStock', 'true')
      if (filters.categoryId) queryParams.append('categoryId', filters.categoryId)

      const response = await api.get(`/api/v1/stock?${queryParams.toString()}`)
      
      if (response.data.success) {
        // Programmation défensive pour les arrays
        const stocksData = Array.isArray(response.data.data) ? response.data.data : []
        setStocks(stocksData)
      } else {
        setError(response.data.message || 'Erreur lors du chargement des stocks')
      }
    } catch (err: any) {
      console.error('Erreur lors du chargement des stocks:', err)
      setError('Erreur lors du chargement des stocks')
      // Programmation défensive - initialiser avec un array vide
      setStocks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStocks()
  }, [filters])



  // Adapter les données de stock au format ProductWithStock pour utiliser la logique unifiée
  const adaptStockForCalculation = (stock: Stock): ProductWithStock => {
    return {
      id: stock.id,
      name: stock.product?.name || 'Produit inconnu',
      stockQuantity: stock.quantiteActuelle,
      minStock: stock.quantiteMinimale,
      maxStock: stock.quantiteMaximale || null,
      isService: false, // Les stocks ne concernent que les produits physiques
      isActive: true,
      unit: stock.product?.unit || 'unité'
    }
  }

  // Utiliser la logique unifiée de calcul du statut
  const getStockStatus = (stock: Stock) => {
    const adaptedStock = adaptStockForCalculation(stock)
    return calculateStockStatus(adaptedStock)
  }

  const filteredStocks = Array.isArray(stocks) ? stocks.filter(stock => {
    if (!stock || !stock.product) return false
    
    const matchesSearch = !filters.search || 
      stock.product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (stock.product.sku && stock.product.sku.toLowerCase().includes(filters.search.toLowerCase()))
    
    // Utiliser la logique unifiée pour les filtres
    const stockStatus = getStockStatus(stock)
    const matchesLowStock = !filters.lowStock || stockStatus.status === 'faible'
    const matchesOutOfStock = !filters.outOfStock || stockStatus.status === 'rupture'
    
    return matchesSearch && matchesLowStock && matchesOutOfStock
  }) : []

  const actions = (
    <button
      onClick={() => router.push('/stocks/new')}
      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nouveau Stock
    </button>
  )

  if (loading) {
    return (
      <MainLayout title="Gestion de Stock" subtitle="Chargement..." actions={actions}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout 
      title="Gestion de Stock" 
      subtitle={`${filteredStocks.length} stock${filteredStocks.length > 1 ? 's' : ''} trouvé${filteredStocks.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Erreur</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadStocks}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtres
          </button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.lowStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, lowStock: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Stock faible</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={filters.outOfStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, outOfStock: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">Rupture de stock</span>
              </label>
            </div>
          </div>
        )}

        {/* Liste des stocks */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              <tbody className="bg-white divide-y divide-gray-200">
                {Array.isArray(filteredStocks) && filteredStocks.length > 0 ? (
                  filteredStocks.map((stock) => {
                    const stockStatus = getStockStatus(stock)
                    const StatusIcon = stockStatus.icon
                    
                    return (
                      <tr key={stock.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Package className="h-8 w-8 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {stock.product?.name || 'Nom non disponible'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {stock.product?.sku && `SKU: ${stock.product.sku}`}
                                {stock.product?.category && ` • ${stock.product.category.name}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatStockQuantity(adaptStockForCalculation(stock))}
                            </div>
                            <div className="text-xs text-gray-500">
                              Actuel: {stock.quantiteActuelle}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {formatStockThresholds(adaptStockForCalculation(stock))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(stock.quantiteActuelle * (stock.product?.price || 0), 'DA')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const StatusIcon = getStockStatusIcon(stockStatus)
                            return (
                              <span className={getStockStatusClasses(stockStatus)}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {stockStatus.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => router.push(`/stocks/${stock.id}`)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Voir les détails"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/stocks/${stock.id}/edit`)}
                            className="text-indigo-600 hover:text-indigo-900"
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
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {loading ? 'Chargement...' : 'Aucun stock trouvé'}
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
