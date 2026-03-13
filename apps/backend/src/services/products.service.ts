import { Product } from '@gestion/database'
import { prisma } from '../lib/database'
import { logger } from '../utils/logger'

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  minStock?: number
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface ProductData {
  name: string
  description?: string
  reference?: string
  price: number
  costPrice?: number
  stockQuantity: number
  minStock?: number
  unit?: string
  barcode?: string
  image?: string
  isActive?: boolean
  categoryId?: string
}

export class ProductsService {
  /**
   * Récupérer tous les produits avec filtres et pagination
   */
  async getProducts(
    companyId: string,
    filters: ProductFilters = {},
    pagination: PaginationOptions = {}
  ) {
    try {
      const { search, categoryId, isActive, minStock } = filters
      const { page = 1, limit = 10 } = pagination

      const skip = (page - 1) * limit

      // Construire les conditions de filtrage
      const where: any = {
        companyId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { reference: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(categoryId && { categoryId }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(typeof minStock === 'number' && { stockQuantity: { lte: minStock } })
      }

      // Récupérer les produits avec pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.product.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: products,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des produits:', error)
      throw new Error('Erreur lors de la récupération des produits')
    }
  }

  /**
   * Récupérer un produit par ID
   */
  async getProductById(productId: string, companyId: string) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId
        },
        include: {
          category: true,
          stockMovements: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      return product

    } catch (error) {
      logger.error('Erreur lors de la récupération du produit:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau produit
   */
  async createProduct(companyId: string, productData: ProductData) {
    try {
      const product = await prisma.product.create({
        data: {
          ...productData,
          companyId
        },
        include: {
          category: true
        }
      })

      // Créer un mouvement de stock initial si nécessaire
      if (productData.stockQuantity > 0) {
        await prisma.stockMovement.create({
          data: {
            type: 'IN',
            quantity: productData.stockQuantity,
            unitCost: productData.costPrice || 0,
            reference: 'Stock initial',
            comment: 'Stock initial lors de la création du produit',
            productId: product.id
          }
        })
      }

      logger.info(`Nouveau produit créé: ${product.name} (${product.id})`)
      return product

    } catch (error) {
      logger.error('Erreur lors de la création du produit:', error)
      throw new Error('Erreur lors de la création du produit')
    }
  }

  /**
   * Mettre à jour un produit
   */
  async updateProduct(productId: string, companyId: string, productData: Partial<ProductData>) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId
        }
      })

      if (!existingProduct) {
        throw new Error('Produit non trouvé')
      }

      const product = await prisma.product.update({
        where: { id: productId },
        data: productData,
        include: {
          category: true
        }
      })

      logger.info(`Produit mis à jour: ${product.name} (${product.id})`)
      return product

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du produit:', error)
      throw error
    }
  }

  /**
   * Supprimer un produit (soft delete)
   */
  async deleteProduct(productId: string, companyId: string) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const existingProduct = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId
        }
      })

      if (!existingProduct) {
        throw new Error('Produit non trouvé')
      }

      // Soft delete - marquer comme inactif
      const product = await prisma.product.update({
        where: { id: productId },
        data: { isActive: false }
      })

      logger.info(`Produit supprimé: ${product.name} (${product.id})`)
      return product

    } catch (error) {
      logger.error('Erreur lors de la suppression du produit:', error)
      throw error
    }
  }

  /**
   * Mettre à jour le stock d'un produit
   */
  async updateStock(
    productId: string, 
    companyId: string, 
    quantity: number, 
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reference?: string,
    comment?: string
  ) {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          companyId
        }
      })

      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Calculer le nouveau stock
      let newStock = product.stockQuantity
      if (type === 'IN') {
        newStock += quantity
      } else if (type === 'OUT') {
        newStock -= quantity
      } else if (type === 'ADJUSTMENT') {
        newStock = quantity
      }

      // Vérifier que le stock ne devient pas négatif
      if (newStock < 0) {
        throw new Error('Stock insuffisant')
      }

      // Mettre à jour le produit et créer le mouvement de stock
      const [updatedProduct] = await Promise.all([
        prisma.product.update({
          where: { id: productId },
          data: { stockQuantity: newStock }
        }),
        prisma.stockMovement.create({
          data: {
            type,
            quantity: type === 'ADJUSTMENT' ? quantity - product.stockQuantity : quantity,
            reference,
            comment,
            productId
          }
        })
      ])

      logger.info(`Stock mis à jour pour ${product.name}: ${product.stockQuantity} → ${newStock}`)
      return updatedProduct

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du stock:', error)
      throw error
    }
  }

  /**
   * Récupérer les produits en rupture de stock
   */
  async getLowStockProducts(companyId: string) {
    try {
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { stockQuantity: { lte: prisma.product.fields.minStock } },
            { stockQuantity: 0 }
          ]
        },
        include: {
          category: true
        },
        orderBy: { stockQuantity: 'asc' }
      })

      return products

    } catch (error) {
      logger.error('Erreur lors de la récupération des produits en rupture:', error)
      throw error
    }
  }
}


