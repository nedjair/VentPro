import { Prisma, Product } from '@gestion/database'
import { prisma } from '../lib/prisma'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { UnifiedStockService } from './unified-stock.service'
import { getFallbackProductById, getFallbackProductStats, getFallbackProducts, isDatabaseUnavailableError } from './dev-fallback-data.service'

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

interface CurrentSchemaProductRow {
  id: string
  name: string
  description: string | null
  sku: string
  barcode: string | null
  price: number | string
  cost: number | string | null
  tvaRate: number | null
  minStock: number | string | null
  maxStock: number | string | null
  createdAt: Date
  updatedAt: Date
  userId: string
  stockQuantity: number | string | null
  stockUpdatedAt: Date | null
  categoryId: string | null
  categoryName: string | null
  categoryDescription: string | null
  categoryCreatedAt: Date | null
  categoryUpdatedAt: Date | null
}

export class ProductService {
  private static isPrismaUniqueConstraintError(error: unknown, fieldName?: string): boolean {
    if (!error || typeof error !== 'object') {
      return false
    }

    const prismaError = error as { code?: string; meta?: { target?: unknown } }
    if (prismaError.code !== 'P2002') {
      return false
    }

    if (!fieldName) {
      return true
    }

    const rawTarget = prismaError.meta?.target
    const normalizedTargets = Array.isArray(rawTarget)
      ? rawTarget.map((value) => String(value))
      : typeof rawTarget === 'string'
        ? [rawTarget]
        : []

    return normalizedTargets.some((target) => target.includes(fieldName))
  }

