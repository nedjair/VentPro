'use client'

import { useEffect, useState } from 'react'
import { api, KPIMetrics } from '@/lib/api'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  ShoppingCart,
  Percent
} from 'lucide-react'

interface KPIMetricsProps {
  refreshInterval?: number
}

export function KPIMetricsComponent({ refreshInterval = 30000 }: KPIMetricsProps) {
  const [kpi, setKpi] = useState<KPIMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadKPIData()
    
    const interval = setInterval(loadKPIData, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval])

  const loadKPIData = async () => {
    try {
      console.log('🔍 Chargement des KPI...')
      const response = await api.getKPIMetrics()
      console.log('📊 Réponse KPI:', response)

      if (response.success && response.data) {
        console.log('✅ KPI chargés avec succès:', response.data)
        setKpi(response.data)
        setError(null)
      } else {
        console.error('❌ Erreur dans la réponse KPI:', response)
        throw new Error('Erreur lors du chargement des KPI')
      }
    } catch (err) {
      console.error('❌ Erreur KPI:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount) + ' DA'
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error || !kpi) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur lors du chargement des KPI: {error}</p>
        <button
          onClick={loadKPIData}
          className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">KPI Temps Réel</h2>
        <div className="text-sm text-gray-500">
          Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
        </div>
      </div>

      {/* Métriques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Chiffre d'Affaires */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(kpi.revenue.current)} €
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Objectif: {formatCurrency(kpi.revenue.target)} €
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              {kpi.revenue.percentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${kpi.revenue.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.revenue.percentage >= 0 ? '+' : ''}{kpi.revenue.percentage.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs objectif</span>
            </div>
          </div>
        </div>

        {/* Commandes */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Commandes</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpi.orders.current}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Objectif: {kpi.orders.target}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              {kpi.orders.percentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${kpi.orders.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.orders.percentage >= 0 ? '+' : ''}{kpi.orders.percentage.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs objectif</span>
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpi.clients.current}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Objectif: {kpi.clients.target}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              {kpi.clients.percentage >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${kpi.clients.percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.clients.percentage >= 0 ? '+' : ''}{kpi.clients.percentage.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs objectif</span>
            </div>
          </div>
        </div>

        {/* Taux de Conversion */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Conversion</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(0.25)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Objectif: {formatPercent(0.30)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Percent className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center">
              {true ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium text-green-600`}>
                +5.2%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs objectif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Métriques secondaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Commerciale</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Revenus actuels</span>
              <span className="font-medium">{formatCurrency(kpi.revenue.current)} {kpi.revenue.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Objectif revenus</span>
              <span className="font-medium text-blue-600">{formatCurrency(kpi.revenue.target)} {kpi.revenue.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Performance</span>
              <span className={`font-medium ${kpi.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.revenue.growth >= 0 ? '+' : ''}{kpi.revenue.growth.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Activité Commerciale</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Commandes actuelles</span>
              <span className="font-medium">{kpi.orders.current}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Objectif commandes</span>
              <span className="font-medium text-green-600">{kpi.orders.target}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Clients actuels</span>
              <span className="font-medium">{kpi.clients.current}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversion</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Taux actuel</span>
              <span className="font-medium">{formatPercent(kpi.conversion.rate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Objectif</span>
              <span className="font-medium text-purple-600">{formatPercent(kpi.conversion.target)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Performance</span>
              <span className={`font-medium ${kpi.conversion.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpi.conversion.growth >= 0 ? '+' : ''}{kpi.conversion.growth.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
