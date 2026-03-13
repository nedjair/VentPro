import { Prisma, StockMovement, Product } from '@gestion/database'
import { logger } from '../utils/logger'
import { StockAuditService } from './stock-audit.service'
import { prisma } from '../lib/prisma'

/**
 * Service unifié pour la gestion cohérente des stocks
 * Garantit la synchronisation entre les tables Product et Stock
 */
export class UnifiedStockService {

  private static buildUnifiedCategory(row: any) {
    if (!row.categoryId) {
      return null
    }

    return {
      id: row.categoryId,
      name: row.categoryName || 'Catégorie',
      description: row.categoryDescription || undefined,
      createdAt: row.categoryCreatedAt || row.updatedAt,
      updatedAt: row.categoryUpdatedAt || row.updatedAt,
    }
  }

  private static buildUnifiedProduct(row: any) {
    const stockQuantity = Number(row.stockQuantity || 0)
    const minStock = Number(row.minStock || 0)
    const maxStock = row.maxStock == null ? null : Number(row.maxStock)
    const category = this.buildUnifiedCategory(row)

    let status: 'out' | 'low' | 'normal' | 'over' = 'normal'
    if (stockQuantity <= 0) {
      status = 'out'
    } else if (minStock > 0 && stockQuantity <= minStock) {
      status = 'low'
    } else if (maxStock != null && stockQuantity > maxStock) {
      status = 'over'
    }

    const statusLabelMap = {
      out: 'Rupture',
      low: 'Stock faible',
      normal: 'Stock normal',
      over: 'Surstock',
    } as const

    return {
      id: row.id,
      name: row.name,
      sku: row.sku || null,
      categoryId: row.categoryId || null,
      price: Number(row.price || 0),
      stockQuantity,
      minStock,
      maxStock,
      status,
      statusLabel: statusLabelMap[status],
      category,
      unit: 'pièce',
      lastUpdate: row.lastUpdate || row.updatedAt,
      value: stockQuantity * Number(row.price || 0),
    }
  }
  
  /**
   * Synchroniser les données de stock entre les tables Product et Stock
   */
  static async syncStockData(companyId: string) {
    try {
      logger.info('Analyse de synchronisation unifiée en mode lecture seule', { companyId })

      const [summary] = await prisma.$queryRaw<Array<any>>`
        SELECT
          COUNT(p.id) AS "totalProducts",
          COUNT(s.id) AS "totalStocks",
          COUNT(p.id) FILTER (WHERE s.id IS NULL) AS "productsWithoutStock"
        FROM "Product" p
        LEFT JOIN "Stock" s
          ON s."productId" = p.id
         AND s."userId" = p."userId"
        WHERE p."userId" = ${companyId}
      `

      return {
        totalProducts: Number(summary?.totalProducts || 0),
        totalStocks: Number(summary?.totalStocks || 0),
        productsWithoutStock: Number(summary?.productsWithoutStock || 0),
        syncedCount: 0,
        createdCount: 0,
        success: true,
        mode: 'read-only'
      }

    } catch (error) {
      logger.error('Erreur lors de la synchronisation des stocks', { error, companyId })
      throw error
    }
  }
  
  /**
   * Obtenir les données de stock unifiées pour un produit
   */
  static async getUnifiedProductStock(productId: string, companyId: string) {
    try {
      const rows = await prisma.$queryRaw<Array<any>>`
        SELECT
          p.id,
          p.name,
          p.sku,
          p.price,
          p."minStock",
          p."maxStock",
          p."categoryId",
          p."updatedAt",
          c.name AS "categoryName",
          c.description AS "categoryDescription",
          c."createdAt" AS "categoryCreatedAt",
          c."updatedAt" AS "categoryUpdatedAt",
          COALESCE(s.quantity, 0) AS "stockQuantity",
          COALESCE(s."updatedAt", p."updatedAt") AS "lastUpdate"
        FROM "Product" p
        LEFT JOIN "Stock" s
          ON s."productId" = p.id
         AND s."userId" = p."userId"
        LEFT JOIN "Category" c
          ON c.id = p."categoryId"
         AND c."userId" = p."userId"
        WHERE p.id = ${productId}
          AND p."userId" = ${companyId}
        ORDER BY s."updatedAt" DESC NULLS LAST
        LIMIT 1
      `

      const product = rows[0]

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      return this.buildUnifiedProduct(product)
      
    } catch (error) {
      logger.error('Erreur lors de la récupération du stock unifié', { error, productId })
      throw error
    }
  }

