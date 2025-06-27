import { prisma, Prisma, StockMovement, StockMovementType, Product, MovementStatus } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { StockAlertService } from './stock-alert.service'

// Type temporaire pour Stock - sera remplacé par le type Prisma généré
type Stock = {
  id: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale?: number | null
  dateLastUpdate: Date
  productId: string
  companyId: string
  createdAt: Date
  updatedAt: Date
  product?: Product & {
    category?: {
      id: string
      name: string
    } | null
  }
}

export interface CreateStockMovementData {
  type: StockMovementType
  quantity: number
  unitCost?: number
  reference?: string
  comment?: string
  productId: string
  userId?: string
  orderId?: string
  invoiceId?: string
  batchNumber?: string
  expiryDate?: Date
  status?: MovementStatus
}

export interface StockMovementFilters {
  productId?: string
  type?: StockMovementType
  startDate?: Date
  endDate?: Date
  reference?: string
}

export interface StockAdjustmentData {
  productId: string
  newQuantity: number
  comment?: string
}

export interface CreateStockData {
  productId: string
  quantiteActuelle: number
  quantiteMinimale: number
  quantiteMaximale?: number
}

export interface UpdateStockData extends Partial<CreateStockData> {}

export interface StockFilters {
  search?: string
  productId?: string
  lowStock?: boolean
  outOfStock?: boolean
  categoryId?: string
}

export class StockService {
  /**
   * Créer un mouvement de stock avec suivi temps réel
   */
  static async createStockMovement(
    data: CreateStockMovementData,
    companyId: string
  ): Promise<StockMovement> {
    try {
      logger.info('Création d\'un mouvement de stock', {
        companyId,
        productId: data.productId,
        type: data.type,
        quantity: data.quantity
      })

      // Vérifier que le produit existe et appartient à l'entreprise
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId,
        },
        include: {
          stock: true,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier que ce n'est pas un service
      if (product.isService) {
        throw new Error('Impossible de gérer le stock d\'un service')
      }

      const currentStock = product.stockQuantity
      let newStockQuantity = currentStock
      let newReservedQuantity = product.stock?.quantiteReservee || 0
      let newInTransitQuantity = product.stock?.quantiteEnTransit || 0

      // Calculer les nouvelles quantités selon le type de mouvement
      switch (data.type) {
        case 'IN':
          newStockQuantity += data.quantity
          break
        case 'OUT':
          newStockQuantity -= data.quantity
          if (newStockQuantity < 0) {
            throw new Error('Stock insuffisant pour cette sortie')
          }
          break
        case 'ADJUSTMENT':
          // Pour les ajustements, la quantité représente la différence
          newStockQuantity += data.quantity
          if (newStockQuantity < 0) {
            throw new Error('L\'ajustement résulterait en un stock négatif')
          }
          break
        case 'RESERVATION':
          if (data.quantity > (newStockQuantity - newReservedQuantity)) {
            throw new Error('Stock disponible insuffisant pour cette réservation')
          }
          newReservedQuantity += data.quantity
          break
        case 'RELEASE':
          newReservedQuantity = Math.max(0, newReservedQuantity - data.quantity)
          break
        case 'TRANSFER':
          // Pour les transferts, on sort du stock actuel et on met en transit
          newStockQuantity -= data.quantity
          newInTransitQuantity += data.quantity
          if (newStockQuantity < 0) {
            throw new Error('Stock insuffisant pour ce transfert')
          }
          break
        case 'RETURN':
          newStockQuantity += data.quantity
          break
        case 'LOSS':
          newStockQuantity -= data.quantity
          if (newStockQuantity < 0) {
            throw new Error('Stock insuffisant pour enregistrer cette perte')
          }
          break
        case 'PRODUCTION':
          newStockQuantity += data.quantity
          break
      }

      const newAvailableQuantity = newStockQuantity - newReservedQuantity

      // Transaction pour créer le mouvement et mettre à jour les stocks
      const result = await prisma.$transaction(async (tx) => {
        // Créer le mouvement de stock avec traçabilité complète
        const movementData: any = {
          type: data.type,
          quantity: data.quantity,
          unitCost: data.unitCost || product.cost,
          reference: data.reference,
          comment: data.comment,
          productId: data.productId,
          companyId: companyId,
          quantityBefore: currentStock,
          quantityAfter: newStockQuantity,
          totalCost: data.unitCost ? data.unitCost * data.quantity : (product.cost || 0) * data.quantity,
          status: data.status || 'CONFIRMED',
          orderId: data.orderId,
          invoiceId: data.invoiceId,
        }

        // Ne pas inclure userId s'il n'est pas fourni ou invalide
        if (data.userId) {
          // Vérifier que l'utilisateur existe
          const userExists = await tx.user.findUnique({
            where: { id: data.userId },
            select: { id: true }
          })
          if (userExists) {
            movementData.userId = data.userId
          }
        }

        const movement = await tx.stockMovement.create({
          data: movementData,
        })

        // Mettre à jour la quantité en stock du produit
        await tx.product.update({
          where: { id: data.productId },
          data: { stockQuantity: newStockQuantity },
        })

        // Créer ou mettre à jour l'enregistrement stock
        if (product.stock) {
          await tx.stock.update({
            where: { id: product.stock.id },
            data: {
              quantiteActuelle: newStockQuantity,
              quantiteReservee: newReservedQuantity,
              quantiteEnTransit: newInTransitQuantity,
              quantiteDisponible: newAvailableQuantity,
              dateLastUpdate: new Date(),
              valeurStock: (product.cost || 0) * newStockQuantity,
              coutMoyenPondere: product.cost,
            },
          })
        } else {
          await tx.stock.create({
            data: {
              productId: data.productId,
              companyId,
              quantiteActuelle: newStockQuantity,
              quantiteReservee: newReservedQuantity,
              quantiteEnTransit: newInTransitQuantity,
              quantiteDisponible: newAvailableQuantity,
              quantiteMinimale: product.minStock,
              quantiteMaximale: product.maxStock,
              dateLastUpdate: new Date(),
              valeurStock: (product.cost || 0) * newStockQuantity,
              coutMoyenPondere: product.cost,
            },
          })
        }

        return movement
      })

      // Vérifier et créer automatiquement les alertes de stock
      try {
        logger.info('Vérification des alertes après mouvement de stock', {
          productId: data.productId,
          newStockQuantity,
          movementType: data.type
        })
        await StockAlertService.checkAndCreateAlerts(companyId)
        logger.info('Vérification des alertes terminée')
      } catch (alertError) {
        logger.warn('Erreur lors de la vérification des alertes', { alertError })
        // Ne pas faire échouer la transaction pour les alertes
      }

      logger.info('Mouvement de stock créé avec succès', {
        movementId: result.id,
        newStockQuantity,
        newAvailableQuantity
      })

      return result
    } catch (error) {
      logger.error('Erreur lors de la création du mouvement de stock', { error, data })
      throw error
    }
  }

