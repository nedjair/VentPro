import { prisma, Product } from '@gestion/database'
import { logger } from '../utils/logger'

interface StockCacheEntry {
  productId: string
  companyId: string
  quantity: number
  lastUpdated: Date
  minThreshold: number
  maxThreshold?: number
}

/**
 * Service de cache pour optimiser les performances des stocks
 * Assure un temps de réponse < 2s pour les opérations critiques
 */
export class StockCacheService {
  private static cache = new Map<string, StockCacheEntry>()
  private static readonly CACHE_TTL = 30000 // 30 secondes
  private static readonly BATCH_SIZE = 100

  /**
   * Générer une clé de cache unique
   */
  private static getCacheKey(productId: string, companyId: string): string {
    return `${companyId}:${productId}`
  }

  /**
   * Vérifier si une entrée de cache est valide
   */
  private static isCacheValid(entry: StockCacheEntry): boolean {
    const now = new Date()
    const timeDiff = now.getTime() - entry.lastUpdated.getTime()
    return timeDiff < this.CACHE_TTL
  }

  /**
   * Obtenir le stock d'un produit depuis le cache ou la base de données
   */
  static async getProductStock(productId: string, companyId: string): Promise<StockCacheEntry | null> {
    const cacheKey = this.getCacheKey(productId, companyId)
    const cachedEntry = this.cache.get(cacheKey)

    // Retourner le cache si valide
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      return cachedEntry
    }