  private static normalizeCurrentSchemaProduct(product: CurrentSchemaProductRow): Product {
    const stockQuantity = Number(product.stockQuantity ?? 0)
    const normalizedCategory = product.categoryId
      ? {
          id: product.categoryId,
          name: product.categoryName || 'Catégorie',
          description: product.categoryDescription || undefined,
          createdAt: product.categoryCreatedAt || product.createdAt,
          updatedAt: product.categoryUpdatedAt || product.updatedAt,
        }
      : undefined

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      reference: product.sku,
      barcode: product.barcode || undefined,
      description: product.description || undefined,
      categoryId: product.categoryId || undefined,
      category: normalizedCategory,
      price: Number(product.price ?? 0),
      costPrice: product.cost == null ? undefined : Number(product.cost),
      stock: stockQuantity,
      stockQuantity,
      minStock: Number(product.minStock ?? 0),
      maxStock: product.maxStock == null ? null : Number(product.maxStock),
      unit: 'pièce',
      isActive: true,
      isService: false,
      trackStock: true,
      allowBackorder: false,
      vatRate: Number(product.tvaRate ?? 20),
      userId: product.userId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    } as unknown as Product
  }

  private static async getCurrentSchemaProductRow(id: string, ownerScopeId: string): Promise<CurrentSchemaProductRow | null> {
    const rows = await prisma.$queryRaw<Array<CurrentSchemaProductRow>>`
      SELECT
        p.id,
        p.name,
        p.description,
        p.sku,
        p.barcode,
        p.price,
        p.cost,
        p."tvaRate",
        p."minStock",
        p."maxStock",
        p."createdAt",
        p."updatedAt",
        p."userId",
        p."categoryId",
        c.name AS "categoryName",
        c.description AS "categoryDescription",
        c."createdAt" AS "categoryCreatedAt",
        c."updatedAt" AS "categoryUpdatedAt",
        COALESCE(s.quantity, 0) AS "stockQuantity",
        s."updatedAt" AS "stockUpdatedAt"
      FROM "Product" p
      LEFT JOIN "Stock" s
        ON s."productId" = p.id
       AND s."userId" = p."userId"
      LEFT JOIN "Category" c
        ON c.id = p."categoryId"
      WHERE p.id = ${id}
        AND p."userId" = ${ownerScopeId}
      ORDER BY s."updatedAt" DESC NULLS LAST
      LIMIT 1
    `

    return rows[0] ?? null
  }

  private static async assertCurrentSchemaCategoryExists(categoryId: string, ownerScopeId: string): Promise<void> {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "Category"
      WHERE id = ${categoryId}
        AND "userId" = ${ownerScopeId}
      LIMIT 1
    `

    if (!rows[0]) {
      throw new Error('Catégorie non trouvée')
    }
  }

  private static buildCurrentSchemaSku(data: CreateProductData): string {
    const explicitSku = data.sku?.trim()
    if (explicitSku) {
      return explicitSku
    }

    const normalizedBase = data.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18)

    const fallbackBase = normalizedBase || 'PRODUIT'
    const uniqueSuffix = Date.now().toString().slice(-6)
    return `${fallbackBase}-${uniqueSuffix}`
  }

  /**
   * Créer un nouveau produit
   */
  static async createProduct(
    data: CreateProductData,
    ownerScopeId: string
  ): Promise<Product> {
    try {
      logger.info('Création d\'un nouveau produit', { ownerScopeId, name: data.name })

      const normalizedSku = this.buildCurrentSchemaSku(data)

      try {
        const existingSku = await prisma.product.findFirst({
          where: {
            sku: normalizedSku,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (existingSku) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }

        if (data.barcode) {
          const existingBarcode = await prisma.product.findFirst({
            where: {
              barcode: data.barcode,
              userId: ownerScopeId,
            },
            select: { id: true },
          })

          if (existingBarcode) {
            throw new Error('Un produit avec ce code-barres existe déjà')
          }
        }

        if (data.categoryId) {
          await this.assertCurrentSchemaCategoryExists(data.categoryId, ownerScopeId)
        }

        const createdRows = await prisma.$queryRaw<Array<{ id: string }>>`
          INSERT INTO "Product" (
            name,
            description,
            sku,
            barcode,
            price,
            cost,
            "tvaRate",
            "minStock",
            "maxStock",
            "categoryId",
            "userId"
          )
          VALUES (
            ${data.name},
            ${data.description?.trim() || null},
            ${normalizedSku},
            ${data.barcode?.trim() || null},
            ${Number(data.price ?? 0)},
            ${data.cost == null ? null : Number(data.cost)},
            ${data.vatRate ?? 20},
            ${Math.max(0, Number(data.minStock ?? 0))},
            ${data.maxStock == null ? null : Math.max(0, Number(data.maxStock))},
            ${data.categoryId || null},
            ${ownerScopeId}
          )
          RETURNING id
        `

        const createdProductId = createdRows[0]?.id
        if (!createdProductId) {
          throw new Error('Produit non trouvé après création')
        }

        if ((data.stockQuantity ?? 0) > 0) {
          await prisma.stock.create({
            data: {
              quantity: Math.max(0, Number(data.stockQuantity ?? 0)),
              productId: createdProductId,
              userId: ownerScopeId,
            },
          })
        }

        const createdProduct = await this.getCurrentSchemaProductRow(createdProductId, ownerScopeId)
        if (!createdProduct) {
          throw new Error('Produit non trouvé après création')
        }

        const currentSchemaProduct = this.normalizeCurrentSchemaProduct(createdProduct)

        logger.info('Produit créé avec succès via le schéma local courant', { productId: createdProductId })
        return currentSchemaProduct
      } catch (currentSchemaError) {
        if (this.isPrismaUniqueConstraintError(currentSchemaError, 'sku')) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }

        if (this.isPrismaUniqueConstraintError(currentSchemaError, 'barcode')) {
          throw new Error('Un produit avec ce code-barres existe déjà')
        }

        if (
          currentSchemaError instanceof Error &&
          [
            'Un produit avec ce SKU existe déjà',
            'Un produit avec ce code-barres existe déjà',
            'Catégorie non trouvée',
            'Produit non trouvé après création',
          ].includes(currentSchemaError.message)
        ) {
          throw currentSchemaError
        }

        logger.warn('Fallback createProduct vers schéma legacy', { error: currentSchemaError, ownerScopeId })
      }

      // Fallback robuste aligné sur le schéma Prisma courant généré.
      if (normalizedSku) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: normalizedSku,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (existingProduct) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }
      }

      if (data.barcode) {
        const existingProduct = await prisma.product.findFirst({
          where: {
            barcode: data.barcode,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (existingProduct) {
          throw new Error('Un produit avec ce code-barres existe déjà')
        }
      }

      if (data.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (!category) {
          throw new Error('Catégorie non trouvée')
        }
      }

      const product = await prisma.product.create({
        data: {
          name: data.name,
          description: data.description?.trim() || null,
          sku: normalizedSku,
          barcode: data.barcode?.trim() || null,
          price: Number(data.price ?? 0),
          cost: data.cost == null ? null : Number(data.cost),
          tvaRate: data.vatRate ?? 20,
          minStock: Math.max(0, Number(data.minStock ?? 0)),
          maxStock: data.maxStock == null ? null : Math.max(0, Number(data.maxStock)),
          categoryId: data.categoryId || null,
          userId: ownerScopeId,
        },
        select: { id: true },
      })

      if ((data.stockQuantity ?? 0) > 0) {
        await prisma.stock.upsert({
          where: { productId: product.id },
          update: {
            quantity: Math.max(0, Number(data.stockQuantity ?? 0)),
            userId: ownerScopeId,
          },
          create: {
            quantity: Math.max(0, Number(data.stockQuantity ?? 0)),
            productId: product.id,
            userId: ownerScopeId,
          },
        })
      }

      const createdProduct = await this.getCurrentSchemaProductRow(product.id, ownerScopeId)
      if (!createdProduct) {
        throw new Error('Produit non trouvé après création')
      }

      logger.info('Produit créé avec succès via le fallback Prisma courant', { productId: product.id })
      return this.normalizeCurrentSchemaProduct(createdProduct)
    } catch (error) {
      logger.error('Erreur lors de la création du produit', { error, data })
      throw error
    }
  }

  /**
   * Récupérer un produit par ID
   */
  static async getProductById(id: string, ownerScopeId: string): Promise<Product | null> {
    try {
      try {
        const product = await this.getCurrentSchemaProductRow(id, ownerScopeId)

        if (product) {
          return this.normalizeCurrentSchemaProduct(product)
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback getProductById vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      const product = await (prisma.product as any).findFirst({
        where: {
          id,
          companyId: ownerScopeId,
        },
        include: {
          category: true,
          stock: true,
        },
      })

      return product
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackProductById(ownerScopeId, id) as unknown as Product | null
      }
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
      const page = pagination?.page || 1
      const limit = pagination?.limit || 20
      const skip = (page - 1) * limit
      const searchTerm = filters.search?.trim()

      // 1) Schéma PostgreSQL réellement observé en local :
      //    tables PascalCase (`Product`, `Stock`) liées à l'utilisateur via `userId`.
      //    On privilégie ce chemin car le client Prisma généré dans le projet reste
      //    aligné sur un ancien schéma legacy et ne peut pas lire ces tables correctement.
      try {
        const searchCondition = searchTerm
          ? Prisma.sql`
              AND (
                LOWER(p.name) LIKE LOWER(${`%${searchTerm}%`})
                OR LOWER(COALESCE(p.sku, '')) LIKE LOWER(${`%${searchTerm}%`})
                OR LOWER(COALESCE(c.name, '')) LIKE LOWER(${`%${searchTerm}%`})
              )
            `
          : Prisma.empty
        const categoryCondition = filters.categoryId
          ? Prisma.sql`AND p."categoryId" = ${filters.categoryId}`
          : Prisma.empty
        const priceMinCondition = typeof filters.priceMin === 'number'
          ? Prisma.sql`AND p.price >= ${filters.priceMin}`
          : Prisma.empty
        const priceMaxCondition = typeof filters.priceMax === 'number'
          ? Prisma.sql`AND p.price <= ${filters.priceMax}`
          : Prisma.empty
        const inStockCondition = filters.inStock === true
          ? Prisma.sql`AND COALESCE(s.quantity, 0) > 0`
          : filters.inStock === false
            ? Prisma.sql`AND COALESCE(s.quantity, 0) <= 0`
            : Prisma.empty
        const lowStockCondition = filters.lowStock
          ? Prisma.sql`AND COALESCE(s.quantity, 0) <= COALESCE(p."minStock", 0) AND COALESCE(p."minStock", 0) > 0`
          : Prisma.empty

        const products = await prisma.$queryRaw<Array<CurrentSchemaProductRow>>(Prisma.sql`
          SELECT
            p.id,
            p.name,
            p.description,
            p.sku,
            p.barcode,
            p.price,
            p.cost,
            p."tvaRate",
            p."minStock",
            p."maxStock",
            p."createdAt",
            p."updatedAt",
            p."userId",
            p."categoryId",
            c.name AS "categoryName",
            c.description AS "categoryDescription",
            c."createdAt" AS "categoryCreatedAt",
            c."updatedAt" AS "categoryUpdatedAt",
            COALESCE(s.quantity, 0) AS "stockQuantity",
            s."updatedAt" AS "stockUpdatedAt"
          FROM "Product" p
          LEFT JOIN "Stock" s ON s."productId" = p.id AND s."userId" = p."userId"
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          WHERE p."userId" = ${companyId}
            ${searchCondition}
            ${categoryCondition}
            ${priceMinCondition}
            ${priceMaxCondition}
            ${inStockCondition}
            ${lowStockCondition}
          ORDER BY p."createdAt" DESC
          LIMIT ${limit}
          OFFSET ${skip}
        `)

        const totalRows = await prisma.$queryRaw<Array<{ count: bigint | number | string }>>(Prisma.sql`
          SELECT COUNT(*) AS count
          FROM "Product" p
          LEFT JOIN "Stock" s ON s."productId" = p.id AND s."userId" = p."userId"
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          WHERE p."userId" = ${companyId}
            ${searchCondition}
            ${categoryCondition}
            ${priceMinCondition}
            ${priceMaxCondition}
            ${inStockCondition}
            ${lowStockCondition}
        `)

        const total = Number(totalRows[0]?.count || 0)

        const normalizedProducts = products.map((product) => this.normalizeCurrentSchemaProduct(product)) as Product[]

        return {
          data: normalizedProducts,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page * limit < total,
            hasPrev: page > 1,
          },
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback produits : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError })
      }

      // 2) Fallback legacy vers l'ancien schéma Prisma généré dans le projet.
      const products = await prisma.product.findMany({
        where: { companyId },
        take: limit,
        skip,
        include: {
          category: true,
        },
      })

      const total = await prisma.product.count({
        where: { companyId },
      })

      return {
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackProducts(companyId, filters, pagination) as unknown as PaginationResponse<Product>
      }
      logger.error('Erreur lors de la récupération des produits', { error })
      throw new Error('Erreur lors de la récupération des produits')
    }
  }

  /**
   * Mettre à jour un produit
   */
  static async updateProduct(
    id: string,
    data: UpdateProductData,
    ownerScopeId: string
  ): Promise<Product> {
    try {
      logger.info('Mise à jour du produit', { productId: id, ownerScopeId })

      try {
        const existingProduct = await this.getCurrentSchemaProductRow(id, ownerScopeId)

        if (existingProduct) {
          if (data.sku && data.sku !== existingProduct.sku) {
            const skuExists = await prisma.product.findFirst({
              where: {
                sku: data.sku,
                userId: ownerScopeId,
                id: { not: id },
              },
              select: { id: true },
            })

            if (skuExists) {
              throw new Error('Un produit avec ce SKU existe déjà')
            }
          }

          if (data.barcode && data.barcode !== existingProduct.barcode) {
            const barcodeExists = await prisma.product.findFirst({
              where: {
                barcode: data.barcode,
                userId: ownerScopeId,
                id: { not: id },
              },
              select: { id: true },
            })

            if (barcodeExists) {
              throw new Error('Un produit avec ce code-barres existe déjà')
            }
          }

          if (data.categoryId !== undefined && data.categoryId !== (existingProduct.categoryId || undefined)) {
            if (data.categoryId) {
              await this.assertCurrentSchemaCategoryExists(data.categoryId, ownerScopeId)
            }
          }

          const updateClauses: Prisma.Sql[] = []
          if (data.name !== undefined) updateClauses.push(Prisma.sql`name = ${data.name}`)
          if (data.description !== undefined) updateClauses.push(Prisma.sql`description = ${data.description || null}`)
          if (data.sku !== undefined) updateClauses.push(Prisma.sql`sku = ${data.sku}`)
          if (data.barcode !== undefined) updateClauses.push(Prisma.sql`barcode = ${data.barcode || null}`)
          if (data.price !== undefined) updateClauses.push(Prisma.sql`price = ${Number(data.price)}`)
          if (data.cost !== undefined) updateClauses.push(Prisma.sql`cost = ${data.cost == null ? null : Number(data.cost)}`)
          if (data.vatRate !== undefined) updateClauses.push(Prisma.sql`"tvaRate" = ${data.vatRate}`)
          if (data.categoryId !== undefined) updateClauses.push(Prisma.sql`"categoryId" = ${data.categoryId || null}`)

          if (updateClauses.length > 0) {
            await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
              UPDATE "Product"
              SET ${Prisma.join(updateClauses, Prisma.sql`, `)},
                  "updatedAt" = CURRENT_TIMESTAMP
              WHERE id = ${id}
                AND "userId" = ${ownerScopeId}
              RETURNING id
            `)
          }

          if (
            data.stockQuantity !== undefined ||
            data.minStock !== undefined ||
            data.maxStock !== undefined
          ) {
            await UnifiedStockService.updateUnifiedStock(id, ownerScopeId, {
              stockQuantity: data.stockQuantity,
              minStock: data.minStock,
              maxStock: data.maxStock,
            })
          }

          const refreshedProduct = await this.getProductById(id, ownerScopeId)
          if (!refreshedProduct) {
            throw new Error('Produit non trouvé après mise à jour')
          }

          logger.info('Produit mis à jour avec succès via le schéma local courant', { productId: id })
          return refreshedProduct
        }
      } catch (currentSchemaError) {
        if (
          currentSchemaError instanceof Error &&
          [
            'Produit non trouvé',
            'Produit non trouvé après mise à jour',
            'Un produit avec ce SKU existe déjà',
            'Un produit avec ce code-barres existe déjà',
            'Catégorie non trouvée',
          ].includes(currentSchemaError.message)
        ) {
          throw currentSchemaError
        }

        logger.warn('Fallback updateProduct vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      // Vérifier que le produit existe et appartient à l'entreprise
      const existingProduct = await this.getProductById(id, ownerScopeId)
      if (!existingProduct) {
        throw new Error('Produit non trouvé')
      }

      if (data.sku && data.sku !== existingProduct.sku) {
        const skuExists = await prisma.product.findFirst({
          where: {
            sku: data.sku,
            userId: ownerScopeId,
            id: { not: id },
          },
          select: { id: true },
        })

        if (skuExists) {
          throw new Error('Un produit avec ce SKU existe déjà')
        }
      }

      if (data.barcode && data.barcode !== existingProduct.barcode) {
        const barcodeExists = await prisma.product.findFirst({
          where: {
            barcode: data.barcode,
            userId: ownerScopeId,
            id: { not: id },
          },
          select: { id: true },
        })

        if (barcodeExists) {
          throw new Error('Un produit avec ce code-barres existe déjà')
        }
      }

      if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: data.categoryId,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (!category) {
          throw new Error('Catégorie non trouvée')
        }
      }

      await prisma.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description || null } : {}),
          ...(data.sku !== undefined ? { sku: data.sku } : {}),
          ...(data.barcode !== undefined ? { barcode: data.barcode || null } : {}),
          ...(data.price !== undefined ? { price: Number(data.price) } : {}),
          ...(data.cost !== undefined ? { cost: data.cost == null ? null : Number(data.cost) } : {}),
          ...(data.vatRate !== undefined ? { tvaRate: data.vatRate } : {}),
          ...(data.minStock !== undefined ? { minStock: Math.max(0, Number(data.minStock)) } : {}),
          ...(data.maxStock !== undefined ? { maxStock: data.maxStock == null ? null : Math.max(0, Number(data.maxStock)) } : {}),
          ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
        },
      })

      if (data.stockQuantity !== undefined) {
        await prisma.stock.upsert({
          where: { productId: id },
          update: {
            quantity: Math.max(0, Number(data.stockQuantity ?? 0)),
            userId: ownerScopeId,
          },
          create: {
            quantity: Math.max(0, Number(data.stockQuantity ?? 0)),
            productId: id,
            userId: ownerScopeId,
          },
        })
      }

      const updatedProduct = await this.getCurrentSchemaProductRow(id, ownerScopeId)
      if (!updatedProduct) {
        throw new Error('Produit non trouvé après mise à jour')
      }

      logger.info('Produit mis à jour avec succès via le fallback Prisma courant', { productId: id })
      return this.normalizeCurrentSchemaProduct(updatedProduct)
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du produit', { error, id, data })
      throw error
    }
  }

  /**
   * Supprimer un produit
   */
  static async deleteProduct(id: string, ownerScopeId: string): Promise<void> {
    try {
      logger.info('Suppression du produit', { productId: id, ownerScopeId })

      try {
        const existingProduct = await prisma.product.findFirst({
          where: {
            id,
            userId: ownerScopeId,
          },
          select: { id: true },
        })

        if (existingProduct) {
          const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } })

          if (orderItemsCount > 0) {
            throw new Error(
              'Impossible de supprimer ce produit car il est utilisé dans des commandes ou factures'
            )
          }

          await prisma.stock.deleteMany({
            where: {
              productId: id,
              userId: ownerScopeId,
            },
          })

          await prisma.product.delete({
            where: { id },
          })

          logger.info('Produit supprimé avec succès via le schéma local courant', { productId: id })
          return
        }
      } catch (currentSchemaError) {
        if (
          currentSchemaError instanceof Error &&
          currentSchemaError.message === 'Impossible de supprimer ce produit car il est utilisé dans des commandes ou factures'
        ) {
          throw currentSchemaError
        }

        logger.warn('Fallback deleteProduct vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      // Vérifier que le produit existe et appartient à l'entreprise
      const existingProduct = await this.getProductById(id, ownerScopeId)
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
      if (isDatabaseUnavailableError(error)) {
        return getFallbackProductStats(companyId)
      }
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

