'use client'

import { useCallback, useEffect, useState } from 'react'
import { BarChart3, Package2 } from 'lucide-react'
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

  const loadChartData = useCallback(async () => {
    try {
      const response = await api.getDashboardCharts()

      if (response.success && response.data) {
        setChartData(response.data)
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
  }, [])

  useEffect(() => {
    void loadChartData()
  }, [loadChartData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' DA'
  }

  // Programmation défensive : s'assurer que les données sont des tableaux
  const safeSalesTrend = Array.isArray(chartData?.salesTrend) ? chartData.salesTrend : []
  const safeTopProducts = Array.isArray(chartData?.topProducts) ? chartData.topProducts : []
  const safeClientDistribution = Array.isArray(chartData?.clientDistribution) ? chartData.clientDistribution : []
  const visibleSalesTrend = selectedPeriod === '7d'
    ? safeSalesTrend.slice(-1)
    : selectedPeriod === '30d'
      ? safeSalesTrend.slice(-2)
      : safeSalesTrend

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
                  {visibleSalesTrend.map((item, index) => (
                    <div key={`${item.month}-${index}`} className="text-center">
                      <div className="text-xs text-muted-foreground mb-1">{item.month}</div>
                      <div
                        className="bg-primary rounded-t"
                        style={{
                          height: `${Math.max(20, (item.sales / Math.max(...visibleSalesTrend.map(s => s.sales), 1)) * 80)}px`
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
                  {safeTopProducts.slice(0, 5).map((product, index) => (
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

            {safeClientDistribution.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-card-foreground mb-3">Répartition des clients</h4>
                <div className="space-y-2">
                  {safeClientDistribution.map((item) => (
                    <div key={item.type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-card-foreground">{item.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-card-foreground">{item.count}</div>
                        <div className="text-xs text-muted-foreground">{item.percentage.toFixed(1)}%</div>
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