  /**
   * Obtenir tous les produits avec leurs données de stock unifiées
   */
  static async getAllUnifiedProductsStock(companyId: string, filters?: {
    search?: string
    categoryId?: string
    status?: 'out' | 'low' | 'normal' | 'over'
  }) {
    try {
      const search = typeof filters?.search === 'string' ? filters.search.trim() : ''
      const searchCondition = search
        ? Prisma.sql`AND (p.name ILIKE ${`%${search}%`} OR COALESCE(p.sku, '') ILIKE ${`%${search}%`})`
        : Prisma.empty
      const categoryCondition = filters?.categoryId
        ? Prisma.sql`AND p."categoryId" = ${filters.categoryId}`
        : Prisma.empty

      const rows = await prisma.$queryRaw<Array<any>>`
        SELECT
          p.id,
          p.name,
          p.sku,
          p.price,
          p."minStock",
          p."maxStock",
          p."categoryId",
          p."updatedAt",
          c.name AS "categoryName",
          c.description AS "categoryDescription",
          c."createdAt" AS "categoryCreatedAt",
          c."updatedAt" AS "categoryUpdatedAt",
          COALESCE(s.quantity, 0) AS "stockQuantity",
          COALESCE(s."updatedAt", p."updatedAt") AS "lastUpdate"
        FROM "Product" p
        LEFT JOIN "Stock" s
          ON s."productId" = p.id
         AND s."userId" = p."userId"
        LEFT JOIN "Category" c
          ON c.id = p."categoryId"
         AND c."userId" = p."userId"
        WHERE p."userId" = ${companyId}
          ${searchCondition}
          ${categoryCondition}
        ORDER BY p.name ASC
      `

      const unifiedProducts = rows.map((row) => this.buildUnifiedProduct(row))

      if (filters?.status) {
        return unifiedProducts.filter((product) => product.status === filters.status)
      }

      return unifiedProducts

    } catch (error) {
      logger.error('Erreur lors de la récupération des stocks unifiés', { error, companyId })
      throw error
    }
  }

