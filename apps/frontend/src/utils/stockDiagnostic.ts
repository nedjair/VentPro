/**
 * Diagnostic avancé pour identifier les problèmes de synchronisation des données de stock
 */

import { api } from '@/lib/api'

interface DiagnosticResult {
  endpoint: string
  success: boolean
  data?: any
  error?: string
  responseTime: number
  timestamp: string
}

interface InconsistencyReport {
  field: string
  dashboard: any
  alerts: any
  products: any
  inconsistent: boolean
  details: string
}

export class StockDiagnostic {
  private results: DiagnosticResult[] = []

  async runFullDiagnostic(): Promise<{
    endpoints: DiagnosticResult[]
    inconsistencies: InconsistencyReport[]
    summary: {
      totalEndpoints: number
      successfulEndpoints: number
      failedEndpoints: number
      totalInconsistencies: number
      avgResponseTime: number
    }
  }> {
    
    // 1. Test de tous les endpoints
    const endpoints = await this.testAllEndpoints()
    
    // 2. Analyse des incohérences
    const inconsistencies = await this.analyzeInconsistencies(endpoints)
    
    // 3. Génération du résumé
    const summary = this.generateSummary(endpoints, inconsistencies)
    
    return {
      endpoints,
      inconsistencies,
      summary
    }
  }

