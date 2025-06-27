/**
 * Utilitaire pour tester la synchronisation des données de stock
 */

import { api } from '@/lib/api'

export interface SyncTestResult {
  timestamp: Date
  success: boolean
  duration: number
  endpoints: {
    dashboard: { success: boolean; data?: any; error?: string }
    alerts: { success: boolean; data?: any; error?: string }
    products: { success: boolean; data?: any; error?: string }
  }
  metrics: {
    dashboard: StockMetrics
    alerts: StockMetrics
    products: StockMetrics
  }
  inconsistencies: string[]
  score: number // 0-100, 100 = parfaitement synchronisé
}

export interface StockMetrics {
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  overStockProducts: number
  activeAlerts: number
}

export class StockSyncTester {
  private static instance: StockSyncTester
  private testHistory: SyncTestResult[] = []
  private isRunning = false
  private intervalId?: NodeJS.Timeout

  static getInstance(): StockSyncTester {
    if (!StockSyncTester.instance) {
      StockSyncTester.instance = new StockSyncTester()
    }
    return StockSyncTester.instance
  }

  /**
   * Exécuter un test de synchronisation unique
   */
  async runSyncTest(): Promise<SyncTestResult> {
    const startTime = Date.now()
    const timestamp = new Date()

    console.log('🔍 Début du test de synchronisation...')

    const result: SyncTestResult = {
      timestamp,
      success: false,
      duration: 0,
      endpoints: {
        dashboard: { success: false },
        alerts: { success: false },
        products: { success: false }
      },
      metrics: {
        dashboard: this.getEmptyMetrics(),
        alerts: this.getEmptyMetrics(),
        products: this.getEmptyMetrics()
      },
      inconsistencies: [],
      score: 0
    }

    try {
      // Test des 3 endpoints en parallèle
      const [dashboardResult, alertsResult, productsResult] = await Promise.allSettled([
        this.testDashboardEndpoint(),
        this.testAlertsEndpoint(),
        this.testProductsEndpoint()
      ])

      // Traitement des résultats
      result.endpoints.dashboard = dashboardResult.status === 'fulfilled' 
        ? dashboardResult.value 
        : { success: false, error: dashboardResult.reason?.message }

      result.endpoints.alerts = alertsResult.status === 'fulfilled' 
        ? alertsResult.value 
        : { success: false, error: alertsResult.reason?.message }

      result.endpoints.products = productsResult.status === 'fulfilled' 
        ? productsResult.value 
        : { success: false, error: productsResult.reason?.message }

      // Extraction des métriques
      if (result.endpoints.dashboard.success && result.endpoints.dashboard.data) {
        result.metrics.dashboard = this.extractDashboardMetrics(result.endpoints.dashboard.data)
      }

      if (result.endpoints.alerts.success && result.endpoints.alerts.data) {
        result.metrics.alerts = this.extractAlertsMetrics(result.endpoints.alerts.data)
      }

      if (result.endpoints.products.success && result.endpoints.products.data) {
        result.metrics.products = this.extractProductsMetrics(result.endpoints.products.data)
      }

      // Analyse des incohérences
      result.inconsistencies = this.findInconsistencies(result.metrics)

      // Calcul du score de synchronisation
      result.score = this.calculateSyncScore(result)

      result.success = result.endpoints.dashboard.success && 
                      result.endpoints.alerts.success && 
                      result.endpoints.products.success

      result.duration = Date.now() - startTime

      console.log(`✅ Test terminé en ${result.duration}ms - Score: ${result.score}/100`)

      // Ajouter à l'historique
      this.testHistory.unshift(result)
      this.testHistory = this.testHistory.slice(0, 50) // Garder les 50 derniers

      return result

    } catch (error: any) {
      result.duration = Date.now() - startTime
      result.inconsistencies.push(`Erreur générale: ${error.message}`)
      console.error('❌ Erreur lors du test de synchronisation:', error)
      return result
    }
  }

  /**
   * Démarrer les tests automatiques
   */
  startAutoTesting(intervalMs: number = 60000): void {
    if (this.isRunning) {
      console.log('⚠️ Tests automatiques déjà en cours')
      return
    }

    console.log(`🚀 Démarrage des tests automatiques (${intervalMs}ms)`)
    this.isRunning = true

    // Premier test immédiat
    this.runSyncTest()

    // Tests périodiques
    this.intervalId = setInterval(() => {
      this.runSyncTest()
    }, intervalMs)
  }

  /**
   * Arrêter les tests automatiques
   */
  stopAutoTesting(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
    this.isRunning = false
    console.log('🛑 Tests automatiques arrêtés')
  }

  /**
   * Obtenir l'historique des tests
   */
  getTestHistory(): SyncTestResult[] {
    return [...this.testHistory]
  }

