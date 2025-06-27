'use client'

import { useEffect, useState } from 'react'
import { api, SalesAnalytics, EvolutionData } from '@/lib/api'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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

interface AnalyticsChartsProps {
  period?: string
}

export function AnalyticsCharts({ period = '12m' }: AnalyticsChartsProps) {
  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    loadAnalyticsData()
  }, [selectedPeriod])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      
      const [salesResponse, evolutionResponse] = await Promise.all([
        api.getSalesAnalytics({ period: selectedPeriod }),
        api.getEvolutionData({ metric: 'revenue', period: selectedPeriod })
      ])

      if (salesResponse.success && salesResponse.data) {
        // Vérifier que les données sont dans le bon format
        const safeSalesData = {
          ...salesResponse.data,
          monthlyRevenue: Array.isArray(salesResponse.data.monthlyRevenue) ? salesResponse.data.monthlyRevenue : [],
          topClients: Array.isArray(salesResponse.data.topClients) ? salesResponse.data.topClients : [],
          clientTypeDistribution: Array.isArray(salesResponse.data.clientTypeDistribution) ? salesResponse.data.clientTypeDistribution : []
        }
        setSalesData(safeSalesData)
      }

      if (evolutionResponse.success && evolutionResponse.data) {
        // Vérifier que les données d'évolution sont dans le bon format
        const safeEvolutionData = {
          ...evolutionResponse.data,
          data: Array.isArray(evolutionResponse.data.data) ? evolutionResponse.data.data : []
        }
        setEvolutionData(safeEvolutionData)
      }

      setError(null)
    } catch (err) {
      console.error('Erreur analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      // Initialiser avec des données vides en cas d'erreur
      setSalesData(null)
      setEvolutionData(null)
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

  const formatMonth = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      month: 'short',
      year: '2-digit'
    })
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur: {error}</p>
        <button
          onClick={loadAnalyticsData}
          className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Contrôles de période */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Avancées</h2>
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

      {/* Évolution du CA */}
      {evolutionData && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Évolution du Chiffre d'Affaires
          </h3>
          {evolutionData.data && Array.isArray(evolutionData.data) && evolutionData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={evolutionData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="period"
                  tickFormatter={formatMonth}
                />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'CA']}
                  labelFormatter={(label) => formatMonth(label)}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Aucune donnée d'évolution disponible</p>
            </div>
          )}
        </div>
      )}

      {/* Graphiques de ventes */}
      {salesData && (
        <>
          {/* CA mensuel détaillé */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Détail Mensuel des Ventes
            </h3>
            {salesData.monthlyRevenue && Array.isArray(salesData.monthlyRevenue) && salesData.monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={formatMonth}
                  />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'revenue') return [formatCurrency(value), 'CA']
                      if (name === 'invoiceCount') return [value, 'Factures']
                      if (name === 'avgInvoice') return [formatCurrency(value), 'Panier moyen']
                      return [value, name]
                    }}
                    labelFormatter={(label) => formatMonth(label)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#3B82F6" name="CA" />
                  <Bar dataKey="invoiceCount" fill="#10B981" name="Nb Factures" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Aucune donnée de vente mensuelle disponible</p>
              </div>
            )}
          </div>

          {/* Top clients */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Top 10 Clients par CA
            </h3>
            {salesData.topClients && Array.isArray(salesData.topClients) && salesData.topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={salesData.topClients.slice(0, 10)}
                  layout="horizontal"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatCurrency} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'CA']}
                  />
                  <Bar dataKey="totalRevenue" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Aucune donnée client disponible</p>
              </div>
            )}
          </div>

          {/* Répartition par type de client */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Répartition par Type de Client
            </h3>
            {salesData.clientTypeDistribution && Array.isArray(salesData.clientTypeDistribution) && salesData.clientTypeDistribution.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={salesData.clientTypeDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {(salesData.clientTypeDistribution || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Détails par type</h4>
                  {(salesData.clientTypeDistribution || []).map((item: any, index: number) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="text-sm font-medium">
                          {item.type === 'INDIVIDUAL' ? 'Particuliers' : 'Entreprises'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(item.revenue)}</div>
                        <div className="text-xs text-gray-500">{item.invoiceCount} factures</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <p>Aucune donnée de répartition par type de client disponible</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
