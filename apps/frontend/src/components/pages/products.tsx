'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportButtons, ImportExportMessage } from '@/components/ui/import-export-buttons'
import { Plus, Search, Filter, Package } from 'lucide-react'
import { api, Product } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import {
  ensureArray,
  safeFilter,
  safeFind,
  safeMap,
  safeTextRender,
  safeFormatDate
} from '@/lib/defensive-utils'
import {
  calculateStockStatus,
  getStockStatusClasses,
  getStockStatusIcon,
  formatStockQuantity,
  formatStockThresholds,
  type ProductWithStock
} from '@/lib/stock-utils'
import {
  useUnifiedStock,
  calculateUnifiedStockStatus,
  type UnifiedProduct
} from '@/hooks/useUnifiedStock'

export function ProductsPage() {
  const router = useRouter()

  // Utilisation du hook unifié pour les données de stock
  const {
    products: unifiedProducts,
    loading: unifiedLoading,
    error: unifiedError,
    refresh: refreshUnified,
    unifyData
  } = useUnifiedStock()

  // États locaux pour la compatibilité
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    category: '',
    stockStatus: '',
    priceRange: ''
  })
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  // Fonction d'authentification automatique
  const ensureAuthentication = async () => {
    const authToken = api.getAuthToken()
    if (authToken) {
      return true
    }

    try {
      console.log('🔐 Tentative de connexion automatique...')
      const loginResponse = await api.login({
        email: 'admin@gctpe.dz',
        password: 'admin123'
      })

      if (loginResponse.success && loginResponse.data?.token) {
        api.setAuthToken(loginResponse.data.token)

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth-tokens', JSON.stringify({
            accessToken: loginResponse.data.token,
            refreshToken: loginResponse.data.refreshToken || null
          }))
          localStorage.setItem('auth-user', JSON.stringify(loginResponse.data.user))
        }

        console.log('✅ Connexion automatique réussie')
        return true
      }
    } catch (error) {
      console.error('❌ Échec de la connexion automatique:', error)
    }

    return false
  }

  const loadProducts = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement des produits...')

      // S'assurer que l'utilisateur est authentifié
      const isAuthenticated = await ensureAuthentication()
      if (!isAuthenticated) {
        setError('Erreur d\'authentification. Impossible de charger les produits.')
        return
      }

      const response = await api.getProducts()
      console.log('📦 Réponse produits:', response)

      // Approche simplifiée et robuste
      let productsData: Product[] = []

      if (response && typeof response === 'object') {
        const apiResponse = response as any

        // Si la réponse a une structure success/data
        if (apiResponse.success && apiResponse.data) {
          if (Array.isArray(apiResponse.data)) {
            productsData = apiResponse.data
          } else if (Array.isArray(apiResponse.data.data)) {
            productsData = apiResponse.data.data
          }
        }
        // Si la réponse est directement un tableau
        else if (Array.isArray(apiResponse)) {
          productsData = apiResponse
        }
        // Si la réponse contient directement des données
        else if (Array.isArray(apiResponse.data)) {
          productsData = apiResponse.data
        }
      }

      // Assurer que nous avons toujours un tableau
      const safeProducts = ensureArray<Product>(productsData)
      console.log('✅ Produits chargés avec succès:', safeProducts.length, 'produits')

      setProducts(safeProducts)
      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des produits:', err)

      let errorMessage = 'Erreur de chargement'
      if (err instanceof Error) {
        if (err.message.includes('401')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
        } else if (err.message.includes('Network')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.'
        } else {
          errorMessage = err.message
        }
      }

      setError(errorMessage)
      // Garantir que products reste toujours un tableau valide
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Fonctions utilitaires
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(',')

    const csvRows = safeMap(data, row =>
      safeMap(headers, header => {
        const value = row[header]
        return typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))
          ? `"${value.replace(/"/g, '""')}"`
          : value
      }).join(',')
    )

    return [csvHeaders, ...csvRows].join('\n')
  }

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Utilisation du filtrage sécurisé pour éviter les erreurs "filter is not a function"
  const filteredProducts = safeFilter(products, (product) => {
    const searchLower = searchTerm.toLowerCase()

    // Filtrage par recherche textuelle
    const matchesSearch = (
      product.name?.toLowerCase().includes(searchLower) ||
      product.reference?.toLowerCase().includes(searchLower) ||
      (typeof product.category === 'string' ? product.category.toLowerCase().includes(searchLower) : false)
    )

    // Filtrage par catégorie
    const matchesCategory = !filters.category || (typeof product.category === 'string' ? product.category.toLowerCase().includes(filters.category.toLowerCase()) : false)

    // Filtrage par statut de stock
    let matchesStockStatus = true
    if (filters.stockStatus) {
      const stockStatus = getStockStatus(product)
      // Adapter les anciens filtres aux nouveaux statuts
      const filterMap: { [key: string]: string } = {
        'out': 'rupture',
        'low': 'faible',
        'ok': 'normal',
        'no-track': 'non-suivi'
      }
      const mappedFilter = filterMap[filters.stockStatus] || filters.stockStatus
      matchesStockStatus = stockStatus.status === mappedFilter
    }

    return matchesSearch && matchesCategory && matchesStockStatus
  })

  // Fonction pour adapter le produit au format ProductWithStock
  const adaptProductForStock = (product: Product): ProductWithStock => {
    return {
      id: product.id,
      name: product.name,
      stockQuantity: product.stockQuantity || 0,
      minStock: product.minStock || 0,
      maxStock: product.maxStock || null,
      isService: product.isService || false,
      isActive: product.isActive !== false,
      unit: product.unit || 'unité'
    }
  }

  // Utiliser la nouvelle logique de calcul du statut
  const getStockStatus = (product: Product) => {
    const adaptedProduct = adaptProductForStock(product)
    return calculateStockStatus(adaptedProduct)
  }

  // Gestionnaires pour l'import/export
  const handleImportSuccess = (result: any) => {
    setImportMessage({
      type: 'success',
      message: `Import réussi: ${result.data?.imported || 0} produits importés, ${result.data?.updated || 0} mis à jour`
    })
    // Recharger la liste des produits
    loadProducts()
  }

  const handleImportError = (error: string) => {
    setImportMessage({
      type: 'error',
      message: `Erreur d'import: ${error}`
    })
  }

  const handleExportError = (error: string) => {
    setError(`Erreur d'export: ${error}`)
  }

  const handleFilters = () => {
    console.log('Ouverture des filtres...')
    setShowFilters(!showFilters)
  }

  const handleNewProduct = () => {
    console.log('Navigation vers création produit...')
    router.push('/products/new')
  }

  const handleEditProduct = (productId: string) => {
    console.log('Navigation vers modification produit:', productId)
    router.push(`/products/${productId}/edit`)
  }

  const handleDeleteProduct = async (productId: string) => {
    const product = safeFind(products, p => p.id === productId)

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${product?.name}" ?\n\nCette action est irréversible.`)) {
      try {
        console.log('Suppression du produit:', productId)
        setLoading(true)

        // S'assurer que l'utilisateur est authentifié
        const isAuthenticated = await ensureAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Veuillez vous connecter.')
          return
        }

        await api.deleteProduct(productId)
        await loadProducts()

        console.log('✅ Produit supprimé avec succès')
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error)

        let errorMessage = 'Erreur lors de la suppression du produit'
        if (error instanceof Error) {
          if (error.message.includes('401')) {
            errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.'
          } else if (error.message.includes('404')) {
            errorMessage = 'Produit non trouvé.'
          } else {
            errorMessage = error.message
          }
        }

        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleViewProduct = (productId: string) => {
    console.log('Navigation vers détails produit:', productId)
    router.push(`/products/${productId}`)
  }

  const actions = (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={handleFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Filtres
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={unifyData}
        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      >
        🔄 Unifier
      </Button>
      <ImportExportButtons
        type="products"
        onImportSuccess={handleImportSuccess}
        onImportError={handleImportError}
        onExportError={handleExportError}
        showPdfExport={true}
        showImport={true}
      />
      <Button size="sm" onClick={handleNewProduct}>
        <Plus className="h-4 w-4 mr-2" />
        Nouveau produit
      </Button>
    </div>
  )

  return (
    <MainLayout 
      title="Produits" 
      subtitle={`${filteredProducts.length} produit${filteredProducts.length > 1 ? 's' : ''} trouvé${filteredProducts.length > 1 ? 's' : ''}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Barre de recherche et filtres */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtre par statut de stock */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Statut:</label>
            <select
              value={filters.stockStatus}
              onChange={(e) => setFilters(prev => ({ ...prev, stockStatus: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous</option>
              <option value="rupture">🔴 Rupture</option>
              <option value="faible">🟠 Stock faible</option>
              <option value="normal">🟢 Stock normal</option>
              <option value="non-suivi">⚪ Non suivi</option>
            </select>
          </div>
        </div>

        {/* Message d'import/export */}
        {importMessage && (
          <ImportExportMessage
            type={importMessage.type}
            message={importMessage.message}
            onClose={() => setImportMessage(null)}
          />
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de chargement
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadProducts}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Liste des produits */}
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Catégorie
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Chargement...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      {searchTerm ? 'Aucun produit trouvé pour cette recherche' : 'Aucun produit enregistré'}
                    </td>
                  </tr>
                ) : (
                  safeMap(ensureArray(filteredProducts), (product) => {
                    const stockStatus = getStockStatus(product)
                    return (
                      <tr key={safeTextRender(product.id, `product-${Math.random()}`)} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-green-600 rounded-lg flex items-center justify-center">
                              <Package className="h-5 w-5 text-white" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {safeTextRender(product.name, 'Produit sans nom')}
                              </div>
                              <div className="text-sm text-gray-500">
                                {safeTextRender(product.reference, 'Pas de référence')}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                            {typeof product.category === 'string' ? product.category : 'Non catégorisé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {formatStockQuantity(adaptProductForStock(product))}
                            </div>
                            {!product.isService && (
                              <div className="text-xs text-gray-500">
                                {formatStockThresholds(adaptProductForStock(product))}
                              </div>
                            )}
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
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewProduct(safeTextRender(product.id, ''))}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Voir
                          </button>
                          <button
                            onClick={() => handleEditProduct(safeTextRender(product.id, ''))}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(safeTextRender(product.id, ''))}
                            className="text-red-600 hover:text-red-900"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
