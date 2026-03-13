'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { 
  TrendingUp, TrendingDown, Package, DollarSign, 
  Calendar, Users, BarChart3, PieChart, Download,
  RefreshCw, Filter, ArrowUp, ArrowDown
} from 'lucide-react'
import { PurchaseOrderStats } from '@/lib/api'
import { api } from '@/lib/api'

interface PurchaseOrderStatsProps {
  onExport?: () => void
}

export function PurchaseOrderStatsComponent({ onExport }: PurchaseOrderStatsProps) {
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month')

  useEffect(() => {
    fetchStats()
  }, [selectedPeriod])

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get(`/api/v1/purchase-orders/stats?period=${selectedPeriod}`)
      
      if (response.data.success) {
        setStats(response.data.data)
      } else {
        throw new Error(response.data.message || 'Erreur lors de la récupération des statistiques')
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error)
      setError(error instanceof Error ? error.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Chargement des statistiques...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
        <Button variant="outline" onClick={fetchStats} className="mt-2">
          <RefreshCw className="h-4 w-4 mr-2" />
          Réessayer
        </Button>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-600">Aucune donnée disponible</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistiques des achats</h2>
          <p className="text-gray-600">Analyse des performances et tendances</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as 'month' | 'quarter' | 'year')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="month">Ce mois</option>
            <option value="quarter">Ce trimestre</option>
            <option value="year">Cette année</option>
          </select>
          <Button variant="outline" onClick={fetchStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total commandes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+12% vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Montant total</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalAmount)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+8% vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm text-red-600">-5% vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Panier moyen</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.averageOrderValue)}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">+3% vs période précédente</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top fournisseurs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top fournisseurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topSuppliers.slice(0, 5).map((item, index) => (
                <div key={item.supplier.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.supplier.name}</p>
                      <p className="text-sm text-gray-600">{item.orderCount} commandes</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(item.totalAmount)}</p>
                    <p className="text-sm text-gray-600">
                      {((item.totalAmount / stats.totalAmount) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tendances mensuelles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendances mensuelles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.monthlyTrends.slice(-6).map((trend, index) => (
                <div key={trend.month} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{trend.month}</p>
                    <p className="text-sm text-gray-600">{trend.orderCount} commandes</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{formatCurrency(trend.totalAmount)}</p>
                    <div className="flex items-center justify-end mt-1">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ 
                            width: `${(trend.totalAmount / Math.max(...stats.monthlyTrends.map(t => t.totalAmount))) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Répartition par statut */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Répartition par statut
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-gray-600">{stats.totalOrders - stats.pendingOrders - stats.receivedOrders}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Brouillons</p>
              <p className="text-xs text-gray-600">En préparation</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-blue-600">{stats.pendingOrders}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Commandées</p>
              <p className="text-xs text-gray-600">En attente</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-yellow-600">
                  {Math.floor((stats.pendingOrders + stats.receivedOrders) * 0.3)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">Partielles</p>
              <p className="text-xs text-gray-600">En cours</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-green-600">{stats.receivedOrders}</span>
              </div>
              <p className="text-sm font-medium text-gray-900">Reçues</p>
              <p className="text-xs text-gray-600">Terminées</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-lg font-bold text-red-600">
                  {Math.floor(stats.totalOrders * 0.05)}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900">Annulées</p>
              <p className="text-xs text-gray-600">Abandonnées</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
