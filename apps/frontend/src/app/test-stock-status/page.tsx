'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  calculateStockStatus, 
  getStockStatusClasses, 
  getStockStatusIcon,
  formatStockQuantity,
  formatStockThresholds,
  type ProductWithStock 
} from '@/lib/stock-utils'

interface Product {
  id: string
  name: string
  stockQuantity: number
  minStock: number
  maxStock?: number | null
  isService?: boolean
  isActive?: boolean
  unit?: string
  price: number
}

interface StockAlert {
  id: string
  name: string
  stockQuantity: number
  minStock: number
}

interface AlertsData {
  outOfStock: StockAlert[]
  lowStock: StockAlert[]
  totalAlerts: number
}

export default function TestStockStatusPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [alerts, setAlerts] = useState<AlertsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔄 Chargement des données de test...')

      // Charger les produits et les alertes en parallèle
      const [productsResponse, alertsResponse] = await Promise.all([
        api.get('/api/v1/products'),
        api.get('/api/v1/stock/alerts')
      ])

      console.log('📦 Produits:', productsResponse.data)
      console.log('🚨 Alertes:', alertsResponse.data)

      if (productsResponse.data.success) {
        const productsData = productsResponse.data.data?.data || productsResponse.data.data || []
        setProducts(Array.isArray(productsData) ? productsData : [])
      }

      if (alertsResponse.data.success) {
        setAlerts(alertsResponse.data.data)
      }

    } catch (err: any) {
      console.error('❌ Erreur:', err)
      setError(err.response?.data?.message || err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

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

  const getProductStatus = (product: Product) => {
    const adaptedProduct = adaptProductForStock(product)
    return calculateStockStatus(adaptedProduct)
  }

  // Analyser la cohérence
  const analyzeConsistency = () => {
    if (!alerts || products.length === 0) return null

    const productStatuses = products.map(product => ({
      product,
      status: getProductStatus(product),
      adapted: adaptProductForStock(product)
    }))

    const frontendRupture = productStatuses.filter(p => p.status.status === 'rupture')
    const frontendFaible = productStatuses.filter(p => p.status.status === 'faible')

    const backendRupture = alerts.outOfStock || []
    const backendFaible = alerts.lowStock || []

    return {
      frontend: {
        rupture: frontendRupture.length,
        faible: frontendFaible.length,
        total: frontendRupture.length + frontendFaible.length
      },
      backend: {
        rupture: backendRupture.length,
        faible: backendFaible.length,
        total: alerts.totalAlerts || 0
      },
      consistent: (
        frontendRupture.length === backendRupture.length &&
        frontendFaible.length === backendFaible.length
      ),
      productStatuses
    }
  }

  const consistency = analyzeConsistency()

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement des données de test...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800">❌ Erreur</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🧪 Test de Cohérence des Statuts de Stock
        </h1>

        {/* Résumé de cohérence */}
        {consistency && (
          <div className={`mb-6 p-4 rounded-lg border ${
            consistency.consistent 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              consistency.consistent ? 'text-green-800' : 'text-red-800'
            }`}>
              {consistency.consistent ? '✅ Cohérence parfaite !' : '❌ Incohérence détectée'}
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-800">Frontend (Page Produits)</h4>
                <div>🔴 Rupture: {consistency.frontend.rupture}</div>
                <div>🟠 Stock faible: {consistency.frontend.faible}</div>
                <div><strong>Total: {consistency.frontend.total}</strong></div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Backend (API Alertes)</h4>
                <div>🔴 Rupture: {consistency.backend.rupture}</div>
                <div>🟠 Stock faible: {consistency.backend.faible}</div>
                <div><strong>Total: {consistency.backend.total}</strong></div>
              </div>
            </div>
          </div>
        )}

        {/* Tableau des produits avec statuts */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📦 Produits et leurs statuts</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seuils</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calcul</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.slice(0, 10).map(product => {
                  const adapted = adaptProductForStock(product)
                  const status = getProductStatus(product)
                  const StatusIcon = getStockStatusIcon(status)
                  
                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">ID: {product.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatStockQuantity(adapted)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatStockThresholds(adapted)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStockStatusClasses(status)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-500">
                          {product.isService ? 'Service' : 
                           product.stockQuantity === 0 ? 'stock = 0' :
                           product.stockQuantity <= product.minStock ? `${product.stockQuantity} ≤ ${product.minStock}` :
                           `${product.stockQuantity} > ${product.minStock}`}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            🔄 Actualiser
          </button>
          <a
            href="/sync-stock"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            🔧 Synchroniser les stocks
          </a>
          <a
            href="/products"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📦 Voir les produits
          </a>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            📊 Tableau de bord
          </a>
        </div>
      </div>
    </div>
  )
}
