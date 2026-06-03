'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { 
  calculateStockStatus, 
  getStockStatusClasses, 
  getStockStatusIcon,
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

interface Stock {
  id: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale?: number | null
  product: {
    id: string
    name: string
    unit: string
    price: number
  }
}

interface ComparisonData {
  productId: string
  productName: string
  
  // Données de la page produits
  productData: {
    stockQuantity: number
    minStock: number
    maxStock?: number | null
    status: any
  }
  
  // Données de la page stocks
  stockData: {
    quantiteActuelle: number
    quantiteMinimale: number
    quantiteMaximale?: number | null
    status: any
  }
  
  // Cohérence
  isConsistent: boolean
  differences: string[]
}

export default function TestStockConsistencyPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [comparison, setComparison] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {

      // Charger les produits et les stocks en parallèle
      const [productsResponse, stocksResponse] = await Promise.all([
        api.get('/api/v1/products'),
        api.get('/api/v1/stock')
      ])

      let productsData: Product[] = []
      let stocksData: Stock[] = []

      if (productsResponse.data.success) {
        const rawProducts = productsResponse.data.data?.data || productsResponse.data.data || []
        productsData = Array.isArray(rawProducts) ? rawProducts : []
      }

      if (stocksResponse.data.success) {
        const rawStocks = stocksResponse.data.data?.data || stocksResponse.data.data || []
        stocksData = Array.isArray(rawStocks) ? rawStocks : []
      }

      setProducts(productsData)
      setStocks(stocksData)

      // Effectuer la comparaison
      const comparisonData = compareData(productsData, stocksData)
      setComparison(comparisonData)

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

  const adaptStockForCalculation = (stock: Stock): ProductWithStock => {
    return {
      id: stock.id,
      name: stock.product?.name || 'Produit inconnu',
      stockQuantity: stock.quantiteActuelle,
      minStock: stock.quantiteMinimale,
      maxStock: stock.quantiteMaximale || null,
      isService: false,
      isActive: true,
      unit: stock.product?.unit || 'unité'
    }
  }

  const compareData = (products: Product[], stocks: Stock[]): ComparisonData[] => {
    const comparison: ComparisonData[] = []

    // Créer un map des stocks par productId pour faciliter la recherche
    const stocksByProductId = new Map<string, Stock>()
    stocks.forEach(stock => {
      if (stock.product?.id) {
        stocksByProductId.set(stock.product.id, stock)
      }
    })

    // Comparer chaque produit avec son stock correspondant
    products.forEach(product => {
      const correspondingStock = stocksByProductId.get(product.id)
      
      if (correspondingStock) {
        const productStatus = calculateStockStatus(adaptProductForStock(product))
        const stockStatus = calculateStockStatus(adaptStockForCalculation(correspondingStock))
        
        const differences: string[] = []
        
        // Vérifier les différences de quantité
        if (product.stockQuantity !== correspondingStock.quantiteActuelle) {
          differences.push(`Quantité: ${product.stockQuantity} vs ${correspondingStock.quantiteActuelle}`)
        }
        
        // Vérifier les différences de seuil minimum
        if (product.minStock !== correspondingStock.quantiteMinimale) {
          differences.push(`Min: ${product.minStock} vs ${correspondingStock.quantiteMinimale}`)
        }
        
        // Vérifier les différences de seuil maximum
        if (product.maxStock !== correspondingStock.quantiteMaximale) {
          differences.push(`Max: ${product.maxStock || 'null'} vs ${correspondingStock.quantiteMaximale || 'null'}`)
        }
        
        // Vérifier les différences de statut
        if (productStatus.status !== stockStatus.status) {
          differences.push(`Statut: ${productStatus.label} vs ${stockStatus.label}`)
        }
        
        comparison.push({
          productId: product.id,
          productName: product.name,
          productData: {
            stockQuantity: product.stockQuantity,
            minStock: product.minStock,
            maxStock: product.maxStock,
            status: productStatus
          },
          stockData: {
            quantiteActuelle: correspondingStock.quantiteActuelle,
            quantiteMinimale: correspondingStock.quantiteMinimale,
            quantiteMaximale: correspondingStock.quantiteMaximale,
            status: stockStatus
          },
          isConsistent: differences.length === 0,
          differences
        })
      }
    })

    return comparison
  }

  const consistentItems = comparison.filter(item => item.isConsistent)
  const inconsistentItems = comparison.filter(item => !item.isConsistent)

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Chargement de la comparaison...</p>
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
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          🔍 Test de Cohérence : Page Produits ↔ Page Stocks
        </h1>

        {/* Résumé global */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800">📊 Total</h3>
            <p className="text-2xl font-bold text-blue-900">{comparison.length}</p>
            <p className="text-sm text-blue-700">Produits comparés</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">✅ Cohérents</h3>
            <p className="text-2xl font-bold text-green-900">{consistentItems.length}</p>
            <p className="text-sm text-green-700">Données synchronisées</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800">❌ Incohérents</h3>
            <p className="text-2xl font-bold text-red-900">{inconsistentItems.length}</p>
            <p className="text-sm text-red-700">Nécessitent synchronisation</p>
          </div>
        </div>

        {/* Alerte si incohérences */}
        {inconsistentItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Incohérences détectées</h3>
            <p className="text-yellow-700 mb-3">
              {inconsistentItems.length} produit(s) ont des données différentes entre la page produits et la page stocks.
            </p>
            <a
              href="/sync-stock"
              className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              🔧 Synchroniser maintenant
            </a>
          </div>
        )}

        {/* Tableau de comparaison */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Produits</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Page Stocks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Différences</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparison.slice(0, 20).map(item => {
                const ProductStatusIcon = getStockStatusIcon(item.productData.status)
                const StockStatusIcon = getStockStatusIcon(item.stockData.status)
                
                return (
                  <tr key={item.productId} className={`hover:bg-gray-50 ${!item.isConsistent ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">ID: {item.productId.slice(0, 8)}...</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div>Stock: {item.productData.stockQuantity}</div>
                        <div>Min: {item.productData.minStock}</div>
                        <div>Max: {item.productData.maxStock || 'null'}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div>Stock: {item.stockData.quantiteActuelle}</div>
                        <div>Min: {item.stockData.quantiteMinimale}</div>
                        <div>Max: {item.stockData.quantiteMaximale || 'null'}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={getStockStatusClasses(item.productData.status)}>
                          <ProductStatusIcon className="h-3 w-3 mr-1" />
                          {item.productData.status.label}
                        </span>
                        <br />
                        <span className={getStockStatusClasses(item.stockData.status)}>
                          <StockStatusIcon className="h-3 w-3 mr-1" />
                          {item.stockData.status.label}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isConsistent ? (
                        <span className="text-green-600 text-sm">✅ Cohérent</span>
                      ) : (
                        <div className="text-red-600 text-sm">
                          {item.differences.map((diff, index) => (
                            <div key={index}>❌ {diff}</div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
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
            🔧 Synchroniser les données
          </a>
          <a
            href="/products"
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            📦 Page Produits
          </a>
          <a
            href="/stocks"
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            📋 Page Stocks
          </a>
        </div>
      </div>
    </div>
  )
}
