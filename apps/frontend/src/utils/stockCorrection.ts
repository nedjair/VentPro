import { api } from '@/lib/api'

export interface CorrectionAction {
  id: string
  name: string
  description: string
  type: 'sync' | 'refresh' | 'recalculate' | 'cleanup'
  endpoint?: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  priority: 'high' | 'medium' | 'low'
}

export interface CorrectionResult {
  action: CorrectionAction
  success: boolean
  message: string
  details?: any
  timestamp: string
  duration: number
}

class StockCorrectionService {
  private readonly correctionActions: CorrectionAction[] = [
    {
      id: 'execute-all-corrections',
      name: 'Correction automatique complète',
      description: 'Exécute toutes les corrections automatiques disponibles',
      type: 'sync',
      endpoint: '/api/v1/stock-correction/execute-all',
      method: 'POST',
      priority: 'high'
    },
    {
      id: 'execute-critical-corrections',
      name: 'Corrections critiques',
      description: 'Exécute seulement les corrections critiques',
      type: 'sync',
      endpoint: '/api/v1/stock-correction/execute-critical',
      method: 'POST',
      priority: 'high'
    },
    {
      id: 'force-frontend-refresh',
      name: 'Rafraîchissement frontend',
      description: 'Force le rafraîchissement des données côté frontend',
      type: 'refresh',
      priority: 'medium'
    }
  ]

  /**
   * Exécute une action de correction spécifique
   */
  async executeAction(action: CorrectionAction): Promise<CorrectionResult> {
    const startTime = Date.now()
    
    try {

      let result: any = null

      if (action.endpoint && action.method) {
        // Action backend via API
        switch (action.method) {
          case 'GET':
            result = await api.get(action.endpoint)
            break
          case 'POST':
            result = await api.post(action.endpoint)
            break
          case 'PUT':
            result = await api.put(action.endpoint)
            break
          case 'DELETE':
            result = await api.delete(action.endpoint)
            break
        }
      } else {
        // Action frontend
        switch (action.id) {
          case 'force-frontend-refresh':
            result = await this.forceFrontendRefresh()
            break
          default:
            throw new Error(`Action frontend non implémentée: ${action.id}`)
        }
      }

      const duration = Date.now() - startTime

      return {
        action,
        success: true,
        message: `${action.name} exécutée avec succès`,
        details: result?.data || result,
        timestamp: new Date().toISOString(),
        duration
      }

    } catch (error: any) {
      const duration = Date.now() - startTime
      
      console.error(`❌ Erreur lors de l'exécution de ${action.name}:`, error)

      return {
        action,
        success: false,
        message: `Erreur lors de ${action.name}`,
        details: error.response?.data || error.message,
        timestamp: new Date().toISOString(),
        duration
      }
    }
  }

  /**
   * Exécute toutes les actions de correction
   */
  async executeAllActions(): Promise<CorrectionResult[]> {

    const results: CorrectionResult[] = []

    try {
      // Exécuter la correction automatique complète via l'API
      const apiResult = await api.post('/api/v1/stock-correction/execute-all', {})

      if (apiResult.data.success && apiResult.data.data.results) {
        results.push(...apiResult.data.data.results)

        // Déclencher l'événement pour désactiver temporairement les notifications
        window.dispatchEvent(new CustomEvent('stockCorrectionExecuted', {
          detail: { type: 'all', results: apiResult.data.data.results }
        }))
      } else {
        results.push({
          action: {
            id: 'api-correction-all',
            name: 'Correction automatique complète',
            description: 'Exécution de toutes les corrections via API',
            type: 'sync',
            priority: 'high'
          },
          success: false,
          message: 'Erreur lors de la correction automatique via API',
          details: apiResult.data,
          timestamp: new Date().toISOString(),
          duration: 0
        })
      }
    } catch (error: any) {
      console.warn('⚠️ API non disponible, utilisation des corrections locales')

      // Fallback: exécuter les actions locales
      const localActions = this.correctionActions.filter(a => !a.endpoint)
      for (const action of localActions) {
        const result = await this.executeAction(action)
        results.push(result)
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    return results
  }

  /**
   * Exécute les actions critiques seulement
   */
  async executeHighPriorityActions(): Promise<CorrectionResult[]> {

    const results: CorrectionResult[] = []

    try {
      // Exécuter les corrections critiques via l'API
      const apiResult = await api.post('/api/v1/stock-correction/execute-critical', {})

      if (apiResult.data.success && apiResult.data.data.results) {
        results.push(...apiResult.data.data.results)

        // Déclencher l'événement pour désactiver temporairement les notifications
        window.dispatchEvent(new CustomEvent('stockCorrectionExecuted', {
          detail: { type: 'critical', results: apiResult.data.data.results }
        }))
      } else {
        results.push({
          action: {
            id: 'api-correction-critical',
            name: 'Corrections critiques',
            description: 'Exécution des corrections critiques via API',
            type: 'sync',
            priority: 'high'
          },
          success: false,
          message: 'Erreur lors des corrections critiques via API',
          details: apiResult.data,
          timestamp: new Date().toISOString(),
          duration: 0
        })
      }
    } catch (error: any) {
      console.warn('⚠️ API non disponible, utilisation des corrections locales')

      // Fallback: exécuter les actions locales critiques
      const localAction = await this.forceFrontendRefresh()
      results.push({
        action: {
          id: 'force-frontend-refresh',
          name: 'Rafraîchissement frontend',
          description: 'Force le rafraîchissement des données côté frontend',
          type: 'refresh',
          priority: 'high'
        },
        success: localAction.success,
        message: localAction.message,
        details: localAction.details,
        timestamp: new Date().toISOString(),
        duration: 100
      })
    }

    return results
  }

  /**
   * Force le rafraîchissement des données côté frontend
   */
  private async forceFrontendRefresh(): Promise<any> {
    try {
      // Déclencher un événement personnalisé pour forcer le rafraîchissement
      window.dispatchEvent(new CustomEvent('forceRefreshStockData', {
        detail: { timestamp: Date.now() }
      }))

      // Vider le localStorage des données mises en cache
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.includes('stock') || key.includes('dashboard') || key.includes('alert')
      )
      
      keysToRemove.forEach(key => localStorage.removeItem(key))

      // Vider le sessionStorage aussi
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key => 
        key.includes('stock') || key.includes('dashboard') || key.includes('alert')
      )
      
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key))

      return {
        success: true,
        message: 'Rafraîchissement frontend effectué',
        details: {
          localStorageKeysRemoved: keysToRemove.length,
          sessionStorageKeysRemoved: sessionKeysToRemove.length,
          eventDispatched: true
        }
      }
    } catch (error: any) {
      throw new Error(`Erreur lors du rafraîchissement frontend: ${error.message}`)
    }
  }

  /**
   * Obtient la liste des actions disponibles
   */
  getAvailableActions(): CorrectionAction[] {
    return [...this.correctionActions]
  }

  /**
   * Obtient les actions par priorité
   */
  getActionsByPriority(priority: 'high' | 'medium' | 'low'): CorrectionAction[] {
    return this.correctionActions.filter(a => a.priority === priority)
  }

  /**
   * Vérifie si une action est disponible
   */
  isActionAvailable(actionId: string): boolean {
    return this.correctionActions.some(a => a.id === actionId)
  }

  /**
   * Obtient une action par son ID
   */
  getActionById(actionId: string): CorrectionAction | undefined {
    return this.correctionActions.find(a => a.id === actionId)
  }
}

// Instance singleton
export const stockCorrection = new StockCorrectionService()
