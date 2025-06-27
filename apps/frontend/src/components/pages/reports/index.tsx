'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportMessage } from '@/components/ui/import-export-buttons'
import { KPIMetricsComponent } from '@/components/dashboard/kpi-metrics'
import { BarChart3, Users, Package, TrendingUp, Download, FileText, Calendar } from 'lucide-react'
import { api, KPIMetrics, SalesAnalytics } from '@/lib/api'
import { ExportService } from '@/lib/export'
import Link from 'next/link'

export function ReportsPage() {
  const [kpiData, setKpiData] = useState<KPIMetrics | null>(null)
  const [salesData, setSalesData] = useState<SalesAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      console.log('🔍 Chargement des données analytics...')

      const [kpiResponse, salesResponse] = await Promise.all([
        api.getKPIMetrics(),
        api.getSalesAnalytics({ period: '3m' })
      ])

      console.log('📊 Réponse KPI:', kpiResponse)
      console.log('💰 Réponse Sales:', salesResponse)

      if (kpiResponse.success && kpiResponse.data) {
        console.log('✅ KPI chargés:', kpiResponse.data)
        setKpiData(kpiResponse.data)
      }

      if (salesResponse.success && salesResponse.data) {
        console.log('✅ Sales chargés:', salesResponse.data)
        setSalesData(salesResponse.data)
      }

      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const reportCategories = [
    {
      title: 'Rapports de Ventes',
      description: 'Analyse des ventes par période avec graphiques et tendances',
      icon: TrendingUp,
      href: '/reports/sales',
      color: 'bg-blue-500',
      stats: [
        { label: 'CA du mois', value: kpiData ? formatCurrency(kpiData.revenue.current) : 'Chargement...' },
        { label: 'Évolution', value: '+12.5%' },
      ]
    },
    {
      title: 'Rapports Clients',
      description: 'Top clients, segmentation et analyse comportementale',
      icon: Users,
      href: '/reports/clients',
      color: 'bg-green-500',
      stats: [
        { label: 'Clients actifs', value: salesData ? salesData.topClients?.length.toString() || '0' : 'Chargement...' },
        { label: 'Nouveaux', value: '+8' },
      ]
    },
    {
      title: 'Rapports Produits',
      description: 'Best-sellers, analyse des stocks et marges',
      icon: Package,
      href: '/reports/products',
      color: 'bg-purple-500',
      stats: [
        { label: 'Produits vendus', value: '1 234' },
        { label: 'Stock faible', value: '12' },
      ]
    },
  ]

  const handleExportMensuel = async () => {
    setExporting(true)
    try {
      await ExportService.downloadSalesReportExcel('1m')
      setExportMessage({
        type: 'success',
        message: 'Rapport mensuel exporté avec succès'
      })
    } catch (error) {
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export mensuel: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      })
    } finally {
      setExporting(false)
    }
  }

  const handleNewReport = () => {
    console.log('Nouveau rapport...')
    setExportMessage({
      type: 'info',
      message: 'Fonctionnalité de création de rapport personnalisé en cours de développement'
    })
  }

  const quickActions = [
    {
      title: 'Export mensuel',
      description: 'Télécharger le rapport mensuel complet',
      icon: Download,
      action: handleExportMensuel,
      variant: 'outline' as const,
    },
    {
      title: 'Rapport personnalisé',
      description: 'Créer un rapport avec vos critères',
      icon: FileText,
      action: handleNewReport,
      variant: 'outline' as const,
    },
    {
      title: 'Planifier un rapport',
      description: 'Programmer l\'envoi automatique',
      icon: Calendar,
      action: () => setExportMessage({
        type: 'info',
        message: 'Fonctionnalité de planification de rapports en cours de développement'
      }),
      variant: 'outline' as const,
    },
  ]

  const handleExportGlobal = async () => {
    setExporting(true)
    try {
      console.log('📊 Export global des rapports...')
      // Export des données principales en Excel
      await Promise.all([
        ExportService.downloadClientsExcel(),
        ExportService.downloadProductsExcel(),
        ExportService.downloadOrdersExcel(),
        ExportService.downloadInvoicesExcel()
      ])

      setExportMessage({
        type: 'success',
        message: 'Export global terminé avec succès. Tous les fichiers ont été téléchargés.'
      })
    } catch (error) {
      console.error('❌ Erreur export global:', error)
      setExportMessage({
        type: 'error',
        message: `Erreur lors de l'export global: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      })
    } finally {
      setExporting(false)
    }
  }

  const actions = (
    <div className="flex space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportGlobal}
        disabled={exporting}
      >
        {exporting ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exporting ? 'Export...' : 'Export global'}
      </Button>
      <Button size="sm" onClick={handleNewReport}>
        <FileText className="h-4 w-4 mr-2" />
        Nouveau rapport
      </Button>
    </div>
  )

  return (
    <MainLayout 
      title="Rapports & Analytics" 
      subtitle="Analyses détaillées et rapports de performance"
      actions={actions}
    >
      <div className="space-y-8">
        {/* Message d'export */}
        {exportMessage && (
          <ImportExportMessage
            type={exportMessage.type}
            message={exportMessage.message}
            onClose={() => setExportMessage(null)}
          />
        )}

        {/* Erreur de chargement */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Erreur lors du chargement des données: {error}</p>
            <button
              onClick={loadAnalyticsData}
              className="mt-2 bg-red-100 px-3 py-1 rounded text-sm text-red-800 hover:bg-red-200"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* KPI Metrics en temps réel */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Indicateurs Clés de Performance</h2>
          <KPIMetricsComponent refreshInterval={60000} />
        </div>

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Rapports générés</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? 'Chargement...' : '24'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Croissance CA</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? 'Chargement...' : '+12.5%'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-content">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Clients analysés</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? 'Chargement...' : (salesData?.topClients?.length || '156')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Catégories de rapports */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Catégories de rapports</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {reportCategories.map((category) => {
              const Icon = category.icon
              return (
                <div key={category.title} className="card hover:shadow-lg transition-shadow">
                  <div className="card-content">
                    <div className="flex items-start justify-between">
                      <div className={`p-3 rounded-lg ${category.color}`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Link href={category.href}>
                        <Button size="sm">
                          Voir les rapports
                        </Button>
                      </Link>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {category.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {category.stats.map((stat, index) => (
                          <div key={index}>
                            <p className="text-xs text-gray-500">{stat.label}</p>
                            <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions rapides */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div key={action.title} className="card hover:shadow-md transition-shadow">
                  <div className="card-content">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <h3 className="ml-3 text-lg font-medium text-gray-900">
                        {action.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      {action.description}
                    </p>
                    
                    <Button 
                      variant={action.variant} 
                      size="sm" 
                      className="w-full"
                      onClick={action.action}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {action.title}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Rapports récents */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">Rapports récents</h2>
          <div className="card">
            <div className="card-content">
              <div className="space-y-4">
                {[
                  {
                    name: 'Rapport mensuel - Novembre 2024',
                    type: 'Ventes',
                    date: '01/12/2024',
                    size: '2.4 MB',
                    status: 'Généré',
                  },
                  {
                    name: 'Analyse clients Q4 2024',
                    type: 'Clients',
                    date: '28/11/2024',
                    size: '1.8 MB',
                    status: 'Généré',
                  },
                  {
                    name: 'Performance produits - Novembre',
                    type: 'Produits',
                    date: '25/11/2024',
                    size: '3.1 MB',
                    status: 'Généré',
                  },
                ].map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                        <p className="text-xs text-gray-500">
                          {report.type} • {report.date} • {report.size}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {report.status}
                      </span>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Lien vers tous les rapports */}
              <div className="mt-6 text-center">
                <Button variant="outline">
                  Voir tous les rapports
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
