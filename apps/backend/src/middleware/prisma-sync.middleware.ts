import { Prisma } from '@gestion/database'
import { AutoSyncService } from '../services/auto-sync.service'
import { logger } from '../utils/logger'

/**
 * Middleware Prisma pour synchronisation automatique des stocks
 */
export function createPrismaSyncMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    // Exécuter l'opération principale d'abord
    const result = await next(params)

    // Synchronisation après l'opération réussie
    try {
      await handleSyncAfterOperation(params, result)
    } catch (error) {
      // Log l'erreur mais ne fait pas échouer l'opération principale
      logger.error('Erreur lors de la synchronisation automatique', { 
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        model: params.model,
        action: params.action
      })
    }

    return result
  }
}

/**
 * Gère la synchronisation après une opération Prisma
 */
async function handleSyncAfterOperation(params: Prisma.MiddlewareParams, result: any): Promise<void> {
  const { model, action } = params

  // Synchronisation pour les opérations sur les produits
  if (model === 'Product') {
    await handleProductSync(action, params, result)
  }
  
  // Synchronisation pour les opérations sur les stocks
  if (model === 'Stock') {
    await handleStockSync(action, params, result)
  }
}

/**
 * Gère la synchronisation pour les opérations sur les produits
 */
async function handleProductSync(
  action: string, 
  params: Prisma.MiddlewareParams, 
  result: any
): Promise<void> {
  
  switch (action) {
    case 'create':
      if (result?.id && result?.companyId) {
        logger.debug('Synchronisation après création de produit', { productId: result.id })
        await AutoSyncService.syncProductToStock(result.id, result.companyId)
      }
      break

    case 'update':
      if (params.args?.where?.id && result?.companyId) {
        const productId = params.args.where.id
        logger.debug('Synchronisation après mise à jour de produit', { productId })
        await AutoSyncService.syncProductToStock(productId, result.companyId)
      }
      break

    case 'updateMany':
      // Pour updateMany, on ne peut pas synchroniser individuellement
      // On pourrait déclencher une synchronisation complète si nécessaire
      if (params.args?.where?.companyId) {
        logger.debug('Synchronisation après updateMany de produits', { 
          companyId: params.args.where.companyId 
        })
        // Optionnel: synchronisation complète pour les updateMany
        // await AutoSyncService.syncAllProducts(params.args.where.companyId)
      }
      break

    case 'upsert':
      if (result?.id && result?.companyId) {
        logger.debug('Synchronisation après upsert de produit', { productId: result.id })
        await AutoSyncService.syncProductToStock(result.id, result.companyId)
      }
      break

    default:
      // Pas de synchronisation pour delete, findMany, etc.
      break
  }
}

/**
 * Gère la synchronisation pour les opérations sur les stocks
 */
async function handleStockSync(
  action: string, 
  params: Prisma.MiddlewareParams, 
  result: any
): Promise<void> {
  
  switch (action) {
    case 'create':
      if (result?.id && result?.companyId) {
        logger.debug('Synchronisation après création de stock', { stockId: result.id })
        await AutoSyncService.syncStockToProduct(result.id, result.companyId)
      }
      break

    case 'update':
      if (params.args?.where?.id && result?.companyId) {
        const stockId = params.args.where.id
        logger.debug('Synchronisation après mise à jour de stock', { stockId })
        await AutoSyncService.syncStockToProduct(stockId, result.companyId)
      }
      break

    case 'updateMany':
      // Pour updateMany, synchronisation complète si nécessaire
      if (params.args?.where?.companyId) {
        logger.debug('Synchronisation après updateMany de stocks', { 
          companyId: params.args.where.companyId 
        })
        // Optionnel: synchronisation complète pour les updateMany
        // await AutoSyncService.syncAllProducts(params.args.where.companyId)
      }
      break

    case 'upsert':
      if (result?.id && result?.companyId) {
        logger.debug('Synchronisation après upsert de stock', { stockId: result.id })
        await AutoSyncService.syncStockToProduct(result.id, result.companyId)
      }
      break

    default:
      // Pas de synchronisation pour delete, findMany, etc.
      break
  }
}

/**
 * Configuration du middleware avec options
 */
export interface SyncMiddlewareOptions {
  enableProductSync?: boolean
  enableStockSync?: boolean
  enableBatchSync?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * Crée un middleware de synchronisation avec options personnalisées
 */
export function createConfigurableSyncMiddleware(
  options: SyncMiddlewareOptions = {}
): Prisma.Middleware {
  const {
    enableProductSync = true,
    enableStockSync = true,
    enableBatchSync = false,
    logLevel = 'debug'
  } = options

  return async (params, next) => {
    const result = await next(params)

    // Vérifier si la synchronisation est activée pour ce modèle
    const shouldSync = 
      (params.model === 'Product' && enableProductSync) ||
      (params.model === 'Stock' && enableStockSync)

    if (!shouldSync) {
      return result
    }

    // Vérifier si on doit traiter les opérations batch
    const isBatchOperation = params.action.includes('Many')
    if (isBatchOperation && !enableBatchSync) {
      return result
    }

    try {
      await handleSyncAfterOperation(params, result)
    } catch (error) {
      if (logLevel === 'debug' || logLevel === 'info') {
        logger.error('Erreur synchronisation automatique', { 
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          model: params.model,
          action: params.action
        })
      }
    }

    return result
  }
}

/**
 * Middleware spécialisé pour les mouvements de stock
 * Synchronise automatiquement les quantités après un mouvement
 */
export function createStockMovementSyncMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const result = await next(params)
    const modelName = String(params.model || '')

    // Synchronisation après création d'un mouvement de stock
    if (modelName === 'StockMovement' && params.action === 'create') {
      try {
        if (result?.productId && result?.companyId) {
          logger.debug('Synchronisation après mouvement de stock', { 
            productId: result.productId,
            type: result.type,
            quantity: result.quantiteActuelle
          })
          
          // Recalculer et synchroniser le stock du produit
          await AutoSyncService.syncProductToStock(result.productId, result.companyId)
        }
      } catch (error) {
        logger.error('Erreur synchronisation après mouvement de stock', { 
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          productId: result?.productId
        })
      }
    }

    return result
  }
}
