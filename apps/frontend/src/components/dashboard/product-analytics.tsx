'use client'

import { useEffect, useState } from 'react'
import { api, ProductAnalytics } from '@/lib/api'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { Package, TrendingUp, ShoppingCart, Star } from 'lucide-react'

interface ProductAnalyticsProps {
  period?: string
  limit?: number
}

export function ProductAnalyticsComponent({ period = '3m', limit = 10 }: ProductAnalyticsProps) {
  const [productData, setProductData] = useState<ProductAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    loadProductAnalytics()
  }, [selectedPeriod])

  const loadProductAnalytics = async () => {
    try {
      setLoading(true)
      
      // @ts-ignore - L'API accepte le paramètre limit même s'il n'est pas dans l'interface
      const response = await api.getProductAnalytics({ 
        period: selectedPeriod, 
        limit 
      } as any)

      if (response.success && response.data) {
        // Vérifier que les données sont dans le bon format
        const safeProductData = {
          ...response.data,
          topProducts: Array.isArray(response.data.topProducts) ? response.data.topProducts : [],
          categoryDistribution: Array.isArray(response.data.categoryDistribution) ? response.data.categoryDistribution : []
        }
        setProductData(safeProductData)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des analytics produits')
      }
    } catch (err) {
      console.error('Erreur product analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      // Initialiser avec des données vides en cas d'erreur
      setProductData(null)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value) + ' DA'
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#84CC16']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !productData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur: {error}</p>
        <button
          onClick={loadProductAnalytics}
          className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec contrôles */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Produits</h2>
        <div className="flex space-x-2">
          {['1m', '3m', '6m', '12m'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Métriques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Produits vendus</p>
              <p className="text-xl font-bold">
                {(productData.topProducts || []).reduce((sum, p) => sum + p.totalQuantity, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">CA Produits</p>
              <p className="text-xl font-bold">
                {formatCurrency((productData.topProducts || []).reduce((sum, p) => sum + p.totalRevenue, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Catégories</p>
              <p className="text-xl font-bold">{(productData.categoryDistribution || []).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center">
            <ShoppingCart className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Prix moyen</p>
              <p className="text-xl font-bold">
                {formatCurrency(
                  (productData.topProducts || []).reduce((sum: number, p: any) => sum + (p.price || 0), 0) /
                  Math.max((productData.topProducts || []).length, 1)
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top produits par CA */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top {limit} Produits par Chiffre d'Affaires
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={productData.topProducts || []} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatCurrency} />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={200}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'totalRevenue') return [formatCurrency(value), 'CA']
                if (name === 'totalQuantity') return [value, 'Quantité']
                return [value, name]
              }}
            />
            <Bar dataKey="totalRevenue" fill="#3B82F6" name="CA" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Répartition par catégorie */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Répartition par Catégorie
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={productData.categoryDistribution || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percent }) =>
                  `${category} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="totalRevenue"
              >
                {(productData.categoryDistribution || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Détails par catégorie</h4>
            <div className="max-h-64 overflow-y-auto">
              {(productData.categoryDistribution || []).map((item, index) => (
                <div key={item.category} className="flex items-center justify-between py-2">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="text-sm font-medium">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(item.revenue || 0)}</div>
                    <div className="text-xs text-gray-500">
                      {item.quantity || 0} unités • {item.count || 0} produits
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau détaillé des top produits */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Détail des Performances Produits
          </h3>
        </div>
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
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CA Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix Moyen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factures
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(productData.topProducts || []).map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(product as any).category || 'Non catégorisé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.totalQuantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(product.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency((product.totalRevenue / product.totalQuantity) || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(product as any).invoiceCount || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
