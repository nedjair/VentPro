import { prisma, Product } from '@gestion/database'
import { logger } from '../utils/logger'

/**
 * Service de synchronisation automatique entre tables products et stocks
 */
export class AutoSyncService {
  
  /**
   * Synchronise un produit vers sa table stock correspondante
   */
  static async syncProductToStock(productId: string, companyId: string): Promise<void> {
    try {
      logger.debug('Synchronisation produit → stock', { productId, companyId })

      // Récupérer le produit avec son stock
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
        include: { stock: true }
      })

      if (!product) {
        logger.warn('Produit non trouvé pour synchronisation', { productId, companyId })
        return
      }

      // Ne pas synchroniser les services
      if (product.isService) {
        logger.debug('Produit est un service, pas de synchronisation stock', { productId })
        return
      }

      // Si pas d'enregistrement stock, le créer
      if (!product.stock) {
        await prisma.stock.create({
          data: {
            productId: product.id,
            companyId: companyId,
            quantiteActuelle: product.stockQuantity,
            quantiteMinimale: product.minStock,
            quantiteMaximale: product.maxStock,
            dateLastUpdate: new Date()
          }
        })
        logger.info('Enregistrement stock créé automatiquement', { productId, stockQuantity: product.stockQuantity })
        return
      }

      // Vérifier si synchronisation nécessaire
      const needsUpdate = 
        product.stock.quantiteActuelle !== product.stockQuantity ||
        product.stock.quantiteMinimale !== product.minStock ||
        product.stock.quantiteMaximale !== product.maxStock

