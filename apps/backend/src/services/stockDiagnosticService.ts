import { Product } from '@gestion/database'
import { PrismaClient } from '../../prisma/generated/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface StockDiagnosticResult {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  alertsCount: number
  inconsistencies: any[]
  timestamp: string
}

class StockDiagnosticService {
  /**
   * Exécute un diagnostic complet du stock
   */
  async runDiagnostic(): Promise<StockDiagnosticResult> {
    try {
      logger.info('🔍 Démarrage du diagnostic de stock...')
      
      // Récupérer tous les produits avec leur stock
      const products = await prisma.product.findMany({
        include: {
          stock: true,
          stockAlerts: {
            where: { resolvedAt: null }
          }
        }
      })
      
      // Calculer les statistiques
      const totalProducts = products.length
      let lowStockCount = 0
      let outOfStockCount = 0
      const inconsistencies: any[] = []
      
      for (const product of products) {
        if (product.stock) {
          if (product.stock.quantiteActuelle === 0) {
            outOfStockCount++
          } else if (product.stock.quantiteActuelle <= product.stock.quantiteMinimale) {
            lowStockCount++
          }
          
          // Vérifier les incohérences
          const shouldHaveAlert = product.stock.quantiteActuelle <= product.stock.quantiteMinimale
          const hasAlert = product.stockAlerts.length > 0
          
          if (shouldHaveAlert && !hasAlert) {
            inconsistencies.push({
              type: 'MISSING_ALERT',
              productId: product.id,
              productName: product.name,
              currentStock: product.stock.quantiteActuelle,
              // threshold: product.stock.quantiteMinimale,
              message: `Alerte manquante pour ${product.name} (stock: ${product.stock.quantiteActuelle}, seuil: ${product.stock.quantiteMinimale})`
            })
          } else if (!shouldHaveAlert && hasAlert) {
            inconsistencies.push({
              type: 'UNNECESSARY_ALERT',
              productId: product.id,
              productName: product.name,
              currentStock: product.stock.quantiteActuelle,
              // threshold: product.stock.quantiteMinimale,
              message: `Alerte inutile pour ${product.name} (stock: ${product.stock.quantiteActuelle}, seuil: ${product.stock.quantiteMinimale})`
            })
          }
        } else {
          inconsistencies.push({
            type: 'MISSING_STOCK_DATA',
            productId: product.id,
            productName: product.name,
            message: `Données de stock manquantes pour ${product.name}`
          })
        }
      }
      
      // Compter les alertes actives
      const alertsCount = await prisma.stockAlert.count({
        where: { resolvedAt: null }
      })
      
      const result: StockDiagnosticResult = {
        totalProducts,
        lowStockCount,
        outOfStockCount,
        alertsCount,
        inconsistencies,
        timestamp: new Date().toISOString()
      }
      
      logger.info(`✅ Diagnostic terminé: ${totalProducts} produits, ${lowStockCount} en stock faible, ${outOfStockCount} en rupture, ${inconsistencies.length} incohérences`)
      
      return result
      
    } catch (error: any) {
      logger.error('❌ Erreur lors du diagnostic de stock:', error)
      throw new Error(`Erreur lors du diagnostic: ${error.message}`)
    }
  }
  
  /**
   * Vérifie la cohérence des alertes de stock
   */
  async checkAlertConsistency(): Promise<{
    consistent: boolean
    issues: any[]
    summary: string
  }> {
    try {
      const products = await prisma.product.findMany({
        include: {
          stock: true,
          stockAlerts: {
            where: { resolvedAt: null }
          }
        }
      })
      
      const issues: any[] = []
      
      for (const product of products) {
        if (product.stock) {
          const shouldHaveAlert = product.stock.quantiteActuelle <= product.stock.quantiteMinimale
          const hasAlert = product.stockAlerts.length > 0
          
          if (shouldHaveAlert && !hasAlert) {
            issues.push({
              type: 'MISSING_ALERT',
              productId: product.id,
              productName: product.name,
              severity: 'HIGH'
            })
          } else if (!shouldHaveAlert && hasAlert) {
            issues.push({
              type: 'UNNECESSARY_ALERT',
              productId: product.id,
              productName: product.name,
              severity: 'MEDIUM'
            })
          }
        }
      }
      
      const consistent = issues.length === 0
      const summary = consistent 
        ? 'Toutes les alertes sont cohérentes'
        : `${issues.length} incohérences détectées`
      
      return {
        consistent,
        issues,
        summary
      }
      
    } catch (error: any) {
      logger.error('❌ Erreur lors de la vérification de cohérence:', error)
      throw new Error(`Erreur lors de la vérification: ${error.message}`)
    }
  }
  
  /**
   * Obtient un résumé rapide du stock
   */
  async getQuickSummary(): Promise<{
    totalProducts: number
    lowStock: number
    outOfStock: number
    activeAlerts: number
    lastUpdated: string
  }> {
    try {
      const [totalProducts, lowStockProducts, outOfStockProducts, activeAlerts] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({
          where: {
            stock: {
              quantity: {
                lte: prisma.stock.fields.quantiteMinimale
              }
            }
          }
        }),
        prisma.product.count({
          where: {
            stock: {
              quantity: 0
            }
          }
        }),
        prisma.stockAlert.count({
          where: { resolvedAt: null }
        })
      ])
      
      return {
        totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        activeAlerts,
        lastUpdated: new Date().toISOString()
      }
      
    } catch (error: any) {
      logger.error('❌ Erreur lors du résumé rapide:', error)
      throw new Error(`Erreur lors du résumé: ${error.message}`)
    }
  }
}

export const stockDiagnosticService = new StockDiagnosticService()