    // Récupérer depuis la base de données
    try {
      const stock = await prisma.stock.findFirst({
        where: { productId, companyId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              isService: true,
            },
          },
        },
      })

      if (!stock) {
        return null
      }

      const entry: StockCacheEntry = {
        productId,
        companyId,
        quantity: stock.quantiteActuelle,
        lastUpdated: new Date(),
        minThreshold: stock.quantiteMinimale,
        maxThreshold: stock.quantiteMaximale || undefined,
      }

      // Mettre en cache
      this.cache.set(cacheKey, entry)
      return entry
    } catch (error) {
      logger.error('Erreur lors de la récupération du stock', { error, productId, companyId })
      return null
    }
  }

  /**
   * Obtenir les stocks de plusieurs produits en une seule requête
   */
  static async getBatchProductStocks(productIds: string[], companyId: string): Promise<Map<string, StockCacheEntry>> {
    const result = new Map<string, StockCacheEntry>()
    const uncachedProductIds: string[] = []

    // Vérifier le cache pour chaque produit
    for (const productId of productIds) {
      const cacheKey = this.getCacheKey(productId, companyId)
      const cachedEntry = this.cache.get(cacheKey)

      if (cachedEntry && this.isCacheValid(cachedEntry)) {
        result.set(productId, cachedEntry)
      } else {
        uncachedProductIds.push(productId)
      }
    }

    // Récupérer les produits non cachés depuis la base de données
    if (uncachedProductIds.length > 0) {
      try {
        const stocks = await prisma.stock.findMany({
          where: {
            productId: { in: uncachedProductIds },
            companyId,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                isService: true,
              },
            },
          },
        })

        for (const stock of stocks) {
          const entry: StockCacheEntry = {
            productId: stock.productId,
            companyId,
            quantity: stock.quantiteActuelle,
            lastUpdated: new Date(),
            minThreshold: stock.quantiteMinimale,
            maxThreshold: stock.quantiteMaximale || undefined,
          }

          // Mettre en cache
          const cacheKey = this.getCacheKey(stock.productId, companyId)
          this.cache.set(cacheKey, entry)
          result.set(stock.productId, entry)
        }
      } catch (error) {
        logger.error('Erreur lors de la récupération des stocks en lot', { error, productIds: uncachedProductIds, companyId })
      }
    }

    return result
  }

  /**
   * Mettre à jour le cache après une modification de stock
   */
  static updateCache(productId: string, companyId: string, newQuantity: number, minThreshold?: number, maxThreshold?: number): void {
    const cacheKey = this.getCacheKey(productId, companyId)
    const existingEntry = this.cache.get(cacheKey)

    const entry: StockCacheEntry = {
      productId,
      companyId,
      quantity: newQuantity,
      lastUpdated: new Date(),
      minThreshold: minThreshold ?? existingEntry?.quantiteMinimale ?? 0,
      maxThreshold: maxThreshold ?? existingEntry?.quantiteMaximale,
    }

    this.cache.set(cacheKey, entry)
    logger.debug('Cache de stock mis à jour', { productId, companyId, newQuantity })
  }

  /**
   * Invalider le cache pour un produit spécifique
   */
  static invalidateCache(productId: string, companyId: string): void {
    const cacheKey = this.getCacheKey(productId, companyId)
    this.cache.delete(cacheKey)
    logger.debug('Cache de stock invalidé', { productId, companyId })
  }

  /**
   * Invalider tout le cache d'une entreprise
   */
  static invalidateCompanyCache(companyId: string): void {
    const keysToDelete: string[] = []
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.companyId === companyId) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    logger.debug('Cache de stock de l\'entreprise invalidé', { companyId, deletedKeys: keysToDelete.length })
  }

  /**
   * Vérifier la disponibilité du stock pour une vente
   */
  static async checkStockAvailability(productId: string, requestedQuantity: number, companyId: string): Promise<{
    available: boolean
    currentStock: number
    message?: string
  }> {
    try {
      const stockEntry = await this.getProductStock(productId, companyId)

      if (!stockEntry) {
        return {
          available: false,
          currentStock: 0,
          message: 'Produit non trouvé en stock'
        }
      }

      const available = stockEntry.quantiteActuelle >= requestedQuantity

      return {
        available,
        currentStock: stockEntry.quantiteActuelle,
        message: available 
          ? undefined 
          : `Stock insuffisant. Disponible: ${stockEntry.quantiteActuelle}, Demandé: ${requestedQuantity}`
      }
    } catch (error) {
      logger.error('Erreur lors de la vérification de disponibilité', { error, productId, requestedQuantity, companyId })
      return {
        available: false,
        currentStock: 0,
        message: 'Erreur lors de la vérification du stock'
      }
    }
  }

  /**
   * Vérifier la disponibilité pour plusieurs produits
   */
  static async checkBatchStockAvailability(
    items: { productId: string; quantity: number }[],
    companyId: string
  ): Promise<Map<string, { available: boolean; currentStock: number; message?: string }>> {
    const productIds = items.map(item => item.productId)
    const stocks = await this.getBatchProductStocks(productIds, companyId)
    const results = new Map<string, { available: boolean; currentStock: number; message?: string }>()

    for (const item of items) {
      const stockEntry = stocks.get(item.productId)

      if (!stockEntry) {
        results.set(item.productId, {
          available: false,
          currentStock: 0,
          message: 'Produit non trouvé en stock'
        })
        continue
      }

      const available = stockEntry.quantiteActuelle >= item.quantiteActuelle

      results.set(item.productId, {
        available,
        currentStock: stockEntry.quantiteActuelle,
        message: available 
          ? undefined 
          : `Stock insuffisant. Disponible: ${stockEntry.quantiteActuelle}, Demandé: ${item.quantiteActuelle}`
      })
    }

    return results
  }

  /**
   * Nettoyer le cache des entrées expirées
   */
  static cleanExpiredCache(): void {
    const now = new Date()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      const timeDiff = now.getTime() - entry.lastUpdated.getTime()
      if (timeDiff >= this.CACHE_TTL) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key)
    }

    if (keysToDelete.length > 0) {
      logger.debug('Cache de stock nettoyé', { deletedEntries: keysToDelete.length })
    }
  }

  /**
   * Obtenir les statistiques du cache
   */
  static getCacheStats(): {
    totalEntries: number
    validEntries: number
    expiredEntries: number
    hitRate?: number
  } {
    const now = new Date()
    let validEntries = 0
    let expiredEntries = 0

    for (const entry of this.cache.values()) {
      const timeDiff = now.getTime() - entry.lastUpdated.getTime()
      if (timeDiff < this.CACHE_TTL) {
        validEntries++
      } else {
        expiredEntries++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
    }
  }

  /**
   * Initialiser le nettoyage automatique du cache
   */
  static initializeCleanupScheduler(): void {
    // Nettoyer le cache toutes les 5 minutes
    setInterval(() => {
      this.cleanExpiredCache()
    }, 5 * 60 * 1000)

    logger.info('Planificateur de nettoyage du cache de stock initialisé')
  }
}