      if (needsUpdate) {
        await prisma.stock.update({
          where: { id: product.stock.id },
          data: {
            quantiteActuelle: product.stockQuantity,
            quantiteMinimale: product.minStock,
            quantiteMaximale: product.maxStock,
            dateLastUpdate: new Date()
          }
        })
        logger.info('Stock synchronisé automatiquement', { 
          productId, 
          changes: {
            quantite: `${product.stock.quantiteActuelle} → ${product.stockQuantity}`,
            min: `${product.stock.quantiteMinimale} → ${product.minStock}`,
            max: `${product.stock.quantiteMaximale} → ${product.maxStock}`
          }
        })
      }

    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation produit → stock', { 
        error: error.message, 
        productId, 
        companyId 
      })
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Synchronise un stock vers son produit correspondant
   */
  static async syncStockToProduct(stockId: string, companyId: string): Promise<void> {
    try {
      logger.debug('Synchronisation stock → produit', { stockId, companyId })

      // Récupérer le stock avec son produit
      const stock = await prisma.stock.findFirst({
        where: { id: stockId, companyId },
        include: { product: true }
      })

      if (!stock || !stock.product) {
        logger.warn('Stock ou produit non trouvé pour synchronisation', { stockId, companyId })
        return
      }

      // Ne pas synchroniser les services
      if (stock.product.isService) {
        logger.debug('Produit est un service, pas de synchronisation', { stockId })
        return
      }

      // Vérifier si synchronisation nécessaire
      const needsUpdate = 
        stock.product.stockQuantity !== stock.quantiteActuelle ||
        stock.product.minStock !== stock.quantiteMinimale ||
        stock.product.maxStock !== stock.quantiteMaximale

      if (needsUpdate) {
        await prisma.product.update({
          where: { id: stock.product.id },
          data: {
            stockQuantity: stock.quantiteActuelle,
            minStock: stock.quantiteMinimale,
            maxStock: stock.quantiteMaximale
          }
        })
        logger.info('Produit synchronisé automatiquement', { 
          productId: stock.product.id,
          stockId,
          changes: {
            stockQuantity: `${stock.product.stockQuantity} → ${stock.quantiteActuelle}`,
            minStock: `${stock.product.minStock} → ${stock.quantiteMinimale}`,
            maxStock: `${stock.product.maxStock} → ${stock.quantiteMaximale}`
          }
        })
      }

    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation stock → produit', { 
        error: error.message, 
        stockId, 
        companyId 
      })
      // Ne pas faire échouer l'opération principale
    }
  }

  /**
   * Synchronise tous les produits d'une entreprise
   */
  static async syncAllProducts(companyId: string): Promise<{ synced: number, created: number, errors: number }> {
    try {
      logger.info('Synchronisation complète des produits', { companyId })

      const products = await prisma.product.findMany({
        where: { companyId, isService: false },
        include: { stock: true }
      })

      let synced = 0
      let created = 0
      let errors = 0

      for (const product of products) {
        try {
          if (!product.stock) {
            // Créer l'enregistrement stock
            await prisma.stock.create({
              data: {
                productId: product.id,
                companyId: companyId,
                quantiteActuelle: product.stockQuantity,
                quantiteMinimale: product.minStock,
                quantiteMaximale: product.maxStock,
                dateLastUpdate: new Date()
              }
            })
            created++
          } else {
            // Synchroniser si nécessaire
            const needsUpdate = 
              product.stock.quantiteActuelle !== product.stockQuantity ||
              product.stock.quantiteMinimale !== product.minStock ||
              product.stock.quantiteMaximale !== product.maxStock

            if (needsUpdate) {
              await prisma.stock.update({
                where: { id: product.stock.id },
                data: {
                  quantiteActuelle: product.stockQuantity,
                  quantiteMinimale: product.minStock,
                  quantiteMaximale: product.maxStock,
                  dateLastUpdate: new Date()
                }
              })
              synced++
            }
          }
        } catch (error) {
          errors++
          logger.error('Erreur synchronisation produit individuel', { 
            productId: product.id, 
            error: error instanceof Error ? error.message : 'Erreur inconnue' 
          })
        }
      }

      logger.info('Synchronisation complète terminée', { 
        companyId, 
        stats: { synced, created, errors, total: products.length } 
      })

      return { synced, created, errors }

    } catch (error: any) {
      logger.error('Erreur lors de la synchronisation complète', { 
        error: error.message, 
        companyId 
      })
      throw error
    }
  }

  /**
   * Nettoie les enregistrements stock orphelins (sans produit correspondant)
   */
  static async cleanupOrphanedStocks(companyId: string): Promise<number> {
    try {
      logger.info('Nettoyage des stocks orphelins', { companyId })

      // Utiliser une requête SQL sécurisée pour identifier les orphelins
      const orphanedStocks = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT s.id
        FROM stocks s
        LEFT JOIN products p ON s."productId" = p.id
        WHERE s."companyId" = ${companyId} AND p.id IS NULL
      `

      if (orphanedStocks.length > 0) {
        const orphanIds = orphanedStocks.map(s => s.id)

        // Suppression sécurisée avec double vérification
        const deletedCount = await prisma.stock.deleteMany({
          where: {
            id: { in: orphanIds },
            companyId, // Sécurité supplémentaire
            product: null // Double vérification
          }
        })

        logger.info('Stocks orphelins supprimés', {
          companyId,
          identified: orphanedStocks.length,
          deleted: deletedCount.count
        })

        return deletedCount.count
      }

      return 0

    } catch (error: any) {
      logger.error('Erreur lors du nettoyage des stocks orphelins', {
        error: error.message,
        companyId
      })
      throw error
    }
  }

  /**
   * Nettoyage complet et sécurisé de la base de données
   */
  static async performCompleteCleanup(companyId: string, options: {
    removeOrphans?: boolean
    createMissing?: boolean
    syncInconsistent?: boolean
    dryRun?: boolean
  } = {}): Promise<{
    orphansRemoved: number
    stocksCreated: number
    recordsSynced: number
    totalActions: number
  }> {
    const {
      removeOrphans = true,
      createMissing = true,
      syncInconsistent = true,
      dryRun = false
    } = options

    try {
      logger.info('Début du nettoyage complet', { companyId, options })

      let orphansRemoved = 0
      let stocksCreated = 0
      let recordsSynced = 0

      // 1. Supprimer les stocks orphelins
      if (removeOrphans) {
        if (!dryRun) {
          orphansRemoved = await this.cleanupOrphanedStocks(companyId)
        } else {
          const orphanedStocks = await prisma.$queryRaw<Array<{ id: string }>>`
            SELECT s.id
            FROM stocks s
            LEFT JOIN products p ON s."productId" = p.id
            WHERE s."companyId" = ${companyId} AND p.id IS NULL
          `
          orphansRemoved = orphanedStocks.length
          logger.info('Simulation: stocks orphelins à supprimer', { count: orphansRemoved })
        }
      }

      // 2. Créer les stocks manquants
      if (createMissing) {
        const productsWithoutStock = await prisma.$queryRaw<Array<{
          id: string
          name: string
          stockQuantity: number
          minStock: number
          maxStock: number | null
        }>>`
          SELECT p.id, p.name, p."stockQuantity", p."minStock", p."maxStock"
          FROM products p
          LEFT JOIN stocks s ON p.id = s."productId"
          WHERE p."companyId" = ${companyId}
          AND s."productId" IS NULL
          AND p."isService" = false
          AND p."isActive" = true
        `

        if (!dryRun) {
          for (const product of productsWithoutStock) {
            try {
              await prisma.stock.create({
                data: {
                  productId: product.id,
                  companyId: companyId,
                  quantiteActuelle: product.stockQuantity || 0,
                  quantiteMinimale: product.minStock || 0,
                  quantiteMaximale: product.maxStock,
                  dateLastUpdate: new Date()
                }
              })
              stocksCreated++
            } catch (error) {
              logger.warn('Erreur création stock', { productId: product.id, error: error instanceof Error ? error.message : 'Erreur inconnue' })
            }
          }
        } else {
          stocksCreated = productsWithoutStock.length
          logger.info('Simulation: stocks à créer', { count: stocksCreated })
        }
      }

      // 3. Synchroniser les données incohérentes
      if (syncInconsistent) {
        const inconsistentData = await prisma.$queryRaw<Array<{
          product_id: string
          product_stock: number
          product_min: number
          product_max: number | null
        }>>`
          SELECT
            p.id as product_id,
            p."stockQuantity" as product_stock,
            p."minStock" as product_min,
            p."maxStock" as product_max
          FROM products p
          INNER JOIN stocks s ON p.id = s."productId"
          WHERE p."companyId" = ${companyId}
          AND (
            p."stockQuantity" != s."quantiteActuelle" OR
            p."minStock" != s."quantiteMinimale" OR
            p."maxStock" IS DISTINCT FROM s."quantiteMaximale"
          )
        `

        if (!dryRun) {
          for (const item of inconsistentData) {
            try {
              await prisma.stock.update({
                where: { productId: item.product_id },
                data: {
                  quantiteActuelle: item.product_stock,
                  quantiteMinimale: item.product_min,
                  quantiteMaximale: item.product_max,
                  dateLastUpdate: new Date()
                }
              })
              recordsSynced++
            } catch (error) {
              logger.warn('Erreur synchronisation', { productId: item.product_id, error: error instanceof Error ? error.message : 'Erreur inconnue' })
            }
          }
        } else {
          recordsSynced = inconsistentData.length
          logger.info('Simulation: enregistrements à synchroniser', { count: recordsSynced })
        }
      }

      const totalActions = orphansRemoved + stocksCreated + recordsSynced

      logger.info('Nettoyage complet terminé', {
        companyId,
        orphansRemoved,
        stocksCreated,
        recordsSynced,
        totalActions,
        dryRun
      })

      return {
        orphansRemoved,
        stocksCreated,
        recordsSynced,
        totalActions
      }

    } catch (error: any) {
      logger.error('Erreur lors du nettoyage complet', {
        error: error.message,
        companyId
      })
      throw error
    }
  }

  /**
   * Vérifie la cohérence des données entre products et stocks
   */
  static async checkConsistency(companyId: string): Promise<{
    consistent: number
    inconsistent: number
    missing: number
    details: Array<{
      productId: string
      productName: string
      issue: string
      productData: any
      stockData: any
    }>
  }> {
    try {
      logger.info('Vérification de la cohérence des données', { companyId })

      const products = await prisma.product.findMany({
        where: { companyId, isService: false },
        include: { stock: true }
      })

      let consistent = 0
      let inconsistent = 0
      let missing = 0
      const details: any[] = []

      for (const product of products) {
        if (!product.stock) {
          missing++
          details.push({
            productId: product.id,
            productName: product.name,
            issue: 'Stock manquant',
            productData: {
              stockQuantity: product.stockQuantity,
              minStock: product.minStock,
              maxStock: product.maxStock
            },
            stockData: null
          })
        } else {
          const isConsistent = 
            product.stock.quantiteActuelle === product.stockQuantity &&
            product.stock.quantiteMinimale === product.minStock &&
            product.stock.quantiteMaximale === product.maxStock

          if (isConsistent) {
            consistent++
          } else {
            inconsistent++
            details.push({
              productId: product.id,
              productName: product.name,
              issue: 'Données incohérentes',
              productData: {
                stockQuantity: product.stockQuantity,
                minStock: product.minStock,
                maxStock: product.maxStock
              },
              stockData: {
                quantiteActuelle: product.stock.quantiteActuelle,
                quantiteMinimale: product.stock.quantiteMinimale,
                quantiteMaximale: product.stock.quantiteMaximale
              }
            })
          }
        }
      }

      const result = { consistent, inconsistent, missing, details }
      
      logger.info('Vérification de cohérence terminée', { 
        companyId, 
        stats: { consistent, inconsistent, missing, total: products.length } 
      })

      return result

    } catch (error: any) {
      logger.error('Erreur lors de la vérification de cohérence', { 
        error: error.message, 
        companyId 
      })
      throw error
    }
  }
}
