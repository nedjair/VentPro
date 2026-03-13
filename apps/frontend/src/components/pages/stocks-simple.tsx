'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package, TrendingUp } from 'lucide-react'

import { MainLayout } from '@/components/layout/main-layout'
import { api } from '@/lib/api'
import { ensureApiAuthentication } from '@/lib/auth-utils'
import {
  upsertHeaderNotificationsBySource,
  type AppHeaderNotification,
} from '@/lib/header-notifications'
import {
  calculateStockStatus,
  formatStockQuantity,
  formatStockThresholds,
  getStockStatusClasses,
  getStockStatusIcon,
  sortProductsByStockPriority,
  type ProductWithStock,
} from '@/lib/stock-utils'
import { formatCurrency } from '@/lib/utils'

interface UnifiedProduct {
  id: string
  name: string
  description?: string
  sku?: string
  price: number
  stockQuantity: number
  minStock: number
  maxStock?: number | null
  isActive: boolean
  isService: boolean
  unit: string
  category?: {
    id: string
    name: string
  }
}

const PAGE_TITLE = 'Gestion des Stocks'
const PAGE_SUBTITLE = 'Suivi et gestion des niveaux de stock'
const OVERSTOCK_BADGE_CLASSES = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800'
const STOCK_NOTIFICATION_SOURCE = 'stock-status' as const

const normalizeSearchValue = (value?: string | null) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const adaptProductForStock = (product: UnifiedProduct): ProductWithStock => ({
  id: product.id,
  name: product.name,
  stockQuantity: product.stockQuantity || 0,
  minStock: product.minStock || 0,
  maxStock: product.maxStock || null,
  isService: product.isService,
  isActive: product.isActive,
  unit: product.unit || 'unité',
})

const getDisplayStockStatus = (product: UnifiedProduct) => {
  const baseStatus = calculateStockStatus(adaptProductForStock(product))

  if (
    !product.isService &&
    product.maxStock &&
    product.stockQuantity >= product.maxStock &&
    product.stockQuantity > product.minStock
  ) {
    return {
      ...baseStatus,
      status: 'surstock' as const,
      label: 'Surstock',
      icon: TrendingUp,
    }
  }

  return baseStatus
}

const matchesStockSearch = (product: UnifiedProduct, searchTerm: string) => {
  const normalizedSearchTerm = normalizeSearchValue(searchTerm)

  if (!normalizedSearchTerm) {
    return true
  }

  const searchableFields = [
    product.name,
    product.sku,
    product.description,
    product.category?.name,
    getDisplayStockStatus(product).label,
  ]

  return searchableFields.some((field) => normalizeSearchValue(field).includes(normalizedSearchTerm))
}

export function buildStockStatusNotifications(products: UnifiedProduct[]): AppHeaderNotification[] {
  return sortProductsByStockPriority(products.map(adaptProductForStock))
    .map((sortedProduct) => products.find((product) => product.id === sortedProduct.id))
    .filter((product): product is UnifiedProduct => Boolean(product && !product.isService))
    .map((product) => ({
      product,
      status: getDisplayStockStatus(product),
    }))
    .filter(({ status }) => status.status === 'faible' || status.status === 'rupture')
    .map(({ product, status }) => ({
      id: `stock-status-${product.id}`,
      source: STOCK_NOTIFICATION_SOURCE,
      title: status.status === 'rupture' ? 'Rupture de stock' : 'Alerte stock faible',
      message:
        status.status === 'rupture'
          ? `Rupture de stock : ${product.name} — quantité restante : ${product.stockQuantity}`
          : `Stock faible : ${product.name} — quantité restante : ${product.stockQuantity}`,
      createdAt: new Date().toISOString(),
      href: '/stocks',
    }))
}

