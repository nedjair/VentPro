'use client'

import { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportMessage } from '@/components/ui/import-export-buttons'
import { ArrowLeft, Download, Calendar, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react'
import { api, SalesAnalytics } from '@/lib/api'
import { ExportService } from '@/lib/export'
import Link from 'next/link'

export function SalesReportPage() {
  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('12m')
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadSalesData()
  }, [period])

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const response = await api.getSalesAnalytics({ period })
      
      if (response.success && response.data) {
        setSalesData(response.data)
        setError(null)
      } else {
        throw new Error('Erreur lors du chargement des données')
      }
    } catch (err) {
      console.error('Erreur lors du chargement des données de vente:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      console.log('📄 Export PDF du rapport des ventes...')
      await ExportService.downloadSalesReportPDF(period)
      setExportMessage({
        type: 'success',
        message: 'Rapport des ventes exporté en PDF avec succès'
      })
    } catch (error) {
      console.error('❌ Erreur export PDF:', error)
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export PDF: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      })
    } finally {
      setExporting(false)
    }
  }

  const handleExportExcel = async () => {
    setExporting(true)
    try {
      console.log('📊 Export Excel du rapport des ventes...')
      await ExportService.downloadSalesReportExcel(period)
      setExportMessage({
        type: 'success',
        message: 'Rapport des ventes exporté en Excel avec succès'
      })
    } catch (error) {
      console.error('❌ Erreur export Excel:', error)
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export Excel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportPDF}
        disabled={exporting}
      >
        {exporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exporting ? 'Export...' : 'Export PDF'}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportExcel}
        disabled={exporting}
      >
        {exporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exporting ? 'Export...' : 'Export Excel'}
      </Button>
    </div>
  )

  if (loading) {
    return (
      <MainLayout title="Rapport des Ventes">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Chargement...</span>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout title="Rapport des Ventes">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">
              Erreur de chargement
            </h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={loadSalesData} variant="outline">
              Réessayer
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  const totalRevenue = (salesData?.monthlyRevenue || []).reduce((sum: number, month: any) => sum + month.revenue, 0)
  const totalInvoices = (salesData?.monthlyRevenue || []).reduce((sum: number, month: any) => sum + month.invoiceCount, 0)
  const avgInvoice = totalInvoices > 0 ? totalRevenue / totalInvoices : 0

  return (
    <MainLayout 
      title="Rapport des Ventes" 
      subtitle={`Analyse des ventes sur ${period === '12m' ? '12 mois' : period === '6m' ? '6 mois' : '3 mois'}`}
      actions={actions}
    >
      <div className="space-y-6">
        {/* Message d'export */}
        {exportMessage && (
          <ImportExportMessage
            type={exportMessage.type}
            message={exportMessage.message}
            onClose={() => setExportMessage(null)}
          />
        )}

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Chiffre d'affaires total</p>
                  <p className="text-2xl font-bold text-gray-900">{Number(totalRevenue).toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Nombre de factures</p>
                  <p className="text-2xl font-bold text-gray-900">{totalInvoices}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Panier moyen</p>
                  <p className="text-2xl font-bold text-gray-900">{Number(avgInvoice).toFixed(2)} €</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Évolution mensuelle */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Évolution mensuelle du chiffre d'affaires</h3>
          </div>
          <div className="card-content">
            {salesData?.monthlyRevenue && salesData.monthlyRevenue.length > 0 ? (
              <div className="space-y-4">
                {/* Graphique simple en barres */}
                <div className="grid grid-cols-1 gap-4">
                  {(salesData.monthlyRevenue || []).map((month: any, index: number) => {
                    const maxRevenue = Math.max(...(salesData.monthlyRevenue || []).map((m: any) => m.revenue))
                    const barWidth = maxRevenue > 0 ? (month.revenue / maxRevenue) * 100 : 0
                    
                    return (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-20 text-sm font-medium text-gray-700">
                          {month.month}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                          <div 
                            className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(barWidth, 5)}%` }}
                          >
                            <span className="text-xs text-white font-medium">
                              {Number(month.revenue).toFixed(0)} €
                            </span>
                          </div>
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right">
                          {month.invoiceCount} fact.
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée disponible pour cette période</p>
            )}
          </div>
        </div>

        {/* Top clients */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Top clients par chiffre d'affaires</h3>
          </div>
          <div className="card-content">
            {salesData?.topClients && salesData.topClients.length > 0 ? (
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
                        CA total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nb factures
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Panier moyen
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(salesData.topClients || []).map((client: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {Number(client.totalRevenue).toFixed(2)} €
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {client.invoiceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Number(client.avgInvoice).toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucun client trouvé pour cette période</p>
            )}
          </div>
        </div>

        {/* Répartition par type de client */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium">Répartition par type de client</h3>
          </div>
          <div className="card-content">
            {salesData?.clientTypeDistribution && salesData.clientTypeDistribution.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(salesData.clientTypeDistribution || []).map((type: any, index: number) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">
                        {type.type === 'COMPANY' ? 'Entreprises' : 'Particuliers'}
                      </h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        type.type === 'COMPANY' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {type.invoiceCount} factures
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {Number(type.revenue).toFixed(2)} €
                    </div>
                    <div className="text-sm text-gray-600">
                      {((Number(type.revenue) / Number(totalRevenue)) * 100).toFixed(1)}% du CA total
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">Aucune donnée de répartition disponible</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