  /**
   * Obtenir les statistiques des tests
   */
  getTestStats() {
    if (this.testHistory.length === 0) {
      return null
    }

    const successfulTests = this.testHistory.filter(t => t.success).length
    const averageScore = this.testHistory.reduce((sum, t) => sum + t.score, 0) / this.testHistory.length
    const averageDuration = this.testHistory.reduce((sum, t) => sum + t.duration, 0) / this.testHistory.length
    const totalInconsistencies = this.testHistory.reduce((sum, t) => sum + t.inconsistencies.length, 0)

    return {
      totalTests: this.testHistory.length,
      successfulTests,
      successRate: (successfulTests / this.testHistory.length) * 100,
      averageScore: Math.round(averageScore),
      averageDuration: Math.round(averageDuration),
      totalInconsistencies,
      lastTest: this.testHistory[0]
    }
  }

  private async testDashboardEndpoint() {
    try {
      const response = await api.get('/api/v1/stock/dashboard')
      return { success: response.data.success, data: response.data.data }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message }
    }
  }

  private async testAlertsEndpoint() {
    try {
      const response = await api.get('/api/v1/stock-alerts/alerts?isActive=true&limit=100')
      return { success: response.data.success, data: response.data.data }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message }
    }
  }

  private async testProductsEndpoint() {
    try {
      const response = await api.get('/api/v1/products?limit=100')
      return { success: response.data.success, data: response.data.data }
    } catch (error: any) {
      return { success: false, error: error.response?.data?.message || error.message }
    }
  }

  private extractDashboardMetrics(data: any): StockMetrics {
    return {
      totalProducts: data.overview?.totalProducts || 0,
      lowStockProducts: data.overview?.lowStockProducts || 0,
      outOfStockProducts: data.overview?.outOfStockProducts || 0,
      overStockProducts: data.overview?.overStockProducts || 0,
      activeAlerts: data.activity?.activeAlerts || 0
    }
  }

  private extractAlertsMetrics(data: any[]): StockMetrics {
    const alerts = Array.isArray(data) ? data : []
    return {
      totalProducts: 0,
      lowStockProducts: alerts.filter(a => a.type === 'LOW_STOCK').length,
      outOfStockProducts: alerts.filter(a => a.type === 'OUT_OF_STOCK').length,
      overStockProducts: alerts.filter(a => a.type === 'OVERSTOCK').length,
      activeAlerts: alerts.length
    }
  }

  private extractProductsMetrics(data: any): StockMetrics {
    const products = data.data || data || []
    const lowStock = products.filter((p: any) => 
      p.stockQuantity > 0 && 
      p.stockQuantity <= (p.minStock || 0) && 
      (p.minStock || 0) > 0
    ).length
    const outOfStock = products.filter((p: any) => p.stockQuantity === 0).length
    const overStock = products.filter((p: any) => 
      p.maxStock && p.stockQuantity > p.maxStock
    ).length

    return {
      totalProducts: products.length,
      lowStockProducts: lowStock,
      outOfStockProducts: outOfStock,
      overStockProducts: overStock,
      activeAlerts: lowStock + outOfStock + overStock
    }
  }

  private findInconsistencies(metrics: { dashboard: StockMetrics; alerts: StockMetrics; products: StockMetrics }): string[] {
    const inconsistencies: string[] = []
    const { dashboard, alerts, products } = metrics

    // Comparer dashboard vs alerts
    if (dashboard.lowStockProducts !== alerts.lowStockProducts) {
      inconsistencies.push(`Stock faible: Dashboard(${dashboard.lowStockProducts}) vs Alertes(${alerts.lowStockProducts})`)
    }

    if (dashboard.outOfStockProducts !== alerts.outOfStockProducts) {
      inconsistencies.push(`Rupture: Dashboard(${dashboard.outOfStockProducts}) vs Alertes(${alerts.outOfStockProducts})`)
    }

    // Comparer dashboard vs products
    if (dashboard.lowStockProducts !== products.lowStockProducts) {
      inconsistencies.push(`Stock faible: Dashboard(${dashboard.lowStockProducts}) vs Produits(${products.lowStockProducts})`)
    }

    if (dashboard.outOfStockProducts !== products.outOfStockProducts) {
      inconsistencies.push(`Rupture: Dashboard(${dashboard.outOfStockProducts}) vs Produits(${products.outOfStockProducts})`)
    }

    return inconsistencies
  }

  private calculateSyncScore(result: SyncTestResult): number {
    let score = 0

    // Points pour les endpoints qui fonctionnent (30 points max)
    if (result.endpoints.dashboard.success) score += 10
    if (result.endpoints.alerts.success) score += 10
    if (result.endpoints.products.success) score += 10

    // Points pour la cohérence des données (70 points max)
    if (result.inconsistencies.length === 0) {
      score += 70
    } else {
      // Pénalité progressive pour les incohérences
      const penalty = Math.min(result.inconsistencies.length * 15, 70)
      score += Math.max(0, 70 - penalty)
    }

    return Math.min(100, Math.max(0, score))
  }

  private getEmptyMetrics(): StockMetrics {
    return {
      totalProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      overStockProducts: 0,
      activeAlerts: 0
    }
  }
}

// Instance globale
export const stockSyncTester = StockSyncTester.getInstance()