  private async testAllEndpoints(): Promise<DiagnosticResult[]> {
    const endpointsToTest = [
      {
        name: 'Dashboard Stock',
        url: '/api/v1/stock/dashboard',
        description: 'Données du tableau de bord stock'
      },
      {
        name: 'Alertes Stock',
        url: '/api/v1/stock-alerts/alerts?isActive=true&limit=100',
        description: 'Alertes de stock actives'
      },
      {
        name: 'Produits',
        url: '/api/v1/products?limit=100',
        description: 'Liste des produits avec stock'
      },
      {
        name: 'Stats Stock',
        url: '/api/v1/stock/stats',
        description: 'Statistiques générales du stock'
      },
      {
        name: 'Dashboard Principal',
        url: '/api/v1/dashboard/stats',
        description: 'Statistiques du dashboard principal'
      },
      {
        name: 'Stocks Liste',
        url: '/api/v1/stock?limit=100',
        description: 'Liste complète des stocks'
      }
    ]

    const results: DiagnosticResult[] = []

    for (const endpoint of endpointsToTest) {
      const result = await this.testSingleEndpoint(endpoint.name, endpoint.url)
      results.push(result)
      
      // Pause entre les appels pour éviter la surcharge
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return results
  }

  private async testSingleEndpoint(name: string, url: string): Promise<DiagnosticResult> {
    const startTime = Date.now()
    const timestamp = new Date().toISOString()

    try {
      const response = await api.get(url)
      const responseTime = Date.now() - startTime

      if (response.data.success) {
        return {
          endpoint: name,
          success: true,
          data: response.data.data,
          responseTime,
          timestamp
        }
      } else {
        return {
          endpoint: name,
          success: false,
          error: response.data.message || 'Réponse non successful',
          responseTime,
          timestamp
        }
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime
      return {
        endpoint: name,
        success: false,
        error: error.response?.data?.message || error.message,
        responseTime,
        timestamp
      }
    }
  }

  private async analyzeInconsistencies(endpoints: DiagnosticResult[]): Promise<InconsistencyReport[]> {
    const dashboardData = endpoints.find(e => e.endpoint === 'Dashboard Stock')?.data
    const alertsData = endpoints.find(e => e.endpoint === 'Alertes Stock')?.data
    const productsData = endpoints.find(e => e.endpoint === 'Produits')?.data
    const statsData = endpoints.find(e => e.endpoint === 'Stats Stock')?.data

    const inconsistencies: InconsistencyReport[] = []

    if (!dashboardData || !alertsData || !productsData) {
      inconsistencies.push({
        field: 'Données manquantes',
        dashboard: !!dashboardData,
        alerts: !!alertsData,
        products: !!productsData,
        inconsistent: true,
        details: 'Un ou plusieurs endpoints ont échoué'
      })
      return inconsistencies
    }

    // Vérification 1: Nombre total d'alertes
    const dashboardAlerts = dashboardData.activity?.activeAlerts || 0
    const alertsCount = Array.isArray(alertsData) ? alertsData.length : (alertsData.alerts?.length || 0)
    
    if (dashboardAlerts !== alertsCount) {
      inconsistencies.push({
        field: 'Nombre total d\'alertes',
        dashboard: dashboardAlerts,
        alerts: alertsCount,
        products: 'N/A',
        inconsistent: true,
        details: `Dashboard indique ${dashboardAlerts} alertes, mais l'endpoint alertes retourne ${alertsCount} alertes`
      })
    }

    // Vérification 2: Nombre de produits
    const dashboardProducts = dashboardData.overview?.totalProducts || 0
    const productsCount = Array.isArray(productsData) ? productsData.length : (productsData.products?.length || 0)
    
    if (dashboardProducts !== productsCount) {
      inconsistencies.push({
        field: 'Nombre de produits',
        dashboard: dashboardProducts,
        alerts: 'N/A',
        products: productsCount,
        inconsistent: true,
        details: `Dashboard indique ${dashboardProducts} produits, mais l'endpoint produits retourne ${productsCount} produits`
      })
    }

    // Vérification 3: Produits en rupture de stock
    const dashboardOutOfStock = dashboardData.overview?.outOfStockProducts || 0
    const alertsOutOfStock = Array.isArray(alertsData) 
      ? alertsData.filter((a: any) => a.type === 'OUT_OF_STOCK').length
      : (alertsData.alerts?.filter((a: any) => a.type === 'OUT_OF_STOCK').length || 0)
    
    const productsOutOfStock = Array.isArray(productsData)
      ? productsData.filter((p: any) => (p.currentStock || p.stock || 0) === 0).length
      : (productsData.products?.filter((p: any) => (p.currentStock || p.stock || 0) === 0).length || 0)

    if (dashboardOutOfStock !== alertsOutOfStock || dashboardOutOfStock !== productsOutOfStock) {
      inconsistencies.push({
        field: 'Produits en rupture de stock',
        dashboard: dashboardOutOfStock,
        alerts: alertsOutOfStock,
        products: productsOutOfStock,
        inconsistent: true,
        details: `Incohérence: Dashboard=${dashboardOutOfStock}, Alertes=${alertsOutOfStock}, Produits=${productsOutOfStock}`
      })
    }

    // Vérification 4: Produits en stock faible
    const dashboardLowStock = dashboardData.overview?.lowStockProducts || 0
    const alertsLowStock = Array.isArray(alertsData)
      ? alertsData.filter((a: any) => a.type === 'LOW_STOCK').length
      : (alertsData.alerts?.filter((a: any) => a.type === 'LOW_STOCK').length || 0)

    if (dashboardLowStock !== alertsLowStock) {
      inconsistencies.push({
        field: 'Produits en stock faible',
        dashboard: dashboardLowStock,
        alerts: alertsLowStock,
        products: 'N/A',
        inconsistent: true,
        details: `Dashboard indique ${dashboardLowStock} produits en stock faible, mais les alertes en indiquent ${alertsLowStock}`
      })
    }

    // Vérification 5: Structure des données
    this.verifyDataStructure(dashboardData, alertsData, productsData, inconsistencies)

    return inconsistencies
  }

  private verifyDataStructure(dashboardData: any, alertsData: any, productsData: any, inconsistencies: InconsistencyReport[]) {
    // Vérifier la structure du dashboard
    const expectedDashboardFields = ['overview', 'activity', 'trends']
    const dashboardFields = Object.keys(dashboardData || {})
    
    for (const field of expectedDashboardFields) {
      if (!dashboardFields.includes(field)) {
        inconsistencies.push({
          field: `Structure Dashboard - ${field}`,
          dashboard: 'Manquant',
          alerts: 'N/A',
          products: 'N/A',
          inconsistent: true,
          details: `Le champ '${field}' est manquant dans les données du dashboard`
        })
      }
    }

    // Vérifier la structure des alertes
    const alertsArray = Array.isArray(alertsData) ? alertsData : (alertsData.alerts || [])
    if (alertsArray.length > 0) {
      const firstAlert = alertsArray[0]
      const expectedAlertFields = ['id', 'type', 'productId', 'currentStock', 'thresholdValue']
      
      for (const field of expectedAlertFields) {
        if (!(field in firstAlert)) {
          inconsistencies.push({
            field: `Structure Alertes - ${field}`,
            dashboard: 'N/A',
            alerts: 'Manquant',
            products: 'N/A',
            inconsistent: true,
            details: `Le champ '${field}' est manquant dans les données des alertes`
          })
        }
      }
    }

    // Vérifier la structure des produits
    const productsArray = Array.isArray(productsData) ? productsData : (productsData.products || [])
    if (productsArray.length > 0) {
      const firstProduct = productsArray[0]
      const expectedProductFields = ['id', 'name', 'sku']
      
      for (const field of expectedProductFields) {
        if (!(field in firstProduct)) {
          inconsistencies.push({
            field: `Structure Produits - ${field}`,
            dashboard: 'N/A',
            alerts: 'N/A',
            products: 'Manquant',
            inconsistent: true,
            details: `Le champ '${field}' est manquant dans les données des produits`
          })
        }
      }
    }
  }

  private generateSummary(endpoints: DiagnosticResult[], inconsistencies: InconsistencyReport[]) {
    const successful = endpoints.filter(e => e.success)
    const failed = endpoints.filter(e => !e.success)
    const avgResponseTime = endpoints.reduce((sum, e) => sum + e.responseTime, 0) / endpoints.length

    return {
      totalEndpoints: endpoints.length,
      successfulEndpoints: successful.length,
      failedEndpoints: failed.length,
      totalInconsistencies: inconsistencies.filter(i => i.inconsistent).length,
      avgResponseTime: Math.round(avgResponseTime)
    }
  }

  // Méthode pour générer un rapport détaillé
  generateDetailedReport(diagnostic: any): string {
    let report = '📊 RAPPORT DE DIAGNOSTIC DÉTAILLÉ\n'
    report += '=' .repeat(50) + '\n\n'

    // Résumé
    report += '📈 RÉSUMÉ:\n'
    report += `- Endpoints testés: ${diagnostic.summary.totalEndpoints}\n`
    report += `- Succès: ${diagnostic.summary.successfulEndpoints}\n`
    report += `- Échecs: ${diagnostic.summary.failedEndpoints}\n`
    report += `- Incohérences: ${diagnostic.summary.totalInconsistencies}\n`
    report += `- Temps de réponse moyen: ${diagnostic.summary.avgResponseTime}ms\n\n`

    // Endpoints en échec
    const failedEndpoints = diagnostic.endpoints.filter((e: any) => !e.success)
    if (failedEndpoints.length > 0) {
      report += '❌ ENDPOINTS EN ÉCHEC:\n'
      failedEndpoints.forEach((endpoint: any) => {
        report += `- ${endpoint.endpoint}: ${endpoint.error}\n`
      })
      report += '\n'
    }

    // Incohérences détectées
    const inconsistencies = diagnostic.inconsistencies.filter((i: any) => i.inconsistent)
    if (inconsistencies.length > 0) {
      report += '⚠️  INCOHÉRENCES DÉTECTÉES:\n'
      inconsistencies.forEach((inc: any) => {
        report += `- ${inc.field}:\n`
        report += `  Dashboard: ${inc.dashboard}\n`
        report += `  Alertes: ${inc.alerts}\n`
        report += `  Produits: ${inc.products}\n`
        report += `  Détails: ${inc.details}\n\n`
      })
    }

    // Recommandations
    report += '💡 RECOMMANDATIONS:\n'
    if (diagnostic.summary.failedEndpoints > 0) {
      report += '- Vérifier la connectivité et l\'authentification des endpoints en échec\n'
    }
    if (diagnostic.summary.totalInconsistencies > 0) {
      report += '- Synchroniser les données entre les différentes sources\n'
      report += '- Vérifier la logique de calcul des compteurs\n'
      report += '- Examiner les requêtes SQL pour s\'assurer de la cohérence\n'
    }
    if (diagnostic.summary.avgResponseTime > 2000) {
      report += '- Optimiser les performances des endpoints (temps > 2s)\n'
    }

    return report
  }
}

// Instance singleton
export const stockDiagnostic = new StockDiagnostic()
