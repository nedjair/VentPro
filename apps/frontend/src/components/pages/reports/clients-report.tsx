'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, Users, Building2, MapPin, TrendingUp } from 'lucide-react'
import { api, ClientAnalytics } from '@/lib/api'
import Link from 'next/link'

export function ClientsReportPage() {
  const [clientData, setClientData] = useState<ClientAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadClientData()
  }, [])

  const loadClientData = async () => {
    try {
      setLoading(true)
      const response = await api.getClientAnalytics()
      
      if (response.success && response.data) {
        setClientData(response.data)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des données')
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données clients:', err)
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
      <MainLayout title="Rapport des Clients">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Rapport des Clients">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={loadClientData} variant="outline">
              Réessayer
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalClients = (clientData?.segmentation || []).reduce((sum: number, segment: any) => sum + segment.clientCount, 0)
  const totalRevenue = (clientData?.segmentation || []).reduce((sum: number, segment: any) => sum + segment.segmentRevenue, 0)

  return (
    <MainLayout 
      title="Rapport des Clients" 
      subtitle="Analyse de la base clients et segmentation"
      actions={actions}
    >
      <div className="space-y-6">
        {/* KPI principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total clients</p>
                  <p className="text-2xl font-bold text-gray-900">{totalClients}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA total clients</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRevenue.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">CA moyen par client</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalClients > 0 ? (totalRevenue / totalClients).toFixed(2) : '0.00'} €
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Segmentation clients */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Segmentation de la clientèle</h3>
          </div>
          <div className="card-content">
            {clientData?.segmentation && clientData.segmentation.length > 0 ? (
              <div className="space-y-4">
                {(clientData.segmentation || []).map((segment: any, index: number) => {
                  const percentage = totalClients > 0 ? (segment.clientCount / totalClients) * 100 : 0
                  const revenuePercentage = totalRevenue > 0 ? (segment.segmentRevenue / totalRevenue) * 100 : 0
                  
                  return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">{segment.segment}</h4>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">{segment.clientCount} clients</div>
                          <div className="text-sm font-medium text-blue-600">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Nombre de clients</p>
                          <p className="text-xl font-bold text-gray-900">{segment.clientCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">CA du segment</p>
                          <p className="text-xl font-bold text-gray-900">{segment.segmentRevenue.toFixed(2)} €</p>
                          <p className="text-xs text-gray-500">{revenuePercentage.toFixed(1)}% du CA total</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">CA moyen par client</p>
                          <p className="text-xl font-bold text-gray-900">{segment.avgRevenue.toFixed(2)} €</p>
                        </div>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée de segmentation disponible</p>
            )}
          </div>
        </div>

        {/* Répartition géographique */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Répartition géographique</h3>
          </div>
          <div className="card-content">
            {clientData?.geographicDistribution && clientData.geographicDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(clientData.geographicDistribution || []).map((location: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <h4 className="text-sm font-medium text-gray-900">{location.city}</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">Clients:</span>
                        <span className="text-xs font-medium">{location.clientCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">CA:</span>
                        <span className="text-xs font-medium">{location.totalRevenue.toFixed(2)} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-gray-600">CA moyen:</span>
                        <span className="text-xs font-medium">
                          {location.clientCount > 0 ? (location.totalRevenue / location.clientCount).toFixed(2) : '0.00'} €
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée géographique disponible</p>
            )}
          </div>
        </div>

        {/* Clients les plus actifs */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Clients les plus actifs</h3>
          </div>
          <div className="card-content">
            {clientData?.mostActiveClients && clientData.mostActiveClients.length > 0 ? (
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
                        Nb factures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        CA total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dernière facture
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(clientData.mostActiveClients || []).map((client: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {client.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{client.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            client.type === 'COMPANY' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {client.type === 'COMPANY' ? 'Entreprise' : 'Particulier'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.invoiceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {client.totalRevenue.toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(client.lastInvoiceDate).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucun client actif trouvé</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
