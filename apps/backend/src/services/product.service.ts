import { prisma, Prisma, Product, Category } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

export interface CreateProductData {
  name: string
  description?: string
  sku?: string
  barcode?: string
  price: number
  cost?: number
  vatRate?: number
  stockQuantity?: number
  minStock?: number
  maxStock?: number
  isActive?: boolean
  isService?: boolean
  unit?: string
  categoryId?: string
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductFilters {
  search?: string
  categoryId?: string
  isActive?: boolean
  isService?: boolean
  lowStock?: boolean
  priceMin?: number
  priceMax?: number
  inStock?: boolean
}

export interface ProductImageData {
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  altText?: string
  isMain?: boolean
}

export interface ProductVariantData {
  name: string
  sku?: string
  barcode?: string
  color?: string
  size?: string
  material?: string
  price?: number
  cost?: number
  stock?: number
  isActive?: boolean
}

export class ProductService {
  /**
   * Créer un nouveau produit
   */
  static async createProduct(
    data: CreateProductData,
    companyId: string
  ): Promise<Product> {
    try {
      logger.info('Création d\'un nouveau produit', { companyId, name: data.name })

      // Vérifier l'unicité du SKU dans l'entreprise
      if (data.sku) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: data.sku,
            companyId,
          },
        })

        if (existingProduct) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }
      }

      // Vérifier l'unicité du code-barres
      if (data.barcode) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            barcode: data.barcode,
            companyId,
          },
        })

        if (existingProduct) {
          throw new Error('Un produit avec ce code-barres existe déjà')
        }
      }

      // Vérifier que la catégorie existe si spécifiée
      if (data.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            companyId,
          },
        })

        if (!category) {
          throw new Error('Catégorie non trouvée')
        }
      }

      const product = await prisma.product.create({
        data: {
          ...data,
          companyId,
          vatRate: data.vatRate || 20,
          stockQuantity: data.stockQuantity || 0,
          minStock: data.minStock || 0,
          isActive: data.isActive !== false,
          isService: data.isService || false,
          unit: data.unit || 'pièce',
        },
        include: {
          category: true,
        },
      })

      // Créer un mouvement de stock initial si quantité > 0
      if (product.stockQuantity > 0 && !product.isService) {
        await prisma.stockMovement.create({
          data: {
            type: 'IN',
            quantity: product.stockQuantity,
            unitCost: product.cost,
            reference: 'STOCK-INITIAL',
            comment: 'Stock initial lors de la création du produit',
            productId: product.id,
          },
        })
      }

      logger.info('Produit créé avec succès', { productId: product.id })
      return product
    } catch (error) {
      logger.error('Erreur lors de la création du produit', { error, data })
      throw error
    }
  }

  /**
   * Récupérer un produit par ID
   */
  static async getProductById(id: string, companyId: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          category: true,
          stock: true, // Inclure les données de stock
        },
      })

      if (!product) {
        return null
      }

      // Transformer pour utiliser les stocks comme source de vérité
      if (product.stock && !product.isService) {
        return {
          ...product,
          stockQuantity: product.stock.quantiteActuelle,
          minStock: product.stock.quantiteMinimale,
          maxStock: product.stock.quantiteMaximale,
          unifiedStock: {
            quantiteActuelle: product.stock.quantiteActuelle,
            quantiteMinimale: product.stock.quantiteMinimale,
            quantiteMaximale: product.stock.quantiteMaximale,
            dateLastUpdate: product.stock.dateLastUpdate
          }
        } as Product
      }

      return product
    } catch (error) {
      logger.error('Erreur lors de la récupération du produit', { error, id })
      throw error
    }
  }

  /**
   * Récupérer un produit par nom ou SKU
   */
  static async getProductByNameOrSku(name: string, sku: string | null, companyId: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findFirst({
        where: {
          companyId,
          OR: [
            { name: { equals: name, mode: 'insensitive' } },
            ...(sku ? [{ sku: { equals: sku } }] : [])
          ]
        },
        include: {
          category: true,
        },
      })

      return product
    } catch (error) {
      logger.error('Erreur lors de la recherche du produit', { error, name, sku, companyId })
      throw error
    }
  }

  /**
   * Récupérer la liste des produits avec pagination et filtres
   */
  static async getProducts(
    companyId: string,
    filters: ProductFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginationResponse<Product>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination || {};

      const { search, categoryId, isActive, isService, lowStock } = filters

      // Construction de la clause WHERE
      const where: Prisma.ProductWhereInput = {
        companyId,
        ...(categoryId && { categoryId }),
        ...(isActive !== undefined && { isActive }),
        ...(isService !== undefined && { isService }),
        ...(lowStock && {
          AND: [
            { isService: false },
            { stockQuantity: { lte: prisma.product.fields.minStock } },
          ],
        }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ],
        }),
      }

      const skip = pagination ? (page - 1) * limit : undefined;
      const take = pagination ? limit : undefined;

      // Requêtes parallèles pour les données et le count
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder,
          },
          include: {
            category: true,
            stock: true, // Inclure les données de stock unifiées
          },
        }),
        prisma.product.count({ where }),
      ])

      const totalPages = pagination ? Math.ceil(total / limit) : 1;

      // Transformer les données pour utiliser les stocks comme source de vérité
      const unifiedProducts = products.map(product => {
        if (product.stock && !product.isService) {
          // Utiliser les données de la table stocks pour les produits physiques
          return {
            ...product,
            stockQuantity: product.stock.quantiteActuelle,
            minStock: product.stock.quantiteMinimale,
            maxStock: product.stock.quantiteMaximale,
            // Ajouter les données de stock pour référence
            unifiedStock: {
              quantiteActuelle: product.stock.quantiteActuelle,
              quantiteMinimale: product.stock.quantiteMinimale,
              quantiteMaximale: product.stock.quantiteMaximale,
              dateLastUpdate: product.stock.dateLastUpdate
            }
          }
        }
        return product
      })

      return {
        data: unifiedProducts,
        pagination: {
          page: page,
          limit: pagination ? limit : total,
          total,
          totalPages,
          hasNext: pagination ? page < totalPages : false,
          hasPrev: pagination ? page > 1 : false,
        },
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des produits', { error, filters })
      throw error
    }
  }

  /**
   * Mettre à jour un produit
   */
  static async updateProduct(
    id: string,
    data: UpdateProductData,
    companyId: string
  ): Promise<Product> {
    try {
      logger.info('Mise à jour du produit', { productId: id, companyId })

      // Vérifier que le produit existe et appartient à l'entreprise
      const existingProduct = await this.getProductById(id, companyId)
      if (!existingProduct) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier l'unicité du SKU si modifié
      if (data.sku && data.sku !== existingProduct.sku) {
        const skuExists = await prisma.product.findFirst({
          where: {
            sku: data.sku,
            companyId,
            id: { not: id },
          },
        })

        if (skuExists) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }
      }

      // Vérifier l'unicité du code-barres si modifié
      if (data.barcode && data.barcode !== existingProduct.barcode) {
        const barcodeExists = await prisma.product.findFirst({
          where: {
            barcode: data.barcode,
            companyId,
            id: { not: id },
          },
        })

        if (barcodeExists) {
          throw new Error('Un produit avec ce code-barres existe déjà')
        }
      }

      // Vérifier que la catégorie existe si modifiée
      if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            companyId,
          },
        })

        if (!category) {
          throw new Error('Catégorie non trouvée')
        }
      }

      const updatedProduct = await prisma.product.update({
        where: { id },
        data,
        include: {
          category: true,
        },
      })

      logger.info('Produit mis à jour avec succès', { productId: id })
      return updatedProduct
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du produit', { error, id, data })
      throw error
    }
  }

  /**
   * Supprimer un produit
   */
  static async deleteProduct(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression du produit', { productId: id, companyId })

      // Vérifier que le produit existe et appartient à l'entreprise
      const existingProduct = await this.getProductById(id, companyId)
      if (!existingProduct) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier qu'il n'y a pas de commandes ou factures liées
      const [orderItemsCount, invoiceItemsCount] = await Promise.all([
        prisma.orderItem.count({ where: { productId: id } }),
        prisma.invoiceItem.count({ where: { productId: id } }),
      ])

      if (orderItemsCount > 0 || invoiceItemsCount > 0) {
        throw new Error(
          'Impossible de supprimer ce produit car il est utilisé dans des commandes ou factures'
        )
      }

      // Supprimer les mouvements de stock associés
      await prisma.stockMovement.deleteMany({
        where: { productId: id },
      })

      // Supprimer le produit
      await prisma.product.delete({
        where: { id },
      })

      logger.info('Produit supprimé avec succès', { productId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression du produit', { error, id })
      throw error
    }
  }

  /**
   * Rechercher des produits par nom/SKU
   */
  static async searchProducts(
    companyId: string,
    query: string,
    limit = 10
  ): Promise<Product[]> {
    try {
      const products = await prisma.product.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { sku: { contains: query, mode: 'insensitive' } },
            { barcode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: {
          name: 'asc',
        },
        include: {
          category: true,
        },
      })

      return products
    } catch (error) {
      logger.error('Erreur lors de la recherche de produits', { error, query })
      throw error
    }
  }

  /**
   * Obtenir les produits en rupture de stock
   */
  static async getLowStockProducts(companyId: string): Promise<Product[]> {
    try {
      // Utiliser une requête SQL brute pour comparer stockQuantity avec minStock
      const productsRaw = await prisma.$queryRaw`
        SELECT p.*, c.name as category_name, c.id as category_id
        FROM products p
        LEFT JOIN categories c ON p."categoryId" = c.id
        WHERE p."companyId" = ${companyId}
          AND p."isActive" = true
          AND p."isService" = false
          AND (p."stockQuantity" = 0 OR p."stockQuantity" <= p."minStock")
        ORDER BY p."stockQuantity" ASC
      `

      // Transformer les résultats
      const products = (productsRaw as any[]).map((product: any) => ({
        ...product,
        category: product.category_id ? {
          id: product.category_id,
          name: product.category_name
        } : null
      }))

      return products
    } catch (error) {
      logger.error('Erreur lors de la récupération des produits en rupture', { error })
      throw error
    }
  }

  /**
   * Obtenir les statistiques des produits
   */
  static async getProductStats(companyId: string) {
    try {
      const [total, active, services, lowStock, totalValue] = await Promise.all([
        prisma.product.count({ where: { companyId } }),
        prisma.product.count({ where: { companyId, isActive: true } }),
        prisma.product.count({ where: { companyId, isService: true } }),
        prisma.product.count({
          where: {
            companyId,
            isActive: true,
            isService: false,
            stockQuantity: { lte: prisma.product.fields.minStock },
          },
        }),
        prisma.product.aggregate({
          where: { companyId, isActive: true },
          _sum: {
            stockQuantity: true,
          },
        }),
      ])

      return {
        total,
        active,
        services,
        lowStock,
        totalStockQuantity: totalValue._sum.stockQuantity || 0,
      }
    } catch (error) {
      logger.error('Erreur lors du calcul des statistiques produits', { error })
      throw error
    }
  }

  /**
   * Ajouter une image à un produit
   */
  static async addProductImage(
    productId: string,
    imageData: ProductImageData,
    companyId: string
  ) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Si c'est l'image principale, désactiver les autres images principales
      if (imageData.isMain) {
        await prisma.productImage.updateMany({
          where: { productId, isMain: true },
          data: { isMain: false },
        })
      }

      const image = await prisma.productImage.create({
        data: {
          ...imageData,
          productId,
        },
      })

      logger.info('Image ajoutée au produit', { productId, imageId: image.id })
      return image
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de l\'image', { error, productId, imageData })
      throw error
    }
  }

  /**
   * Récupérer les images d'un produit
   */
  static async getProductImages(productId: string, companyId: string) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error('Produit non trouvé')
      }

      const images = await prisma.productImage.findMany({
        where: { productId },
        orderBy: [
          { isMain: 'desc' },
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      })

      return images
    } catch (error) {
      logger.error('Erreur lors de la récupération des images', { error, productId })
      throw error
    }
  }

  /**
   * Supprimer une image de produit
   */
  static async deleteProductImage(imageId: string, companyId: string) {
    try {
      const image = await prisma.productImage.findFirst({
        where: {
          id: imageId,
          product: { companyId },
        },
      })

      if (!image) {
        throw new Error('Image non trouvée')
      }

      await prisma.productImage.delete({
        where: { id: imageId },
      })

      logger.info('Image supprimée', { imageId })
    } catch (error) {
      logger.error('Erreur lors de la suppression de l\'image', { error, imageId })
      throw error
    }
  }

  /**
   * Ajouter une variante à un produit
   */
  static async addProductVariant(
    productId: string,
    variantData: ProductVariantData,
    companyId: string
  ) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error('Produit non trouvé')
      }

      // Vérifier l'unicité du SKU si fourni
      if (variantData.sku) {
        const existingVariant = await prisma.productVariant.findFirst({
          where: {
            sku: variantData.sku,
            product: { companyId },
          },
        })

        if (existingVariant) {
          throw new Error('Une variante avec ce SKU existe déjà')
        }
      }

      const variant = await prisma.productVariant.create({
        data: {
          ...variantData,
          productId,
        },
      })

      logger.info('Variante ajoutée au produit', { productId, variantId: variant.id })
      return variant
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de la variante', { error, productId, variantData })
      throw error
    }
  }

  /**
   * Récupérer les variantes d'un produit
   */
  static async getProductVariants(productId: string, companyId: string) {
    try {
      // Vérifier que le produit appartient à l'entreprise
      const product = await this.getProductById(productId, companyId)
      if (!product) {
        throw new Error('Produit non trouvé')
      }

      const variants = await prisma.productVariant.findMany({
        where: { productId },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'asc' },
        ],
      })

      return variants
    } catch (error) {
      logger.error('Erreur lors de la récupération des variantes', { error, productId })
      throw error
    }
  }

  /**
   * Mettre à jour une variante de produit
   */
  static async updateProductVariant(
    variantId: string,
    variantData: Partial<ProductVariantData>,
    companyId: string
  ) {
    try {
      const variant = await prisma.productVariant.findFirst({
        where: {
          id: variantId,
          product: { companyId },
        },
      })

      if (!variant) {
        throw new Error('Variante non trouvée')
      }

      // Vérifier l'unicité du SKU si modifié
      if (variantData.sku && variantData.sku !== variant.sku) {
        const existingVariant = await prisma.productVariant.findFirst({
          where: {
            sku: variantData.sku,
            product: { companyId },
            id: { not: variantId },
          },
        })

        if (existingVariant) {
          throw new Error('Une variante avec ce SKU existe déjà')
        }
      }

      const updatedVariant = await prisma.productVariant.update({
        where: { id: variantId },
        data: variantData,
      })

      logger.info('Variante mise à jour', { variantId })
      return updatedVariant
    } catch (error) {
      logger.error('Erreur lors de la mise à jour de la variante', { error, variantId, variantData })
      throw error
    }
  }

  /**
   * Supprimer une variante de produit
   */
  static async deleteProductVariant(variantId: string, companyId: string) {
    try {
      const variant = await prisma.productVariant.findFirst({
        where: {
          id: variantId,
          product: { companyId },
        },
      })

      if (!variant) {
        throw new Error('Variante non trouvée')
      }

      await prisma.productVariant.delete({
        where: { id: variantId },
      })

      logger.info('Variante supprimée', { variantId })
    } catch (error) {
      logger.error('Erreur lors de la suppression de la variante', { error, variantId })
      throw error
    }
  }
}