export function StocksPageSimple() {
  const router = useRouter()
  const [products, setProducts] = useState<UnifiedProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const getDisplayStockStatusClasses = (product: UnifiedProduct) => {
    const status = getDisplayStockStatus(product)

    if (status.status === 'surstock') {
      return OVERSTOCK_BADGE_CLASSES
    }

    return getStockStatusClasses(status)
  }

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true)
        setError(null)

        const isAuthenticated = await ensureApiAuthentication()
        if (!isAuthenticated) {
          setError('Erreur d\'authentification. Impossible de charger les produits.')
          return
        }

        const response = await api.get('/api/v1/products?limit=100')

        if (!response.data.success) {
          throw new Error(response.data.message || 'Erreur lors du chargement')
        }

        const productsData = response.data.data?.data || response.data.data || []
        const transformedProducts: UnifiedProduct[] = productsData.map((product: any) => ({
          id: product.id,
          name: product.name || product.nom || 'Produit sans nom',
          description: product.description,
          sku: product.sku || product.reference,
          price: parseFloat(product.price || product.prix || '0'),
          stockQuantity: parseInt(product.stockQuantity || product.stock || '0'),
          minStock: parseInt(product.minStock || product.seuilMin || '0'),
          maxStock: product.maxStock || product.seuilMax || null,
          isActive: product.isActive !== false,
          isService: product.isService === true,
          unit: product.unit || product.unite || 'unité',
          category: product.category || product.categorie,
        }))

        setProducts(transformedProducts)
      } catch (err) {
        console.error('❌ Erreur lors du chargement des produits:', err)
        setError('Erreur lors du chargement des produits')
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const stockProducts = useMemo(() => products.filter((product) => !product.isService), [products])
  const filteredStockProducts = useMemo(
    () => stockProducts.filter((product) => matchesStockSearch(product, searchTerm)),
    [stockProducts, searchTerm]
  )

  useEffect(() => {
    upsertHeaderNotificationsBySource(STOCK_NOTIFICATION_SOURCE, buildStockStatusNotifications(stockProducts))
  }, [stockProducts])

  if (loading) {
    return (
      <MainLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <div className="p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-secondary rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-secondary rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-secondary rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
        <div className="p-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-destructive mb-2">Erreur</h2>
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout title={PAGE_TITLE} subtitle={PAGE_SUBTITLE}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Produits</p>
                <p className="text-2xl font-bold text-card-foreground">{stockProducts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-accent-foreground" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Stock Faible</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {stockProducts.filter((product) => product.stockQuantity <= product.minStock && product.stockQuantity > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card p-6 rounded-lg shadow-sm border border-border">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-destructive" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Rupture</p>
                <p className="text-2xl font-bold text-card-foreground">
                  {stockProducts.filter((product) => product.stockQuantity <= 0).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="border-b border-border px-6 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-md lg:flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <input
                  type="text"
                  placeholder="Rechercher par produit, référence ou catégorie..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label="Rechercher dans les stocks"
                  className="pl-10 pr-4 py-2 w-full border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-card text-card-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

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
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Seuils
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {filteredStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-muted-foreground">
                      Aucun stock ne correspond à votre recherche.
                    </td>
                  </tr>
                ) : filteredStockProducts.map((product) => {
                  const stockStatus = getDisplayStockStatus(product)
                  const StatusIcon = stockStatus.icon === TrendingUp ? TrendingUp : getStockStatusIcon(stockStatus)

                  return (
                    <tr key={product.id} className="hover:bg-secondary">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-card-foreground">{product.name}</div>
                            <div className="text-sm text-muted-foreground">SKU: {product.sku || 'N/A'}</div>
                            {product.category ? (
                              <div className="text-xs text-muted-foreground">{product.category.name}</div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        <div>
                          <div className="font-medium">{formatStockQuantity(adaptProductForStock(product))}</div>
                          <div className="text-xs text-muted-foreground">
                            Valeur: {formatCurrency(product.stockQuantity * product.price)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                        <div className="font-medium">{formatStockThresholds(adaptProductForStock(product))}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getDisplayStockStatusClasses(product)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {stockStatus.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-card-foreground">
                        <button
                          onClick={() => router.push(`/products/${product.id}`)}
                          className="text-primary hover:text-card-foreground mr-3"
                        >
                          Voir
                        </button>
                        <button
                          onClick={() => router.push(`/stocks/${product.id}/edit`)}
                          className="text-primary hover:text-card-foreground"
                        >
                          Modifier
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
