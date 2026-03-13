'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportMessage } from '@/components/ui/import-export-buttons'
import { ArrowLeft, Download, Users, Building2, MapPin, TrendingUp } from 'lucide-react'
import { api, ClientAnalytics } from '@/lib/api'
import { normalizeCurrencyCode } from '@/lib/currency'
import { ExportService } from '@/lib/export'
import Link from 'next/link'

export function ClientsReportPage() {
  const [clientData, setClientData] = useState<ClientAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const formatCurrency = (amount: number, currency = 'DZD') => new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: normalizeCurrencyCode(currency),
    currencyDisplay: 'code',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0)

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

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      await ExportService.downloadClientsPDF()
      setExportMessage({ type: 'success', message: 'Rapport clients exporté en PDF avec succès' })
    } catch (err) {
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export PDF: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      await ExportService.downloadClientsExcel()
      setExportMessage({ type: 'success', message: 'Rapport clients exporté en Excel avec succès' })
    } catch (err) {
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export Excel: ${err instanceof Error ? err.message : 'Erreur inconnue'}`,
      })
    } finally {
      setExporting(false)
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
      <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={exporting}>
        <Download className="h-4 w-4 mr-2" />
        {exporting ? 'Export...' : 'Export PDF'}
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
        <Download className="h-4 w-4 mr-2" />
        {exporting ? 'Export...' : 'Export Excel'}
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
        {exportMessage && <ImportExportMessage type={exportMessage.type} message={exportMessage.message} />}

        {/* KPI principaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total clients</p>
                  <p className="text-2xl font-bold text-card-foreground">{totalClients}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">CA total clients</p>
                  <p className="text-2xl font-bold text-card-foreground">{formatCurrency(totalRevenue)}</p>
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
                  <p className="text-sm font-medium text-muted-foreground">CA moyen par client</p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {formatCurrency(totalClients > 0 ? totalRevenue / totalClients : 0)}
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
                    <div key={index} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-card-foreground">{segment.segment}</h4>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">{segment.clientCount} clients</div>
                          <div className="text-sm font-medium text-primary">{percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre de clients</p>
                          <p className="text-xl font-bold text-card-foreground">{segment.clientCount}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CA du segment</p>
                          <p className="text-xl font-bold text-card-foreground">{formatCurrency(segment.segmentRevenue)}</p>
                          <p className="text-xs text-muted-foreground">{revenuePercentage.toFixed(1)}% du CA total</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">CA moyen par client</p>
                          <p className="text-xl font-bold text-card-foreground">{formatCurrency(segment.avgRevenue)}</p>
                        </div>
                      </div>
                      
                      {/* Barre de progression */}
                      <div className="mt-3">
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${Math.max(percentage, 2)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune donnée de segmentation disponible</p>
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
                  <div key={index} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <h4 className="text-sm font-medium text-card-foreground">{location.city}</h4>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">Clients:</span>
                        <span className="text-xs font-medium">{location.clientCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">CA:</span>
                        <span className="text-xs font-medium">{formatCurrency(location.totalRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">CA moyen:</span>
                        <span className="text-xs font-medium">
                          {formatCurrency(location.clientCount > 0 ? location.totalRevenue / location.clientCount : 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucune donnée géographique disponible</p>
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
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ville
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Nb factures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        CA total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Dernière facture
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {(clientData.mostActiveClients || []).map((client: any, index: number) => (
                      <tr key={index} className="hover:bg-secondary">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                              <span className="text-primary-foreground text-xs font-medium">
                                {client.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-card-foreground">{client.name}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground">
                          {client.city || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                          {client.invoiceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-card-foreground">
                          {formatCurrency(client.totalRevenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(client.lastInvoiceDate).toLocaleDateString('fr-FR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucun client actif trouvé</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
