'use client'

import { useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { KPIMetricsComponent } from '@/components/dashboard/kpi-metrics'
import { AnalyticsCharts } from '@/components/dashboard/analytics-charts'
import { ProductAnalyticsComponent } from '@/components/dashboard/product-analytics'
import { ClientAnalyticsComponent } from '@/components/dashboard/client-analytics'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Package,
  Calendar,
  Download,
  RefreshCw
} from 'lucide-react'

type AnalyticsTab = 'overview' | 'sales' | 'products' | 'clients'

export function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overview')
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simuler un délai de rafraîchissement
    await new Promise(resolve => setTimeout(resolve, 1000))
    setRefreshing(false)
    // Ici, on pourrait déclencher un refresh des composants
    window.location.reload()
  }

  const tabs = [
    {
      id: 'overview' as AnalyticsTab,
      name: 'Vue d\'ensemble',
      icon: BarChart3,
      description: 'KPI et métriques principales'
    },
    {
      id: 'sales' as AnalyticsTab,
      name: 'Ventes',
      icon: TrendingUp,
      description: 'Analyses des ventes et évolutions'
    },
    {
      id: 'products' as AnalyticsTab,
      name: 'Produits',
      icon: Package,
      description: 'Performance des produits'
    },
    {
      id: 'clients' as AnalyticsTab,
      name: 'Clients',
      icon: Users,
      description: 'Segmentation et analyse clients'
    }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-8">
            <KPIMetricsComponent />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <AnalyticsCharts period="6m" />
            </div>
          </div>
        )
      case 'sales':
        return <AnalyticsCharts />
      case 'products':
        return <ProductAnalyticsComponent />
      case 'clients':
        return <ClientAnalyticsComponent />
      default:
        return <div>Contenu non trouvé</div>
    }
  }

  return (
    <MainLayout 
      title="Analytics & Reporting" 
      subtitle="Tableaux de bord et analyses avancées de votre activité"
    >
      <div className="space-y-6">
        {/* En-tête avec actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
              </span>
            </div>
          </div>
          
          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </button>
            
            <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon
                    className={`mr-2 h-5 w-5 ${
                      activeTab === tab.id
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">
                      {tab.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Contenu de l'onglet actif */}
        <div className="min-h-screen">
          {renderTabContent()}
        </div>

        {/* Informations supplémentaires */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Analytics Phase 5 - Fonctionnalités Avancées
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>KPI temps réel avec actualisation automatique</li>
                  <li>Analyses de ventes avec comparaisons temporelles</li>
                  <li>Segmentation clients automatique par valeur</li>
                  <li>Performance produits par catégorie</li>
                  <li>Graphiques interactifs et exportables</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