  /**
   * Récupérer les mouvements de stock avec pagination et filtres
   */
  static async getStockMovements(
    companyId: string,
    filters: StockMovementFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginationResponse<StockMovement & { product: Product }>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination

      const { productId, type, startDate, endDate, reference } = filters

      // Construction de la clause WHERE
      const where: Prisma.StockMovementWhereInput = {
        product: {
          companyId,
        },
        ...(productId && { productId }),
        ...(type && { type }),
        ...(reference && { reference: { contains: reference, mode: 'insensitive' } }),
        ...(startDate || endDate) && {
          createdAt: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        },
      }

      // Calcul de l'offset
      const skip = (page - 1) * limit

      // Requêtes parallèles pour les données et le count
      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        }),
        prisma.stockMovement.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: movements,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des mouvements de stock', { error, filters })
      throw error
    }
  }

  /**
   * Récupérer l'historique des mouvements pour un produit
   */
  static async getProductStockHistory(
    productId: string,
    companyId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginationResponse<StockMovement>> {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination

      const skip = (page - 1) * limit

      const [movements, total] = await Promise.all([
        prisma.stockMovement.findMany({
          where: { productId },
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.stockMovement.count({ where: { productId } }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: movements,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique du stock', { error, productId })
      throw error
    }
  }

  /**
   * Effectuer un ajustement de stock
   */
  static async adjustStock(
    data: StockAdjustmentData,
    companyId: string
  ): Promise<StockMovement> {
    try {
      logger.info('Ajustement de stock', { 
        companyId, 
        productId: data.productId, 
        newQuantity: data.newQuantity 
      })

      // Vérifier que le produit existe et appartient à l'entreprise
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      if (product.isService) {
        throw new Error('Impossible d\'ajuster le stock d\'un service')
      }

      if (data.newQuantity < 0) {
        throw new Error('La nouvelle quantité ne peut pas être négative')
      }

      // Calculer la différence
      const difference = data.newQuantity - product.stockQuantity

      if (difference === 0) {
        throw new Error('Aucun ajustement nécessaire, la quantité est déjà correcte')
      }

      // Créer le mouvement d'ajustement
      const movementData: CreateStockMovementData = {
        type: 'ADJUSTMENT',
        quantity: difference,
        unitCost: product.cost,
        reference: 'ADJUSTMENT',
        comment: data.comment || `Ajustement de stock: ${product.stockQuantity} → ${data.newQuantity}`,
        productId: data.productId,
      }

      const movement = await this.createStockMovement(movementData, companyId)

      logger.info('Ajustement de stock effectué avec succès', { 
        movementId: movement.id,
        difference,
        newQuantity: data.newQuantity 
      })

      return movement
    } catch (error) {
      logger.error('Erreur lors de l\'ajustement de stock', { error, data })
      throw error
    }
  }

  /**
   * Obtenir les statistiques de stock
   */
  static async getStockStats(companyId: string) {
    try {
      const [
        totalProducts,
        productsInStock,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue,
        recentMovements,
      ] = await Promise.all([
        // Total des produits (hors services)
        prisma.product.count({
          where: {
            companyId,
            isService: false,
          },
        }),
        // Produits en stock
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            stockQuantity: { gt: 0 },
          },
        }),
        // Produits en rupture (stock <= seuil minimum)
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            stockQuantity: { lte: prisma.product.fields.minStock },
          },
        }),
        // Produits en rupture totale
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            stockQuantity: 0,
          },
        }),
        // Valeur totale du stock
        prisma.product.aggregate({
          where: {
            companyId,
            isService: false,
            cost: { not: null },
          },
          _sum: {
            stockQuantity: true,
          },
        }),
        // Mouvements récents (7 derniers jours)
        prisma.stockMovement.count({
          where: {
            product: { companyId },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ])

      return {
        totalProducts,
        productsInStock,
        lowStockProducts,
        outOfStockProducts,
        totalStockQuantity: totalStockValue._sum.stockQuantity || 0,
        recentMovements,
      }
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques de stock', { error })
      throw error
    }
  }

  /**
   * Obtenir les alertes de stock
   */
  static async getStockAlerts(companyId: string) {
    try {
      // Utiliser des requêtes SQL brutes pour comparer stockQuantity avec minStock
      const [lowStockProductsRaw, outOfStockProducts] = await Promise.all([
        // Produits avec stock faible - requête SQL brute
        prisma.$queryRaw`
          SELECT p.*, c.name as category_name, c.id as category_id
          FROM products p
          LEFT JOIN categories c ON p."categoryId" = c.id
          WHERE p."companyId" = ${companyId}
            AND p."isActive" = true
            AND p."isService" = false
            AND p."stockQuantity" > 0
            AND p."stockQuantity" <= p."minStock"
          ORDER BY p."stockQuantity" ASC
        `,
        // Produits en rupture - requête normale
        prisma.product.findMany({
          where: {
            companyId,
            isService: false,
            isActive: true,
            stockQuantity: 0,
          },
          include: {
            category: true,
          },
          orderBy: {
            name: 'asc',
          },
        }),
      ])

      // Transformer les résultats de la requête SQL brute
      const lowStockProducts = (lowStockProductsRaw as any[]).map((product: any) => ({
        ...product,
        category: product.category_id ? {
          id: product.category_id,
          name: product.category_name
        } : null
      }))

      console.log('🔍 Debug StockAlerts:', {
        companyId,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockProducts: lowStockProducts.map(p => ({
          name: p.name,
          stockQuantity: p.stockQuantity,
          minStock: p.minStock
        }))
      })

      return {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        totalAlerts: lowStockProducts.length + outOfStockProducts.length,
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des alertes de stock', { error })
      throw error
    }
  }

  /**
   * Créer un nouveau stock pour un produit
   */
  static async createStock(
    data: CreateStockData,
    companyId: string
  ): Promise<Stock> {
    try {
      logger.info('Création d\'un nouveau stock', { companyId, productId: data.productId })

      // Vérifier que le produit existe et appartient à l'entreprise
      const product = await prisma.product.findFirst({
        where: {
          id: data.productId,
          companyId,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier qu'un stock n'existe pas déjà pour ce produit
      const existingStock = await prisma.stock.findUnique({
        where: { productId: data.productId },
      })

      if (existingStock) {
        throw new Error('Un stock existe déjà pour ce produit')
      }

      const stock = await prisma.stock.create({
        data: {
          ...data,
          companyId,
          dateLastUpdate: new Date(),
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      // Créer un mouvement de stock initial si la quantité > 0
      if (data.quantiteActuelle > 0) {
        await prisma.stockMovement.create({
          data: {
            type: 'IN',
            quantity: data.quantiteActuelle,
            reference: 'Stock initial',
            comment: 'Stock initial lors de la création',
            productId: data.productId,
          },
        })
      }

      logger.info('Stock créé avec succès', { stockId: stock.id, productId: data.productId })
      return stock
    } catch (error: any) {
      logger.error('Erreur lors de la création du stock', { error: error.message, data })
      throw error
    }
  }

  /**
   * Récupérer tous les stocks avec pagination et filtres
   */
  static async getStocks(
    companyId: string,
    filters: StockFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginationResponse<Stock>> {
    try {
      const { page = 1, limit = 20 } = pagination
      const offset = (page - 1) * limit

      // Construction des filtres de base
      let where: any = {
        companyId,
        ...(filters.productId && { productId: filters.productId }),
        ...(filters.outOfStock && { quantiteActuelle: 0 }),
        ...(filters.search && {
          product: {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { sku: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        }),
        ...(filters.categoryId && {
          product: { categoryId: filters.categoryId },
        }),
      }

      // Pour le filtre lowStock, nous devons faire une requête spéciale
      let stocks: any[]
      let total: number

      if (filters.lowStock) {
        // Requête SQL brute pour comparer quantiteActuelle <= quantiteMinimale
        const stocksRaw = await prisma.$queryRaw`
          SELECT s.*, p.name as product_name, p.sku as product_sku, p.price as product_price, p.unit as product_unit,
                 c.name as category_name, c.id as category_id
          FROM stocks s
          LEFT JOIN products p ON s."productId" = p.id
          LEFT JOIN categories c ON p."categoryId" = c.id
          WHERE s."companyId" = ${companyId}
            AND s."quantiteActuelle" <= s."quantiteMinimale"
          ORDER BY s."dateLastUpdate" DESC
          LIMIT ${limit} OFFSET ${offset}
        `

        const totalRaw = await prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM stocks s
          WHERE s."companyId" = ${companyId}
            AND s."quantiteActuelle" <= s."quantiteMinimale"
        `

        stocks = (stocksRaw as any[]).map((stock: any) => ({
          ...stock,
          product: {
            id: stock.productId,
            name: stock.product_name,
            sku: stock.product_sku,
            price: stock.product_price,
            unit: stock.product_unit,
            category: stock.category_id ? {
              id: stock.category_id,
              name: stock.category_name
            } : null
          }
        }))

        total = Number((totalRaw as any[])[0]?.count || 0)
      } else {
        // Requête normale avec Prisma
        const [stocksResult, totalResult] = await Promise.all([
          prisma.stock.findMany({
            where,
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
            orderBy: { dateLastUpdate: 'desc' },
            skip: offset,
            take: limit,
          }),
          prisma.stock.count({ where }),
        ])

        stocks = stocksResult
        total = totalResult
      }

      return {
        data: stocks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des stocks', { error: error.message, filters })
      throw error
    }
  }

  /**
   * Récupérer un stock par ID
   */
  static async getStockById(id: string, companyId: string): Promise<Stock | null> {
    try {
      const stock = await prisma.stock.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      return stock
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du stock', { error: error.message, id })
      throw error
    }
  }

  /**
   * Récupérer un stock par productId
   */
  static async getStockByProductId(productId: string, companyId: string): Promise<Stock | null> {
    try {
      const stock = await prisma.stock.findFirst({
        where: {
          productId,
          companyId,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      return stock
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du stock par produit', { error: error.message, productId })
      throw error
    }
  }

  /**
   * Mettre à jour un stock
   */
  static async updateStock(
    id: string,
    data: UpdateStockData,
    companyId: string
  ): Promise<Stock> {
    try {
      logger.info('Mise à jour du stock', { stockId: id, companyId })

      // Vérifier que le stock existe et appartient à l'entreprise
      const existingStock = await this.getStockById(id, companyId)
      if (!existingStock) {
        throw new Error('Stock non trouvé')
      }

      const stock = await prisma.stock.update({
        where: { id },
        data: {
          ...data,
          dateLastUpdate: new Date(),
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      })

      logger.info('Stock mis à jour avec succès', { stockId: id })
      return stock
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du stock', { error: error.message, id, data })
      throw error
    }
  }

  /**
   * Supprimer un stock
   */
  static async deleteStock(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression du stock', { stockId: id, companyId })

      // Vérifier que le stock existe et appartient à l'entreprise
      const existingStock = await this.getStockById(id, companyId)
      if (!existingStock) {
        throw new Error('Stock non trouvé')
      }

      await prisma.stock.delete({
        where: { id },
      })

      logger.info('Stock supprimé avec succès', { stockId: id })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression du stock', { error: error.message, id })
      throw error
    }
  }

  /**
   * Synchroniser les données entre tables products et stocks
   */
  static async syncProductsStocks(companyId: string) {
    try {
      logger.info('Début de la synchronisation products ↔ stocks', { companyId })

      // 1. Analyser l'état actuel
      const [totalProducts, activeProducts, totalStocks, productsWithoutStock] = await Promise.all([
        prisma.product.count({ where: { companyId } }),
        prisma.product.count({ where: { companyId, isActive: true, isService: false } }),
        prisma.stock.count({ where: { companyId } }),
        prisma.product.count({ where: { companyId, stock: null } })
      ])

      // 2. Créer les enregistrements stock manquants
      let createdCount = 0
      if (productsWithoutStock > 0) {
        const productsNeedingStock = await prisma.product.findMany({
          where: {
            companyId,
            stock: null
          },
          select: {
            id: true,
            name: true,
            stockQuantity: true,
            minStock: true,
            maxStock: true
          }
        })

        for (const product of productsNeedingStock) {
          try {
            await prisma.stock.create({
              data: {
                quantiteActuelle: product.stockQuantity || 0,
                quantiteMinimale: product.minStock || 0,
                quantiteMaximale: product.maxStock || 100,
                productId: product.id,
                companyId,
                dateLastUpdate: new Date()
              }
            })
            createdCount++
          } catch (error) {
            logger.warn('Erreur création stock', { productId: product.id, error })
          }
        }
      }

      // 3. Synchroniser les données existantes
      const productsWithStock = await prisma.product.findMany({
        where: {
          companyId,
          stock: { isNot: null }
        },
        include: {
          stock: true
        }
      })

      let syncedCount = 0
      for (const product of productsWithStock) {
        const needsUpdate =
          product.stock!.quantiteActuelle !== product.stockQuantity ||
          product.stock!.quantiteMinimale !== product.minStock ||
          product.stock!.quantiteMaximale !== product.maxStock

        if (needsUpdate) {
          await prisma.stock.update({
            where: { id: product.stock!.id },
            data: {
              quantiteActuelle: product.stockQuantity,
              quantiteMinimale: product.minStock,
              quantiteMaximale: product.maxStock,
              dateLastUpdate: new Date()
            }
          })
          syncedCount++
        }
      }

      // 4. Créer des données de test pour les alertes
      const testProducts = [
        {
          name: 'ALERTE TEST - Rupture Stock',
          sku: 'ALERT-RUPTURE-001',
          description: 'Produit de test en rupture de stock',
          price: 100.00,
          cost: 80.00,
          stockQuantity: 0,
          minStock: 5,
          maxStock: 50,
          unit: 'pièce'
        },
        {
          name: 'ALERTE TEST - Stock Faible',
          sku: 'ALERT-FAIBLE-001',
          description: 'Produit de test avec stock faible',
          price: 150.00,
          cost: 120.00,
          stockQuantity: 2,
          minStock: 10,
          maxStock: 100,
          unit: 'pièce'
        }
      ]

      let testCreatedCount = 0
      for (const testData of testProducts) {
        try {
          let product = await prisma.product.findFirst({
            where: { sku: testData.sku, companyId },
            include: { stock: true }
          })

          if (!product) {
            product = await prisma.product.create({
              data: {
                ...testData,
                isActive: true,
                isService: false,
                companyId
              },
              include: { stock: true }
            })
          } else {
            product = await prisma.product.update({
              where: { id: product.id },
              data: {
                stockQuantity: testData.stockQuantity,
                minStock: testData.minStock,
                maxStock: testData.maxStock
              },
              include: { stock: true }
            })
          }

          if (!product.stock) {
            await prisma.stock.create({
              data: {
                quantiteActuelle: testData.stockQuantity,
                quantiteMinimale: testData.minStock,
                quantiteMaximale: testData.maxStock,
                productId: product.id,
                companyId,
                dateLastUpdate: new Date()
              }
            })
          } else {
            await prisma.stock.update({
              where: { id: product.stock.id },
              data: {
                quantiteActuelle: testData.stockQuantity,
                quantiteMinimale: testData.minStock,
                quantiteMaximale: testData.maxStock,
                dateLastUpdate: new Date()
              }
            })
          }
          testCreatedCount++
        } catch (error) {
          logger.warn('Erreur création produit test', { sku: testData.sku, error })
        }
      }

      // 5. Vérifier les alertes après synchronisation
      const alerts = await this.getStockAlerts(companyId)

      const result = {
        stats: {
          totalProducts,
          activeProducts,
          totalStocks,
          productsWithoutStock
        },
        actions: {
          stocksCreated: createdCount,
          stocksSynced: syncedCount,
          testProductsCreated: testCreatedCount
        },
        alerts: {
          outOfStock: alerts.outOfStock.length,
          lowStock: alerts.lowStock.length,
          totalAlerts: alerts.totalAlerts
        }
      }

      logger.info('Synchronisation terminée', result)
      return result

    } catch (error) {
      logger.error('Erreur lors de la synchronisation', { error })
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
  ): Promise<StockMovement> {
    return await this.createStockMovement({
      type: 'RESERVATION',
      quantity,
      productId,
      orderId,
      userId,
      reference: orderId ? `Réservation commande ${orderId}` : 'Réservation manuelle',
      comment: `Réservation de ${quantity} unités`,
    }, companyId)
  }

  /**
   * Libérer une réservation de stock
   */
  static async releaseReservation(
    productId: string,
    quantity: number,
    companyId: string,
    orderId?: string,
    userId?: string
  ): Promise<StockMovement> {
    return await this.createStockMovement({
      type: 'RELEASE',
      quantity,
      productId,
      orderId,
      userId,
      reference: orderId ? `Libération commande ${orderId}` : 'Libération manuelle',
      comment: `Libération de ${quantity} unités`,
    }, companyId)
  }

  /**
   * Traiter une vente (sortie de stock automatique)
   */
  static async processSale(
    productId: string,
    quantity: number,
    companyId: string,
    invoiceId?: string,
    userId?: string
  ): Promise<StockMovement> {
    return await this.createStockMovement({
      type: 'OUT',
      quantity,
      productId,
      invoiceId,
      userId,
      reference: invoiceId ? `Vente facture ${invoiceId}` : 'Vente directe',
      comment: `Vente de ${quantity} unités`,
    }, companyId)
  }

  /**
   * Traiter un retour client
   */
  static async processReturn(
    productId: string,
    quantity: number,
    companyId: string,
    invoiceId?: string,
    userId?: string,
    comment?: string
  ): Promise<StockMovement> {
    return await this.createStockMovement({
      type: 'RETURN',
      quantity,
      productId,
      invoiceId,
      userId,
      reference: invoiceId ? `Retour facture ${invoiceId}` : 'Retour client',
      comment: comment || `Retour client de ${quantity} unités`,
    }, companyId)
  }

  /**
   * Traiter une réception fournisseur
   */
  static async processSupplierDelivery(
    productId: string,
    quantity: number,
    unitCost: number,
    companyId: string,
    orderId?: string,
    userId?: string,
    batchNumber?: string,
    expiryDate?: Date
  ): Promise<StockMovement> {
    return await this.createStockMovement({
      type: 'IN',
      quantity,
      unitCost,
      productId,
      orderId,
      userId,
      batchNumber,
      expiryDate,
      reference: orderId ? `Réception commande ${orderId}` : 'Réception fournisseur',
      comment: `Réception de ${quantity} unités à ${unitCost} DA`,
    }, companyId)
  }

  /**
   * Obtenir le stock en temps réel d'un produit
   */
  static async getRealTimeStock(productId: string, companyId: string) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId,
        },
        include: {
          stock: true,
          category: true,
        },
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      if (product.isService) {
        return {
          productId,
          productName: product.name,
          isService: true,
          message: 'Les services n\'ont pas de stock',
        }
      }

      const stock = product.stock
      const currentStock = product.stockQuantity
      const reservedStock = stock?.quantiteReservee || 0
      const inTransitStock = stock?.quantiteEnTransit || 0
      const availableStock = currentStock - reservedStock

      return {
        productId,
        productName: product.name,
        sku: product.sku,
        category: product.category?.name,
        currentStock,
        reservedStock,
        inTransitStock,
        availableStock,
        minStock: product.minStock,
        maxStock: product.maxStock,
        stockValue: stock?.valeurStock || 0,
        averageCost: stock?.coutMoyenPondere || product.cost,
        lastUpdate: stock?.dateLastUpdate || product.updatedAt,
        alerts: {
          isOutOfStock: currentStock === 0,
          isLowStock: currentStock <= product.minStock && product.minStock > 0,
          isOverStock: product.maxStock ? currentStock > product.maxStock : false,
          isNegativeStock: currentStock < 0,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération du stock temps réel', { error, productId })
      throw error
    }
  }

  /**
   * Obtenir un tableau de bord temps réel des stocks
   */
  static async getRealTimeDashboard(companyId: string) {
    try {
      const [
        totalProducts,
        productsInStock,
        lowStockProducts,
        outOfStockProducts,
        overStockProducts,
        totalStockValue,
        recentMovements,
        activeAlerts,
      ] = await Promise.all([
        // Total des produits physiques
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            isActive: true,
          },
        }),
        // Produits en stock
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            isActive: true,
            stockQuantity: { gt: 0 },
          },
        }),
        // Produits en stock faible
        prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM products p
          WHERE p."companyId" = ${companyId}
            AND p."isActive" = true
            AND p."isService" = false
            AND p."stockQuantity" > 0
            AND p."stockQuantity" <= p."minStock"
            AND p."minStock" > 0
        `,
        // Produits en rupture
        prisma.product.count({
          where: {
            companyId,
            isService: false,
            isActive: true,
            stockQuantity: 0,
          },
        }),
        // Produits en surstock
        prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM products p
          WHERE p."companyId" = ${companyId}
            AND p."isActive" = true
            AND p."isService" = false
            AND p."maxStock" IS NOT NULL
            AND p."stockQuantity" > p."maxStock"
        `,
        // Valeur totale du stock
        prisma.stock.aggregate({
          where: {
            companyId,
          },
          _sum: {
            valeurStock: true,
          },
        }),
        // Mouvements récents (24 dernières heures)
        prisma.stockMovement.count({
          where: {
            companyId,
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Alertes actives
        prisma.stockAlert.count({
          where: {
            companyId,
            isActive: true,
          },
        }),
      ])

      const lowStockCount = Number((lowStockProducts as any[])[0]?.count || 0)
      const overStockCount = Number((overStockProducts as any[])[0]?.count || 0)

      return {
        overview: {
          totalProducts,
          productsInStock,
          lowStockProducts: lowStockCount,
          outOfStockProducts,
          overStockProducts: overStockCount,
          totalStockValue: totalStockValue._sum.valeurStock || 0,
        },
        activity: {
          recentMovements,
          activeAlerts,
        },
        alerts: await this.getAlertsCounts(companyId),
        lastUpdate: new Date(),
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération du tableau de bord temps réel', { error })
      throw error
    }
  }

  /**
   * Obtenir les comptages d'alertes par sévérité réelle
   */
  private static async getAlertsCounts(companyId: string) {
    try {
      // Compter les alertes par sévérité depuis la table stock_alerts
      const alertsBySeverity = await prisma.stockAlert.groupBy({
        by: ['severity'],
        where: {
          companyId,
          isActive: true,
        },
        _count: {
          id: true,
        },
      })

      // Mapper les sévérités aux compteurs
      const severityMap = alertsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.id
        return acc
      }, {} as Record<string, number>)

      const critical = (severityMap.HIGH || 0) + (severityMap.CRITICAL || 0)
      const warning = (severityMap.MEDIUM || 0) + (severityMap.WARNING || 0)
      const info = (severityMap.LOW || 0) + (severityMap.INFO || 0)

      logger.info('Comptage des alertes par sévérité', {
        companyId,
        alertsBySeverity: severityMap,
        critical,
        warning,
        info,
        total: critical + warning + info
      })

      return {
        critical,
        warning,
        info,
      }
    } catch (error) {
      logger.error('Erreur lors du comptage des alertes', { error, companyId })
      return {
        critical: 0,
        warning: 0,
        info: 0,
      }
    }
  }

  /**
   * Unification complète des données products et stocks
   * Utilise la table stocks comme source de vérité unique
   */
  static async unifyStockData(companyId: string) {
    try {
      logger.info('Début de l\'unification des données stocks', { companyId })

      // 1. Analyser l'état actuel détaillé
      const physicalProducts = await prisma.product.findMany({
        where: {
          companyId,
          isService: false
        },
        include: { stock: true }
      })

      const stats = {
        totalPhysicalProducts: physicalProducts.length,
        productsWithStock: physicalProducts.filter(p => p.stock).length,
        productsWithoutStock: physicalProducts.filter(p => !p.stock).length,
        inconsistentData: 0,
        correctedProducts: 0,
        createdStocks: 0
      }

      // 2. Créer les entrées stock manquantes
      const productsWithoutStock = physicalProducts.filter(p => !p.stock)

      for (const product of productsWithoutStock) {
        await prisma.stock.create({
          data: {
            productId: product.id,
            companyId: product.companyId,
            quantiteActuelle: product.stockQuantity,
            quantiteMinimale: product.minStock,
            quantiteMaximale: product.maxStock,
            dateLastUpdate: new Date()
          }
        })
        stats.createdStocks++
        logger.debug('Stock créé pour produit', { productId: product.id, productName: product.name })
      }

      // 3. Identifier et corriger les incohérences
      const productsWithStock = physicalProducts.filter(p => p.stock)

      for (const product of productsWithStock) {
        const stock = product.stock!
        const needsUpdate =
          stock.quantiteActuelle !== product.stockQuantity ||
          stock.quantiteMinimale !== product.minStock ||
          stock.quantiteMaximale !== product.maxStock

        if (needsUpdate) {
          stats.inconsistentData++

          // Utiliser les données de la table products comme référence
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              quantiteActuelle: product.stockQuantity,
              quantiteMinimale: product.minStock,
              quantiteMaximale: product.maxStock,
              dateLastUpdate: new Date()
            }
          })
          stats.correctedProducts++

          logger.debug('Données synchronisées', {
            productId: product.id,
            productName: product.name,
            changes: {
              quantite: `${stock.quantiteActuelle} → ${product.stockQuantity}`,
              min: `${stock.quantiteMinimale} → ${product.minStock}`,
              max: `${stock.quantiteMaximale} → ${product.maxStock}`
            }
          })
        }
      }

      // 4. Vérifier les alertes après unification
      const alerts = await this.getStockAlerts(companyId)

      const result = {
        stats,
        alerts: {
          outOfStock: alerts.outOfStock.length,
          lowStock: alerts.lowStock.length,
          totalAlerts: alerts.totalAlerts
        },
        message: `Unification terminée: ${stats.createdStocks} stocks créés, ${stats.correctedProducts} produits corrigés`
      }

      logger.info('Unification des données terminée', result)
      return result

    } catch (error) {
      logger.error('Erreur lors de l\'unification des données', { error })
      throw error
    }
  }
}


