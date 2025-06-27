'use client'

import { useEffect, useState } from 'react'
import { MainLayout } from '@/components/layout/main-layout'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { SalesChart } from '@/components/dashboard/sales-chart'
import { UnifiedStockAlerts } from '@/components/dashboard/unified-stock-alerts'
import { api } from '@/lib/api'

// Définition locale pour éviter les erreurs d'importation
interface DashboardStats {
  totalClients: number;
  totalProducts: number;
  totalRevenue: number;
  totalOrders: number;
  revenueChange: number;
  clientsChange: number;
  ordersChange: number;
  productsChange: number;
  clients: {
    total: number;
    growth: number;
  };
  products: {
    total: number;
    lowStock: number;
    outOfStock: number;
  };
  sales: {
    month: number;
    growth: number;
  };
  orders: {
    pending: number;
    processing: number;
    completed: number;
  };
}
import { useAuth } from '@/stores/auth'

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, isHydrated } = useAuth()

  useEffect(() => {
    // Attendre que l'authentification soit hydratée et que l'utilisateur soit connecté
    if (isHydrated && isAuthenticated) {
      console.log('🔍 Dashboard: Authentification confirmée, chargement des données...')
      loadDashboardData()

      // Actualiser les données toutes les 30 secondes
      const interval = setInterval(loadDashboardData, 30000)

      return () => clearInterval(interval)
    } else if (isHydrated && !isAuthenticated) {
      console.log('⚠️ Dashboard: Utilisateur non authentifié')
      setLoading(false)
    }
  }, [isHydrated, isAuthenticated])

  const loadDashboardData = async () => {
    try {
      console.log('🔍 Dashboard: Début du chargement des données...')
      const response = await api.getDashboardStats()

      if (response.success && response.data) {
        console.log('✅ Dashboard: Données chargées avec succès')
        setStats(response.data)
        setError(null)
      } else {
        throw new Error('Format de données invalide')
      }
    } catch (err) {
      console.error('❌ Dashboard: Erreur lors du chargement:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MainLayout title="Dashboard" subtitle="Vue d'ensemble de votre activité commerciale">
      <div className="space-y-6">
        {/* Message d'erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Erreur de chargement
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={loadDashboardData}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cartes de statistiques */}
        <StatsCards stats={stats} loading={loading} />

        {/* Section principale */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique des ventes */}
          <div className="lg:col-span-2">
            <SalesChart />
          </div>

          {/* Activité récente */}
          <div>
            <RecentActivity />
          </div>
        </div>

        {/* Section des alertes de stock */}
        <div className="mt-6">
          <UnifiedStockAlerts />
        </div>
      </div>
    </MainLayout>
  )
}

export { DashboardPage as Dashboard }
