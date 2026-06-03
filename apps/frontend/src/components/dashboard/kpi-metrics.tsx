'use client'

import { useCallback, useEffect, useState } from 'react'
import { api, KPIMetrics } from '@/lib/api'
import { normalizeCurrencyCode } from '@/lib/currency'
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

  const loadKPIData = useCallback(async () => {
    try {
      const response = await api.getKPIMetrics()

      if (response.success && response.data) {
        setKpi(response.data)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des KPI')
      }
    } catch (err) {
      console.error('❌ Erreur KPI:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadKPIData()

    const interval = setInterval(() => {
      void loadKPIData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [loadKPIData, refreshInterval])

  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: normalizeCurrencyCode(currency),
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const comparisonLabel = 'objectif configuré'

  const formatVariance = (value: number | null) => {
    if (value === null) {
      return 'À configurer'
    }

    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const renderTargetValue = (target: number | null, formatter: (value: number) => string) => {
    if (target === null) {
      return 'Objectif non défini'
    }

    return `Objectif : ${formatter(target)}`
  }

  const renderVarianceBlock = (value: number | null) => {
    if (value === null) {
      return (
        <div className="flex items-center">
          <Target className="h-4 w-4 text-gray-400 mr-1" />
          <span className="text-sm text-gray-500">Objectif à configurer</span>
        </div>
      )
    }

    return (
      <div className="flex items-center">
        {value >= 0 ? (
          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
        )}
        <span className={`text-sm font-medium ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatVariance(value)}
        </span>
        <span className="text-sm text-gray-500 ml-1">vs {comparisonLabel}</span>
      </div>
    )
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
          Dernière mise à jour: {new Date(kpi.lastUpdated).toLocaleTimeString('fr-FR')}
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
                {formatCurrency(kpi.revenue.current, kpi.revenue.currency)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {renderTargetValue(kpi.revenue.target, (value) => formatCurrency(value, kpi.revenue.currency))}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderVarianceBlock(kpi.revenue.growth)}
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
                {renderTargetValue(kpi.orders.target, (value) => value.toString())}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderVarianceBlock(kpi.orders.growth)}
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
                {renderTargetValue(kpi.clients.target, (value) => value.toString())}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderVarianceBlock(kpi.clients.growth)}
          </div>
        </div>

        {/* Taux de Conversion */}
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Taux de Conversion</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercent(kpi.conversion.rate)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {renderTargetValue(kpi.conversion.target, (value) => formatPercent(value))}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Percent className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            {renderVarianceBlock(kpi.conversion.growth)}
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
              <span className="font-medium">{formatCurrency(kpi.revenue.current, kpi.revenue.currency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Objectif CA</span>
              <span className="font-medium text-blue-600">
                {kpi.revenue.target === null ? 'Non défini' : formatCurrency(kpi.revenue.target, kpi.revenue.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Écart objectif</span>
              <span className={`font-medium ${kpi.revenue.growth === null ? 'text-gray-500' : kpi.revenue.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatVariance(kpi.revenue.growth)}
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
              <span className="font-medium text-green-600">{kpi.orders.target ?? 'Non défini'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Commandes en attente</span>
              <span className="font-medium">{kpi.orders.pending}</span>
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
              <span className="text-sm text-gray-600">Objectif conversion</span>
              <span className="font-medium text-purple-600">{kpi.conversion.target === null ? 'Non défini' : formatPercent(kpi.conversion.target)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Devis convertis</span>
              <span className="font-medium">{kpi.conversion.convertedQuotes} / {kpi.conversion.quotes}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

