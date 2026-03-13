'use client'

import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '@/lib/api'

interface ChartData {
  salesTrend: Array<{
    month: string
    sales: number
    orders: number
  }>
  topProducts: Array<{
    id: string
    name: string
    sales: number
    revenue: number
  }>
  clientDistribution: Array<{
    type: string
    count: number
    percentage: number
  }>
}

export function SalesChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('6m')

  useEffect(() => {
    loadChartData()
  }, [selectedPeriod])

  const loadChartData = async () => {
    try {
      console.log('🔍 Chargement des données de graphique...')
      // Pour l'instant, utilisons l'API dashboard qui contient getChartData
      const response = await api.getDashboardStats()

      if (response.success && response.data) {
        // Créer des données de graphique basées sur les stats du dashboard
        const mockChartData: ChartData = {
          salesTrend: [
            { month: 'Jan', sales: response.data.sales.previousMonth * 0.8, orders: response.data.orders.total * 0.7 },
            { month: 'Fév', sales: response.data.sales.previousMonth * 0.9, orders: response.data.orders.total * 0.8 },
            { month: 'Mar', sales: response.data.sales.previousMonth, orders: response.data.orders.total * 0.9 },
            { month: 'Avr', sales: response.data.sales.previousMonth * 1.1, orders: response.data.orders.total * 0.95 },
            { month: 'Mai', sales: response.data.sales.previousMonth * 1.2, orders: response.data.orders.total },
            { month: 'Juin', sales: response.data.sales.currentMonth, orders: response.data.orders.total * 1.1 },
          ],
          topProducts: [
            { id: '1', name: 'Produit A', sales: 25, revenue: response.data.sales.currentMonth * 0.3 },
            { id: '2', name: 'Produit B', sales: 18, revenue: response.data.sales.currentMonth * 0.25 },
            { id: '3', name: 'Produit C', sales: 15, revenue: response.data.sales.currentMonth * 0.2 },
          ],
          clientDistribution: [
            { type: 'Entreprises', count: response.data.clients.companies, percentage: (response.data.clients.companies / response.data.clients.total) * 100 },
            { type: 'Particuliers', count: response.data.clients.individuals, percentage: (response.data.clients.individuals / response.data.clients.total) * 100 }
          ]
        }
        setChartData(mockChartData)
        setError(null)
      } else {
        throw new Error('Données de graphique non disponibles')
      }
    } catch (err) {
      console.error('❌ Erreur lors du chargement des données de graphique:', err)
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' DA'
  }

  // Programmation défensive : s'assurer que les données sont des tableaux
  const safeSalesTrend = Array.isArray(chartData?.salesTrend) ? chartData.salesTrend : []
  const safeTopProducts = Array.isArray(chartData?.topProducts) ? chartData.topProducts : []

  return (
    <div className="card">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-card-foreground">Évolution des ventes</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedPeriod('7d')}
              className={`px-3 py-1 text-sm rounded-md ${selectedPeriod === '7d' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              7j
            </button>
            <button
              onClick={() => setSelectedPeriod('30d')}
              className={`px-3 py-1 text-sm rounded-md ${selectedPeriod === '30d' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              30j
            </button>
            <button
              onClick={() => setSelectedPeriod('6m')}
              className={`px-3 py-1 text-sm rounded-md ${selectedPeriod === '6m' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary'}`}
            >
              6m
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-64 bg-secondary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-muted-foreground">Chargement des données...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-64 bg-secondary rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-destructive mx-auto mb-2" />
              <p className="text-destructive">Erreur de chargement</p>
              <p className="text-sm text-muted-foreground">{error}</p>
              <button
                onClick={loadChartData}
                className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
              >
                Réessayer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tendance des ventes */}
            {safeSalesTrend.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-card-foreground mb-3">Tendance mensuelle</h4>
                <div className="grid grid-cols-6 gap-2">
                  {safeSalesTrend.map((item, index) => (
                    <div key={item.month} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{item.month}</div>
                      <div
                        className="bg-primary rounded-t"
                        style={{
                          height: `${Math.max(20, (item.sales / Math.max(...safeSalesTrend.map(s => s.sales))) * 80)}px`
                        }}
                      ></div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatCurrency(item.sales)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top produits */}
            {safeTopProducts.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-card-foreground mb-3">Top produits</h4>
                <div className="space-y-2">
                  {safeTopProducts.slice(0, 3).map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-primary' : index === 1 ? 'bg-accent' : 'bg-secondary'}`}></div>
                        <span className="text-sm text-card-foreground">{product.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-card-foreground">{formatCurrency(product.revenue)}</div>
                        <div className="text-xs text-muted-foreground">{product.sales} ventes</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
