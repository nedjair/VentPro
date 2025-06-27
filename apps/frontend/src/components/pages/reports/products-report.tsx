'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Package, TrendingUp, DollarSign, BarChart3, Calendar } from 'lucide-react'
import { api, ProductAnalytics } from '@/lib/api'
import Link from 'next/link'

export function ProductsReportPage() {
  const [productData, setProductData] = useState<ProductAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('3m')

  useEffect(() => {
    loadProductData()
  }, [period])

  const loadProductData = async () => {
    try {
      setLoading(true)
      // @ts-ignore - L'API accepte le paramètre limit même s'il n'est pas dans l'interface
      const response = await api.getProductAnalytics({ period, limit: 20 })
      
      if (response.success && response.data) {
        setProductData(response.data)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des données')
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données produits:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const actions = (
    <div className="flex space-x-2">
      <Link href="/reports">
        <Button variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </Link>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export PDF
      </Button>
      <Button variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export Excel
      </Button>
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Rapport des Produits">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Rapport des Produits">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={loadProductData} variant="outline">
              Réessayer
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalQuantity = (productData?.topProducts || []).reduce((sum: number, product: any) => sum + product.totalQuantity, 0)
  const totalRevenue = (productData?.topProducts || []).reduce((sum: number, product: any) => sum + product.totalRevenue, 0)
  const totalProducts = (productData?.topProducts || []).length

  return (
    <MainLayout 
      title="Rapport des Produits" 
      subtitle={`Analyse des performances produits sur ${period === '12m' ? '12 mois' : period === '6m' ? '6 mois' : '3 mois'}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Filtres de période */}
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Période d'analyse:</span>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="3m">3 derniers mois</option>
                  <option value="6m">6 derniers mois</option>
                  <option value="12m">12 derniers mois</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* KPI principaux */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Produits vendus</p>
                  <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Quantité totale</p>
                  <p className="text-2xl font-bold text-gray-900">{totalQuantity}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA produits</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Prix moyen</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalQuantity > 0 ? (totalRevenue / totalQuantity).toFixed(2) : '0.00'} €
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top produits */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Top produits par chiffre d'affaires</h3>
          </div>
          <div className="card-content">
            {productData?.topProducts && productData.topProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rang
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Produit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Catégorie
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantité vendue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CA total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prix moyen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nb factures
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(productData.topProducts || []).map((product: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                            <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">Prix: {product.price.toFixed(2)} €</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {product.category || 'Non catégorisé'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.totalQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.totalRevenue.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.avgPrice.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.invoiceCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucun produit vendu pour cette période</p>
            )}
          </div>
        </div>

        {/* Répartition par catégorie */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Répartition par catégorie</h3>
          </div>
          <div className="card-content">
            {productData?.categoryDistribution && productData.categoryDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(productData.categoryDistribution || []).map((category: any, index: number) => {
                  const revenuePercentage = totalRevenue > 0 ? (category.totalRevenue / totalRevenue) * 100 : 0
                  
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {category.category || 'Non catégorisé'}
                        </h4>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {category.productCount} produits
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Quantité vendue:</span>
                          <span className="text-sm font-medium">{category.totalQuantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">CA total:</span>
                          <span className="text-sm font-medium">{category.totalRevenue.toFixed(2)} €</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Part du CA:</span>
                          <span className="text-sm font-medium text-blue-600">{revenuePercentage.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.max(revenuePercentage, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée de catégorie disponible</p>
            )}
          </div>
        </div>

        {/* Analyse des marges */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Analyse des marges (Top 10)</h3>
          </div>
          <div className="card-content">
            {productData?.topProducts && productData.topProducts.length > 0 ? (
              <div className="space-y-4">
                {(productData.topProducts || []).slice(0, 10).map((product: any, index: number) => {
                  // Simulation du calcul de marge (30% par défaut)
                  const estimatedCost = product.price * 0.7
                  const margin = product.price - estimatedCost
                  const marginPercentage = (margin / product.price) * 100
                  const totalMargin = margin * product.totalQuantity
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                          <span className="text-sm font-bold text-purple-600">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{product.name}</h4>
                          <p className="text-xs text-gray-500">{product.category || 'Non catégorisé'}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-4 text-right">
                        <div>
                          <p className="text-xs text-gray-600">Prix vente</p>
                          <p className="text-sm font-medium">{product.price.toFixed(2)} €</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Marge unitaire</p>
                          <p className="text-sm font-medium text-green-600">{margin.toFixed(2)} €</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">% Marge</p>
                          <p className="text-sm font-medium text-green-600">{marginPercentage.toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Marge totale</p>
                          <p className="text-sm font-bold text-green-600">{totalMargin.toFixed(2)} €</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée de marge disponible</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
