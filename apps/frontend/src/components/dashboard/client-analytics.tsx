'use client'

import { useEffect, useState } from 'react'
import { api, ClientAnalytics } from '@/lib/api'
import { ensureArray, safeMap } from '@/lib/defensive-utils'
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
import { Users, Building, MapPin, Crown, Star, TrendingUp } from 'lucide-react'

export function ClientAnalyticsComponent() {
  const [clientData, setClientData] = useState<ClientAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClientAnalytics()
  }, [])

  const loadClientAnalytics = async () => {
    try {
      setLoading(true)
      
      const response = await api.getClientAnalytics()

      if (response.success && response.data) {
        // Vérifier que les données sont dans le bon format
        const safeClientData = {
          ...response.data,
          segmentation: Array.isArray(response.data.segmentation) ? response.data.segmentation : [],
          geographicDistribution: Array.isArray(response.data.geographicDistribution) ? response.data.geographicDistribution : [],
          mostActiveClients: Array.isArray(response.data.mostActiveClients) ? response.data.mostActiveClients : []
        }
        setClientData(safeClientData)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des analytics clients')
      }
    } catch (err) {
      console.error('Erreur client analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
      // Initialiser avec des données vides en cas d'erreur
      setClientData(null)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const getSegmentIcon = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return <Crown className="h-5 w-5 text-yellow-600" />
      case 'Premium':
        return <Star className="h-5 w-5 text-purple-600" />
      case 'Standard':
        return <Users className="h-5 w-5 text-blue-600" />
      default:
        return <TrendingUp className="h-5 w-5 text-green-600" />
    }
  }

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'VIP':
        return '#F59E0B'
      case 'Premium':
        return '#8B5CF6'
      case 'Standard':
        return '#3B82F6'
      default:
        return '#10B981'
    }
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

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

  if (error || !clientData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erreur: {error}</p>
        <button
          onClick={loadClientAnalytics}
          className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Analytics Clients</h2>
        <button
          onClick={loadClientAnalytics}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Actualiser
        </button>
      </div>

      {/* Métriques de segmentation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {safeMap(ensureArray(clientData.segmentation), (segment: any) => (
          <div key={segment.segment} className="bg-white rounded-lg shadow p-4 border-l-4" 
               style={{ borderLeftColor: getSegmentColor(segment.segment) }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{segment.segment}</p>
                <p className="text-xl font-bold">{segment.clientCount} clients</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(segment.avgRevenue)} / client
                </p>
              </div>
              {getSegmentIcon(segment.segment)}
            </div>
          </div>
        ))}
      </div>

      {/* Segmentation par valeur */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Segmentation par Valeur Client
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={clientData.segmentation || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ segment, percent }) =>
                  `${segment} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="segmentRevenue"
              >
                {safeMap(ensureArray(clientData.segmentation), (entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={getSegmentColor(entry.segment)} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Détails par segment</h4>
            {safeMap(ensureArray(clientData.segmentation), (segment: any) => (
              <div key={segment.segment} className="flex items-center justify-between py-2">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: getSegmentColor(segment.segment) }}
                  ></div>
                  <span className="text-sm font-medium">{segment.segment}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">{formatCurrency(segment.segmentRevenue)}</div>
                  <div className="text-xs text-gray-500">
                    {segment.clientCount} clients • {formatCurrency(segment.avgRevenue)} moy.
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Répartition géographique */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Répartition Géographique (Top 10 Villes)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={(clientData.geographicDistribution || []).slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis yAxisId="left" orientation="left" tickFormatter={formatCurrency} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'totalRevenue') return [formatCurrency(value), 'CA']
                if (name === 'clientCount') return [value, 'Clients']
                return [value, name]
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="totalRevenue" fill="#3B82F6" name="CA" />
            <Bar yAxisId="right" dataKey="clientCount" fill="#10B981" name="Nb Clients" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Clients les plus actifs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Top 10 Clients les Plus Actifs
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ville
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Factures
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CA Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dernière Facture
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {safeMap(ensureArray(clientData.mostActiveClients), (client: any) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {client.type === 'COMPANY' ? (
                        <Building className="h-5 w-5 text-gray-400 mr-2" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                      )}
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.type === 'COMPANY' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {client.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                      {client.city || 'Non renseigné'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {client.invoiceCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(client.totalRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(client.lastInvoiceDate)}
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
