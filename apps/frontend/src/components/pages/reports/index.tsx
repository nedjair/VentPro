'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { Button } from '@/components/ui/button'
import { ImportExportMessage } from '@/components/ui/import-export-buttons'
import { KPIMetricsComponent } from '@/components/dashboard/kpi-metrics'
import { BarChart3, Users, Package, TrendingUp, Download, FileText, Calendar } from 'lucide-react'
import { api, KPIMetrics } from '@/lib/api'
import { normalizeCurrencyCode } from '@/lib/currency'
import { ExportService } from '@/lib/export'
import Link from 'next/link'

export function ReportsPage() {
  const [kpiData, setKpiData] = useState<KPIMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null)

  const recentReports = [
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
  ]

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)

      const kpiResponse = await api.getKPIMetrics()

      if (kpiResponse.success && kpiResponse.data) {
        setKpiData(kpiResponse.data)
      }

      setError(null)
    } catch (err) {
      console.error('❌ Erreur lors du chargement des analytics:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency = 'DZD') => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: normalizeCurrencyCode(currency),
      currencyDisplay: 'code',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatGap = (value: number | null) => {
    if (value === null) {
      return 'Objectif non défini'
    }

    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const reportCategories = [
    {
      title: 'Rapports de Ventes',
      description: 'Analyse des ventes par période avec graphiques et tendances',
      icon: TrendingUp,
      href: '/reports/sales',
      color: 'bg-primary',
      stats: [
        { label: 'CA du mois', value: kpiData ? formatCurrency(kpiData.revenue.current, kpiData.revenue.currency) : 'Chargement...' },
        { label: 'Écart objectif', value: kpiData ? formatGap(kpiData.revenue.growth) : 'Chargement...' },
      ]
    },
    {
      title: 'Rapports Clients',
      description: 'Top clients, segmentation et analyse comportementale',
      icon: Users,
      href: '/reports/clients',
      color: 'bg-green-500',
      stats: [
        { label: 'Clients suivis', value: kpiData ? kpiData.clients.current.toString() : 'Chargement...' },
        { label: 'Nouveaux ce mois', value: kpiData ? kpiData.clients.newThisMonth.toString() : 'Chargement...' },
      ]
    },
    {
      title: 'Rapports Produits',
      description: 'Best-sellers, analyse des stocks et marges',
      icon: Package,
      href: '/reports/products',
      color: 'bg-purple-500',
      stats: [
        { label: 'Unités vendues', value: kpiData ? kpiData.products.soldThisMonth.toString() : 'Chargement...' },
        { label: 'Stock faible', value: kpiData ? kpiData.products.lowStock.toString() : 'Chargement...' },
      ]
    },
  ]

  const summaryCards = [
    {
      title: 'Factures payées',
      value: kpiData ? kpiData.invoices.paid.toString() : 'Chargement...',
      icon: FileText,
      iconClassName: 'text-primary',
      wrapperClassName: 'bg-primary/10',
    },
    {
      title: 'Écart objectif CA',
      value: kpiData ? formatGap(kpiData.revenue.growth) : 'Chargement...',
      icon: TrendingUp,
      iconClassName: 'text-green-600',
      wrapperClassName: 'bg-green-100',
      valueClassName: 'text-primary',
    },
    {
      title: 'Clients suivis',
      value: kpiData ? kpiData.clients.current.toString() : 'Chargement...',
      icon: Users,
      iconClassName: 'text-purple-600',
      wrapperClassName: 'bg-purple-100',
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

  const scrollToReportCategories = () => {
    document.getElementById('report-categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleNewReport = () => {
    scrollToReportCategories()
    setExportMessage({
      type: 'info',
      message: 'Sélectionnez une catégorie de rapport pour lancer un export adapté à votre besoin.'
    })
  }

  const handleRecentReportDownload = async (reportType: string) => {
    setExporting(true)
    try {
      if (reportType === 'Ventes') {
        await ExportService.downloadSalesReportPDF('1m')
      } else if (reportType === 'Clients') {
        await ExportService.downloadClientsPDF()
      } else {
        await ExportService.downloadProductsPDF()
      }

      setExportMessage({
        type: 'success',
        message: `Téléchargement du rapport ${reportType.toLowerCase()} lancé avec succès`,
      })
    } catch (error) {
      setExportMessage({
        type: 'error',
        message: `Erreur lors du téléchargement du rapport: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      })
    } finally {
      setExporting(false)
    }
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
        <div className="bg-card rounded-lg shadow border border-border p-6">
          <h2 className="text-xl font-bold text-card-foreground mb-6">Indicateurs Clés de Performance</h2>
          <KPIMetricsComponent refreshInterval={60000} />
        </div>

        {/* Vue d'ensemble */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summaryCards.map((card) => {
            const Icon = card.icon

            return (
              <div key={card.title} className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${card.wrapperClassName}`}>
                      <Icon className={`h-6 w-6 ${card.iconClassName}`} />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                      <p className={`text-2xl font-bold ${card.valueClassName || 'text-card-foreground'}`}>
                        {loading ? 'Chargement...' : card.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Catégories de rapports */}
        <div id="report-categories">
          <h2 className="text-xl font-bold text-card-foreground mb-6">Catégories de rapports</h2>
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
                      <h3 className="text-lg font-semibold text-card-foreground mb-2">
                        {category.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {category.description}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {category.stats.map((stat, index) => (
                          <div key={index}>
                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                            <p className="text-sm font-semibold text-card-foreground">{stat.value}</p>
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
          <h2 className="text-xl font-bold text-card-foreground mb-6">Actions rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <div key={action.title} className="card hover:shadow-md transition-shadow">
                  <div className="card-content">
                    <div className="flex items-center mb-4">
                      <div className="p-2 bg-secondary rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <h3 className="ml-3 text-lg font-medium text-card-foreground">
                        {action.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-4">
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
          <h2 className="text-xl font-bold text-card-foreground mb-6">Rapports récents</h2>
          <div className="card">
            <div className="card-content">
              <div className="space-y-4">
                {recentReports.map((report, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-card-foreground">{report.name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {report.type} • {report.date} • {report.size}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {report.status}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handleRecentReportDownload(report.type)} disabled={exporting}>
                        <Download className="h-4 w-4 mr-1" />
                        Télécharger
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Lien vers tous les rapports */}
              <div className="mt-6 text-center">
                <Button variant="outline" onClick={scrollToReportCategories}>
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