  /**
   * Mettre à jour le stock d'un produit de manière unifiée
   */
  static async updateUnifiedStock(
    productId: string,
    companyId: string,
    data: {
      stockQuantity?: number
      minStock?: number
      maxStock?: number
    }
  ) {
    try {
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: productId, userId: companyId },
          select: { id: true },
        })

        if (!product) {
          throw new Error('Produit non trouvé')
        }

        const productClauses: Prisma.Sql[] = []
        if (data.minStock !== undefined) {
          productClauses.push(Prisma.sql`"minStock" = ${Math.max(0, Number(data.minStock))}`)
        }
        if (data.maxStock !== undefined) {
          productClauses.push(Prisma.sql`"maxStock" = ${data.maxStock == null ? null : Math.max(0, Number(data.maxStock))}`)
        }

        if (productClauses.length > 0) {
          await tx.$executeRaw(Prisma.sql`
            UPDATE "Product"
            SET ${Prisma.join(productClauses, Prisma.sql`, `)},
                "updatedAt" = CURRENT_TIMESTAMP
            WHERE id = ${productId}
              AND "userId" = ${companyId}
          `)
        }

        if (data.stockQuantity !== undefined) {
          const stockRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT id
            FROM "Stock"
            WHERE "productId" = ${productId}
              AND "userId" = ${companyId}
            ORDER BY "updatedAt" DESC
            LIMIT 1
          `

          const stockQuantity = Math.max(0, Number(data.stockQuantity))

          if (stockRows[0]?.id) {
            await tx.stock.update({
              where: { id: stockRows[0].id },
              data: { quantity: stockQuantity },
            })
          } else {
            await tx.stock.create({
              data: {
                quantity: stockQuantity,
                productId,
                userId: companyId,
              },
            })
          }
        }
      })

      logger.info('Stock unifié mis à jour', { productId, data, companyId })
      return await this.getUnifiedProductStock(productId, companyId)

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du stock unifié', { error, productId })
      throw error
    }
  }

  /**
   * Obtenir le libellé du statut
   */
  private static getStatusLabel(status: string): string {
    switch (status) {
      case 'out': return 'Rupture'
      case 'low': return 'Stock faible'
      case 'over': return 'Surstock'
      case 'normal': return 'Normal'
      default: return 'Inconnu'
    }
  }

  /**
   * Traiter une vente avec mise à jour unifiée
   */
  static async processSale(
    productId: string,
    quantity: number,
    companyId: string,
    invoiceId?: string,
    userId?: string
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
        include: { stock: true }
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      if (product.isService) {
        throw new Error('Impossible de gérer le stock d\'un service')
      }

      const currentStock = product.stock?.quantiteActuelle ?? product.stockQuantity
      const newStock = currentStock - quantity

      if (newStock < 0) {
        throw new Error('Stock insuffisant pour cette vente')
      }

      // Enregistrer l'audit
      await StockAuditService.logStockMovement({
        productId,
        companyId,
        movementType: 'OUT',
        quantity,
        oldStock: currentStock,
        newStock,
        reference: invoiceId ? `Vente facture ${invoiceId}` : 'Vente directe',
        userId
      })

      // Mettre à jour de manière unifiée
      await this.updateUnifiedStock(productId, companyId, {
        stockQuantity: newStock
      })

      logger.info('Vente traitée avec succès', {
        productId,
        quantity,
        oldStock: currentStock,
        newStock,
        invoiceId
      })

      return await this.getUnifiedProductStock(productId, companyId)

    } catch (error) {
      logger.error('Erreur lors du traitement de la vente', { error, productId, quantity })
      throw error
    }
  }

  /**
   * Traiter un achat avec mise à jour unifiée
   */
  static async processPurchase(
    productId: string,
    quantity: number,
    unitCost: number,
    companyId: string,
    orderId?: string,
    userId?: string
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
        include: { stock: true }
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      if (product.isService) {
        throw new Error('Impossible de gérer le stock d\'un service')
      }

      const currentStock = product.stock?.quantiteActuelle ?? product.stockQuantity
      const newStock = currentStock + quantity

      // Enregistrer l'audit
      await StockAuditService.logStockMovement({
        productId,
        companyId,
        movementType: 'IN',
        quantity,
        oldStock: currentStock,
        newStock,
        reference: orderId ? `Achat commande ${orderId}` : 'Achat direct',
        userId
      })

      // Mettre à jour de manière unifiée
      await this.updateUnifiedStock(productId, companyId, {
        stockQuantity: newStock
      })

      logger.info('Achat traité avec succès', {
        productId,
        quantity,
        unitCost,
        oldStock: currentStock,
        newStock,
        orderId
      })

      return await this.getUnifiedProductStock(productId, companyId)

    } catch (error) {
      logger.error('Erreur lors du traitement de l\'achat', { error, productId, quantity })
      throw error
    }
  }

  /**
   * Réserver du stock pour une commande
   */
  static async reserveStock(
    productId: string,
    quantity: number,
    companyId: string,
    orderId?: string,
    userId?: string
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: { id: productId, companyId },
        include: { stock: true }
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      if (product.isService) {
        throw new Error('Impossible de réserver le stock d\'un service')
      }

      const currentStock = product.stock?.quantiteActuelle ?? product.stockQuantity
      const currentReserved = product.stock?.quantiteReservee ?? 0

      if (currentStock - currentReserved < quantity) {
        throw new Error('Stock disponible insuffisant pour cette réservation')
      }

      // Mettre à jour la réservation dans la table Stock
      if (product.stock) {
        await prisma.stock.update({
          where: { id: product.stock.id },
          data: {
            quantiteReservee: currentReserved + quantity,
            quantiteDisponible: currentStock - (currentReserved + quantity),
            dateLastUpdate: new Date()
          }
        })
      }

      // Enregistrer l'audit
      await StockAuditService.logStockChange({
        productId,
        companyId,
        action: 'UPDATE',
        oldValues: { reservedStock: currentReserved },
        newValues: { reservedStock: currentReserved + quantity },
        source: 'API',
        userId,
        metadata: {
          operation: 'stock_reservation',
          orderId,
          quantity
        }
      })

      logger.info('Stock réservé avec succès', {
        productId,
        quantity,
        oldReserved: currentReserved,
        newReserved: currentReserved + quantity,
        orderId
      })

      return await this.getUnifiedProductStock(productId, companyId)

    } catch (error) {
      logger.error('Erreur lors de la réservation de stock', { error, productId, quantity })
      throw error
    }
  }
}
