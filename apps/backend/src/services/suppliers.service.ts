import { randomUUID } from 'crypto'
import { prisma } from '../lib/database'
import { logger } from '../utils/logger'

export interface SupplierFilters {
  search?: string
  type?: 'COMPANY' | 'INDIVIDUAL'
  isActive?: boolean
  isPreferred?: boolean
  country?: string
  tags?: string[]
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface SupplierData {
  name: string
  type?: 'COMPANY' | 'INDIVIDUAL'
  contactName?: string
  email?: string
  phone?: string
  mobile?: string
  website?: string
  fax?: string
  address?: string
  postalCode?: string
  city?: string
  country?: string
  siret?: string
  vatNumber?: string
  rcs?: string
  paymentTerms?: number
  discount?: number
  currency?: string
  rating?: number
  isActive?: boolean
  isPreferred?: boolean
  notes?: string
  tags?: string[]
}

export class SuppliersService {
  private legacySupplierColumns: Set<string> | null = null
  private legacyTableColumns = new Map<string, Set<string>>()

  private async getLegacyTableColumns(tableName: string): Promise<Set<string>> {
    if (this.legacyTableColumns.has(tableName)) {
      return this.legacyTableColumns.get(tableName)!
    }

    const rows = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    `

    const columns = new Set(rows.map((row) => row.column_name))
    this.legacyTableColumns.set(tableName, columns)
    return columns
  }

  private async getLegacySupplierColumns(): Promise<Set<string>> {
    if (this.legacySupplierColumns) {
      return this.legacySupplierColumns
    }

    this.legacySupplierColumns = await this.getLegacyTableColumns('Supplier')
    return this.legacySupplierColumns
  }

  private getLegacyOwnerColumn(columns: Set<string>) {
    if (columns.has('companyId')) {
      return 'companyId'
    }

    if (columns.has('userId')) {
      return 'userId'
    }

    return null
  }

  private buildLegacyAddress(supplierData: Partial<SupplierData>) {
    const addressLine = supplierData.address?.trim()
    const localityLine = [supplierData.postalCode?.trim(), supplierData.city?.trim()]
      .filter(Boolean)
      .join(' ')
      .trim()
    const countryLine = supplierData.country?.trim()

    const parts = [addressLine, localityLine || undefined, countryLine].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : undefined
  }

  private buildLegacySupplierPayload(
    ownerScopeId: string,
    supplierData: Partial<SupplierData>,
    availableColumns: Set<string>,
    options: { includeOwner?: boolean; includeDefaults?: boolean } = {}
  ) {
    const ownerColumn = this.getLegacyOwnerColumn(availableColumns)
    const payload: Record<string, any> = {}

    const setValue = (column: string, value: any) => {
      if (!availableColumns.has(column) || value === undefined) {
        return
      }

      payload[column] = value
    }

    if (options.includeOwner && ownerColumn) {
      payload[ownerColumn] = ownerScopeId
    }

    setValue('name', supplierData.name?.trim())
    setValue('type', supplierData.type)
    setValue('contactName', supplierData.contactName?.trim())
    setValue('email', supplierData.email?.trim())
    setValue('phone', supplierData.phone?.trim())
    setValue('mobile', supplierData.mobile?.trim())
    setValue('website', supplierData.website?.trim())
    setValue('fax', supplierData.fax?.trim())
    setValue('address', this.buildLegacyAddress(supplierData))
    setValue('postalCode', supplierData.postalCode?.trim())
    setValue('city', supplierData.city?.trim())
    setValue('country', supplierData.country?.trim())
    setValue('siret', supplierData.siret?.trim())
    setValue('vatNumber', supplierData.vatNumber?.trim())
    setValue('rcs', supplierData.rcs?.trim())
    setValue('paymentTerms', supplierData.paymentTerms)
    setValue('discount', supplierData.discount)
    setValue('currency', supplierData.currency?.trim())
    setValue('rating', supplierData.rating)
    setValue('isActive', supplierData.isActive)
    setValue('isPreferred', supplierData.isPreferred)
    setValue('notes', supplierData.notes?.trim())

    if (availableColumns.has('tags') && supplierData.tags !== undefined) {
      payload.tags = Array.isArray(supplierData.tags)
        ? supplierData.tags.join(',')
        : supplierData.tags
    }

    if (options.includeDefaults) {
      if (availableColumns.has('type') && payload.type === undefined) {
        payload.type = 'COMPANY'
      }

      if (availableColumns.has('country') && payload.country === undefined) {
        payload.country = 'Algérie'
      }

      if (availableColumns.has('currency') && payload.currency === undefined) {
        payload.currency = 'DZD'
      }

      if (availableColumns.has('paymentTerms') && payload.paymentTerms === undefined) {
        payload.paymentTerms = 30
      }

      if (availableColumns.has('discount') && payload.discount === undefined) {
        payload.discount = 0
      }

      if (availableColumns.has('rating') && payload.rating === undefined) {
        payload.rating = 0
      }

      if (availableColumns.has('isActive') && payload.isActive === undefined) {
        payload.isActive = true
      }

      if (availableColumns.has('isPreferred') && payload.isPreferred === undefined) {
        payload.isPreferred = false
      }
    }

    return payload
  }

  private async findLegacySupplierById(ownerScopeId: string, supplierId: string) {
    const availableColumns = await this.getLegacySupplierColumns()
    const ownerColumn = this.getLegacyOwnerColumn(availableColumns)

    if (!ownerColumn) {
      throw new Error('Impossible de déterminer la colonne de rattachement des fournisseurs')
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT *
        FROM "Supplier"
        WHERE "id" = $1
          AND "${ownerColumn}" = $2
        LIMIT 1
      `,
      supplierId,
      ownerScopeId
    )

    return {
      supplier: rows[0] || null,
      availableColumns,
      ownerColumn,
    }
  }

  private async ensureLegacySupplierUniqueness(
    ownerScopeId: string,
    availableColumns: Set<string>,
    field: 'email' | 'siret',
    value?: string,
    excludedSupplierId?: string
  ) {
    if (!value || !availableColumns.has(field)) {
      return
    }

    const ownerColumn = this.getLegacyOwnerColumn(availableColumns)

    if (!ownerColumn) {
      throw new Error('Impossible de déterminer la colonne de rattachement des fournisseurs')
    }

    const params: any[] = [ownerScopeId, value]
    let exclusionClause = ''

    if (excludedSupplierId) {
      params.push(excludedSupplierId)
      exclusionClause = ` AND "id" <> $${params.length}`
    }

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT "id"
        FROM "Supplier"
        WHERE "${ownerColumn}" = $1
          AND "${field}" = $2
          ${exclusionClause}
        LIMIT 1
      `,
      ...params
    )

    if (rows.length > 0) {
      throw new Error(
        field === 'email'
          ? 'Un fournisseur avec cet email existe déjà'
          : 'Un fournisseur avec ce SIRET existe déjà'
      )
    }
  }

  private async countLegacySupplierRelations(ownerScopeId: string, supplierId: string) {
    const productColumns = await this.getLegacyTableColumns('Product')
    const productOwnerColumn = this.getLegacyOwnerColumn(productColumns)

    const purchaseColumns = await this.getLegacyTableColumns('Purchase')
    const purchaseOwnerColumn = this.getLegacyOwnerColumn(purchaseColumns)

    let productsCount = 0
    let purchasesCount = 0

    if (productOwnerColumn && productColumns.has('supplierId')) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `
          SELECT COUNT(*)::int AS count
          FROM "Product"
          WHERE "supplierId" = $1
            AND "${productOwnerColumn}" = $2
        `,
        supplierId,
        ownerScopeId
      )

      productsCount = Number(rows[0]?.count || 0)
    }

    if (purchaseOwnerColumn && purchaseColumns.has('supplierId')) {
      const rows = await prisma.$queryRawUnsafe<any[]>(
        `
          SELECT COUNT(*)::int AS count
          FROM "Purchase"
          WHERE "supplierId" = $1
            AND "${purchaseOwnerColumn}" = $2
        `,
        supplierId,
        ownerScopeId
      )

      purchasesCount = Number(rows[0]?.count || 0)
    }

    return {
      productsCount: productsCount > 0 ? productsCount : purchasesCount,
      purchasesCount,
      linkedRecordsCount: productsCount + purchasesCount,
    }
  }

  private buildLegacySupplierValue(supplier: any, column: string, fallback: any) {
    return supplier[column] ?? fallback
  }

  private mapLegacySupplier(supplier: any) {
    const purchasesCount = Number(this.buildLegacySupplierValue(supplier, 'purchasesCount', 0))
    const productsCount = Number(
      this.buildLegacySupplierValue(supplier, 'productsCount', purchasesCount)
    )

    return {
      id: supplier.id,
      type: this.buildLegacySupplierValue(supplier, 'type', 'COMPANY'),
      name: supplier.name,
      contactName: this.buildLegacySupplierValue(supplier, 'contactName', ''),
      email: this.buildLegacySupplierValue(supplier, 'email', ''),
      phone: this.buildLegacySupplierValue(supplier, 'phone', ''),
      mobile: this.buildLegacySupplierValue(supplier, 'mobile', ''),
      website: this.buildLegacySupplierValue(supplier, 'website', ''),
      fax: this.buildLegacySupplierValue(supplier, 'fax', ''),
      address: this.buildLegacySupplierValue(supplier, 'address', ''),
      postalCode: this.buildLegacySupplierValue(supplier, 'postalCode', ''),
      city: this.buildLegacySupplierValue(supplier, 'city', ''),
      country: this.buildLegacySupplierValue(supplier, 'country', 'Algérie'),
      siret: this.buildLegacySupplierValue(supplier, 'siret', ''),
      vatNumber: this.buildLegacySupplierValue(supplier, 'vatNumber', ''),
      rcs: this.buildLegacySupplierValue(supplier, 'rcs', ''),
      paymentTerms: this.buildLegacySupplierValue(supplier, 'paymentTerms', 30),
      discount: Number(this.buildLegacySupplierValue(supplier, 'discount', 0)),
      currency: this.buildLegacySupplierValue(supplier, 'currency', 'DZD'),
      rating: this.buildLegacySupplierValue(supplier, 'rating', 0),
      isActive: supplier.isActive ?? true,
      isPreferred: supplier.isPreferred ?? false,
      notes: this.buildLegacySupplierValue(supplier, 'notes', ''),
      tags: Array.isArray(supplier.tags)
        ? supplier.tags
        : typeof supplier.tags === 'string' && supplier.tags.length > 0
          ? supplier.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : [],
      productsCount,
      purchasesCount,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    }
  }

  /**
   * Récupérer tous les fournisseurs avec filtres et pagination
   */
  async getSuppliers(
    ownerScopeId: string,
    filters: SupplierFilters = {},
    pagination?: PaginationOptions
  ) {
    try {
      logger.info(`Début getSuppliers - ownerScopeId: ${ownerScopeId}, filters: ${JSON.stringify(filters)}, pagination: ${JSON.stringify(pagination)}`)
      
      // Vérifier si la base de données est accessible
      try {
        // Tester la connexion avec une requête simple
        await prisma.$queryRaw`SELECT 1`
        logger.info('Connexion à la base de données OK')
      } catch (dbError) {
        logger.error('Erreur de connexion à la base de données:', dbError)
        // Propager l'erreur au lieu de retourner des données fictives
        throw new Error('Erreur de connexion à la base de données PostgreSQL')
      }
      
      const { page = 1, limit = 20 } = pagination || {};
      const skip = pagination ? (page - 1) * limit : undefined;
      const take = pagination ? limit : undefined;

      // Construction des filtres
      const where: any = {
        companyId: ownerScopeId,
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.isPreferred !== undefined && { isPreferred: filters.isPreferred }),
        ...(filters.type && { type: filters.type }),
        ...(filters.country && { country: filters.country }),
        // TODO: Corriger le filtre tags plus tard
        // ...(filters.tags && filters.tags.length > 0 && { ... })
      }

      logger.info(`Filtres construits: ${JSON.stringify(where)}`)

      // Recherche textuelle
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { contactName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { city: { contains: filters.search, mode: 'insensitive' } },
          { siret: { contains: filters.search, mode: 'insensitive' } }
        ]
      }

      logger.info(`Exécution de la requête Prisma avec where: ${JSON.stringify(where)}, skip: ${skip}, take: ${take}`)

      try {
        const [suppliers, total] = await Promise.all([
          prisma.supplier.findMany({
            where,
            skip,
            take,
            orderBy: [
              { isPreferred: 'desc' },
              { name: 'asc' }
            ]
          }),
          prisma.supplier.count({ where })
        ])

        const totalPages = pagination ? Math.ceil(total / limit) : 1;

        logger.info(`Récupération réussie de ${suppliers.length} fournisseurs (page ${page}/${totalPages})`)

        return {
          data: suppliers.map((supplier: any) => this.mapLegacySupplier(supplier)),
          pagination: {
            page,
            limit: pagination ? limit : total,
            total,
            totalPages,
            hasNext: pagination ? page < totalPages : false,
            hasPrev: page > 1
          }
        }
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour les fournisseurs', {
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const availableColumns = await this.getLegacySupplierColumns()
        const hasColumn = (column: string) => availableColumns.has(column)
        const ownerColumn = hasColumn('companyId') ? 'companyId' : hasColumn('userId') ? 'userId' : null

        if (!ownerColumn) {
          throw new Error('Impossible de déterminer la colonne de rattachement des fournisseurs')
        }

        const conditions: string[] = [`"${ownerColumn}" = $1`]
        const params: any[] = [ownerScopeId]

        if (filters.isActive !== undefined && hasColumn('isActive')) {
          params.push(filters.isActive)
          conditions.push(`COALESCE("isActive", true) = $${params.length}`)
        }

        if (filters.isPreferred !== undefined && hasColumn('isPreferred')) {
          params.push(filters.isPreferred)
          conditions.push(`COALESCE("isPreferred", false) = $${params.length}`)
        }

        if (filters.type && hasColumn('type')) {
          params.push(filters.type)
          conditions.push(`COALESCE("type", 'COMPANY') = $${params.length}`)
        }

        if (filters.country && hasColumn('country')) {
          params.push(filters.country)
          conditions.push(`COALESCE("country", '') ILIKE $${params.length}`)
        }

        if (filters.search) {
          const searchFields = [
            hasColumn('name') ? '"name"' : null,
            hasColumn('contactName') ? 'COALESCE("contactName", \'\')' : null,
            hasColumn('email') ? 'COALESCE("email", \'\')' : null,
            hasColumn('city') ? 'COALESCE("city", \'\')' : null,
            hasColumn('siret') ? 'COALESCE("siret", \'\')' : null,
          ].filter(Boolean) as string[]

          if (searchFields.length > 0) {
            params.push(`%${filters.search}%`)
            const searchIndex = params.length
            conditions.push(`(${searchFields.map((field) => `${field} ILIKE $${searchIndex}`).join(' OR ')})`)
          }
        }

        const limitClause = pagination ? ` LIMIT ${limit} OFFSET ${skip || 0}` : ''
        const orderByClause = hasColumn('isPreferred')
          ? 'COALESCE("isPreferred", false) DESC, "name" ASC'
          : '"name" ASC'
        const sql = `
          SELECT *, COUNT(*) OVER()::int AS "__total"
          FROM "Supplier"
          WHERE ${conditions.join(' AND ')}
          ORDER BY ${orderByClause}
          ${limitClause}
        `

        const suppliers = await prisma.$queryRawUnsafe<any[]>(sql, ...params)
        const total = suppliers[0]?.__total || 0
        const totalPages = pagination ? Math.ceil(total / limit) : 1

        return {
          data: suppliers.map((supplier) => this.mapLegacySupplier(supplier)),
          pagination: {
            page,
            limit: pagination ? limit : total,
            total,
            totalPages,
            hasNext: pagination ? page < totalPages : false,
            hasPrev: page > 1,
          },
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des fournisseurs:', error)
      // Propager l'erreur pour que le frontend puisse la gérer correctement
      throw error
    }
  }



  /**
   * Récupérer un fournisseur par ID
   */
  async getSupplierById(ownerScopeId: string, supplierId: string) {
    try {
      try {
        const supplier = await prisma.supplier.findFirst({
          where: {
            id: supplierId,
            companyId: ownerScopeId
          },
          include: {
            products: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
                stockQuantity: true,
                isActive: true
              },
              orderBy: {
                name: 'asc'
              }
            },
            _count: {
              select: {
                products: true
              }
            }
          }
        })

        if (!supplier) {
          throw new Error('Fournisseur non trouvé')
        }

        logger.info(`Fournisseur récupéré: ${supplier.name} (${supplier.id})`)
        return this.mapLegacySupplier({
          ...supplier,
          productsCount: supplier._count?.products || 0,
        })
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour le détail fournisseur', {
          supplierId,
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const { supplier } = await this.findLegacySupplierById(ownerScopeId, supplierId)

        if (!supplier) {
          throw new Error('Fournisseur non trouvé')
        }

        const relationCounts = await this.countLegacySupplierRelations(ownerScopeId, supplierId)

        logger.info(`Fournisseur récupéré (legacy): ${supplier.name} (${supplier.id})`)
        return this.mapLegacySupplier({
          ...supplier,
          ...relationCounts,
        })
      }
    } catch (error) {
      logger.error(`Erreur lors de la récupération du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Créer un nouveau fournisseur
   */
  async createSupplier(ownerScopeId: string, supplierData: SupplierData) {
    try {
      try {
        // Vérifier l'unicité du SIRET si fourni
        if (supplierData.siret) {
          const existingSiret = await prisma.supplier.findFirst({
            where: {
              siret: supplierData.siret,
              companyId: ownerScopeId
            }
          })

          if (existingSiret) {
            throw new Error('Un fournisseur avec ce SIRET existe déjà')
          }
        }

        // Vérifier l'unicité de l'email si fourni
        if (supplierData.email) {
          const existingEmail = await prisma.supplier.findFirst({
            where: {
              email: supplierData.email,
              companyId: ownerScopeId
            }
          })

          if (existingEmail) {
            throw new Error('Un fournisseur avec cet email existe déjà')
          }
        }

        const supplier = await prisma.supplier.create({
          data: {
            name: supplierData.name,
            type: supplierData.type || 'COMPANY',
            email: supplierData.email,
            phone: supplierData.phone,
            city: supplierData.city,
            country: supplierData.country || 'Algérie',
            isActive: supplierData.isActive !== undefined ? supplierData.isActive : true,
            companyId: ownerScopeId
          }
        })

        logger.info(`Nouveau fournisseur créé: ${supplier.name} (${supplier.id})`)
        return this.mapLegacySupplier(supplier)
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour la création fournisseur', {
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const availableColumns = await this.getLegacySupplierColumns()
        const ownerColumn = this.getLegacyOwnerColumn(availableColumns)

        if (!ownerColumn) {
          throw new Error('Impossible de déterminer la colonne de rattachement des fournisseurs')
        }

        await this.ensureLegacySupplierUniqueness(ownerScopeId, availableColumns, 'siret', supplierData.siret)
        await this.ensureLegacySupplierUniqueness(ownerScopeId, availableColumns, 'email', supplierData.email)

        const now = new Date()
        const insertData = {
          id: randomUUID(),
          ...this.buildLegacySupplierPayload(ownerScopeId, supplierData, availableColumns, {
            includeOwner: true,
            includeDefaults: true,
          }),
          ...(availableColumns.has('createdAt') ? { createdAt: now } : {}),
          ...(availableColumns.has('updatedAt') ? { updatedAt: now } : {}),
        }

        const columns = Object.keys(insertData)
        const values = Object.values(insertData)

        const createdSuppliers = await prisma.$queryRawUnsafe<any[]>(
          `
            INSERT INTO "Supplier" (${columns.map((column) => `"${column}"`).join(', ')})
            VALUES (${columns.map((_, index) => `$${index + 1}`).join(', ')})
            RETURNING *
          `,
          ...values
        )

        const createdSupplier = createdSuppliers[0]

        logger.info(`Nouveau fournisseur créé (legacy): ${createdSupplier.name} (${createdSupplier.id})`)
        return this.mapLegacySupplier(createdSupplier)
      }
    } catch (error) {
      logger.error('Erreur lors de la création du fournisseur:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un fournisseur
   */
  async updateSupplier(ownerScopeId: string, supplierId: string, supplierData: Partial<SupplierData>) {
    try {
      try {
        const existingSupplier: any = await prisma.supplier.findFirst({
          where: {
            id: supplierId,
            companyId: ownerScopeId
          }
        })

        if (!existingSupplier) {
          throw new Error('Fournisseur non trouvé')
        }

        if (supplierData.siret && supplierData.siret !== existingSupplier.siret) {
          const existingSiret = await prisma.supplier.findFirst({
            where: {
              siret: supplierData.siret,
              companyId: ownerScopeId,
              id: { not: supplierId }
            }
          })

          if (existingSiret) {
            throw new Error('Un fournisseur avec ce SIRET existe déjà')
          }
        }

        if (supplierData.email && supplierData.email !== existingSupplier.email) {
          const existingEmail = await prisma.supplier.findFirst({
            where: {
              email: supplierData.email,
              companyId: ownerScopeId,
              id: { not: supplierId }
            }
          })

          if (existingEmail) {
            throw new Error('Un fournisseur avec cet email existe déjà')
          }
        }

        const allowedFields = {
          type: supplierData.type,
          name: supplierData.name,
          email: supplierData.email,
          phone: supplierData.phone,
          mobile: supplierData.mobile,
          address: supplierData.address,
          postalCode: supplierData.postalCode,
          city: supplierData.city,
          country: supplierData.country,
          website: supplierData.website,
          siret: supplierData.siret,
          vatNumber: supplierData.vatNumber,
          rcs: supplierData.rcs,
          contactName: supplierData.contactName,
          fax: supplierData.fax,
          paymentTerms: supplierData.paymentTerms,
          discount: supplierData.discount,
          currency: supplierData.currency,
          rating: supplierData.rating,
          isActive: supplierData.isActive,
          isPreferred: supplierData.isPreferred,
          notes: supplierData.notes,
          tags: supplierData.tags ? (Array.isArray(supplierData.tags) ? supplierData.tags.join(',') : supplierData.tags) : undefined
        }

        const updateData = Object.fromEntries(
          Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
        )

        const supplier = await prisma.supplier.update({
          where: {
            id: supplierId
          },
          data: updateData,
          include: {
            _count: {
              select: {
                products: true
              }
            }
          }
        })

        logger.info(`Fournisseur mis à jour: ${supplier.name} (${supplier.id})`)
        return this.mapLegacySupplier({
          ...supplier,
          productsCount: supplier._count?.products || 0,
        })
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour la mise à jour fournisseur', {
          supplierId,
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const { supplier: existingSupplier, availableColumns, ownerColumn } = await this.findLegacySupplierById(ownerScopeId, supplierId)

        if (!existingSupplier) {
          throw new Error('Fournisseur non trouvé')
        }

        await this.ensureLegacySupplierUniqueness(ownerScopeId, availableColumns, 'siret', supplierData.siret, supplierId)
        await this.ensureLegacySupplierUniqueness(ownerScopeId, availableColumns, 'email', supplierData.email, supplierId)

        const updateData = {
          ...this.buildLegacySupplierPayload(ownerScopeId, supplierData, availableColumns),
          ...(availableColumns.has('updatedAt') ? { updatedAt: new Date() } : {}),
        }

        const entries = Object.entries(updateData).filter(([_, value]) => value !== undefined)

        if (entries.length === 0) {
          return this.mapLegacySupplier(existingSupplier)
        }

        const updatedSuppliers = await prisma.$queryRawUnsafe<any[]>(
          `
            UPDATE "Supplier"
            SET ${entries.map(([column], index) => `"${column}" = $${index + 1}`).join(', ')}
            WHERE "id" = $${entries.length + 1}
              AND "${ownerColumn}" = $${entries.length + 2}
            RETURNING *
          `,
          ...entries.map(([_, value]) => value),
          supplierId,
          ownerScopeId
        )

        const updatedSupplier = updatedSuppliers[0]

        logger.info(`Fournisseur mis à jour (legacy): ${updatedSupplier.name} (${updatedSupplier.id})`)
        return this.mapLegacySupplier(updatedSupplier)
      }
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Supprimer un fournisseur
   */
  async deleteSupplier(ownerScopeId: string, supplierId: string) {
    try {
      try {
        const existingSupplier = await prisma.supplier.findFirst({
          where: {
            id: supplierId,
            companyId: ownerScopeId
          },
          include: {
            _count: {
              select: {
                products: true
              }
            }
          }
        })

        if (!existingSupplier) {
          throw new Error('Fournisseur non trouvé')
        }

        if (existingSupplier._count.products > 0) {
          throw new Error('Impossible de supprimer un fournisseur ayant des produits associés')
        }

        await prisma.supplier.delete({
          where: {
            id: supplierId
          }
        })

        logger.info(`Fournisseur supprimé: ${existingSupplier.name} (${supplierId})`)
        return { success: true, message: 'Fournisseur supprimé avec succès' }
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour la suppression fournisseur', {
          supplierId,
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const { supplier: existingSupplier, ownerColumn } = await this.findLegacySupplierById(ownerScopeId, supplierId)

        if (!existingSupplier) {
          throw new Error('Fournisseur non trouvé')
        }

        const relationCounts = await this.countLegacySupplierRelations(ownerScopeId, supplierId)

        if (relationCounts.linkedRecordsCount > 0) {
          throw new Error('Impossible de supprimer un fournisseur ayant des achats ou produits associés')
        }

        await prisma.$executeRawUnsafe(
          `
            DELETE FROM "Supplier"
            WHERE "id" = $1
              AND "${ownerColumn}" = $2
          `,
          supplierId,
          ownerScopeId
        )

        logger.info(`Fournisseur supprimé (legacy): ${existingSupplier.name} (${supplierId})`)
        return { success: true, message: 'Fournisseur supprimé avec succès' }
      }
    } catch (error) {
      logger.error(`Erreur lors de la suppression du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Obtenir les statistiques des fournisseurs
   */
  async getSuppliersStats(ownerScopeId: string) {
    try {
      try {
        const [total, active, preferred, byType] = await Promise.all([
          prisma.supplier.count({ where: { companyId: ownerScopeId } }),
          prisma.supplier.count({ where: { companyId: ownerScopeId, isActive: true } }),
          prisma.supplier.count({ where: { companyId: ownerScopeId, isPreferred: true } }),
          prisma.supplier.groupBy({
            by: ['type'],
            where: { companyId: ownerScopeId },
            _count: true
          })
        ])

        const typeStats = byType.reduce((acc, item) => {
          acc[item.type] = item._count
          return acc
        }, {} as Record<string, number>)

        return {
          total,
          active,
          inactive: total - active,
          preferred,
          byType: typeStats
        }
      } catch (prismaError) {
        logger.warn('Fallback SQL legacy pour les statistiques fournisseurs', {
          error: prismaError instanceof Error ? prismaError.message : prismaError,
        })

        const availableColumns = await this.getLegacySupplierColumns()
        const hasColumn = (column: string) => availableColumns.has(column)
        const ownerColumn = hasColumn('companyId') ? 'companyId' : hasColumn('userId') ? 'userId' : null

        if (!ownerColumn) {
          throw new Error('Impossible de déterminer la colonne de rattachement des fournisseurs')
        }

        const activeExpr = hasColumn('isActive')
          ? 'COUNT(*) FILTER (WHERE COALESCE("isActive", true) = true)::int AS active'
          : 'COUNT(*)::int AS active'

        const preferredExpr = hasColumn('isPreferred')
          ? 'COUNT(*) FILTER (WHERE COALESCE("isPreferred", false) = true)::int AS preferred'
          : '0::int AS preferred'

        const statsRowPromise = prisma.$queryRawUnsafe<any[]>(`
          SELECT
            COUNT(*)::int AS total,
            ${activeExpr},
            ${preferredExpr}
          FROM "Supplier"
          WHERE "${ownerColumn}" = $1
        `, ownerScopeId)

        const typeRowsPromise = hasColumn('type')
          ? prisma.$queryRawUnsafe<any[]>(`
              SELECT COALESCE("type", 'COMPANY') AS type, COUNT(*)::int AS count
              FROM "Supplier"
              WHERE "${ownerColumn}" = $1
              GROUP BY COALESCE("type", 'COMPANY')
            `, ownerScopeId)
          : Promise.resolve([{ type: 'COMPANY', count: 0 }])

        const [statsRow, typeRows] = await Promise.all([
          statsRowPromise,
          typeRowsPromise,
        ])

        const typeStats = typeRows.reduce((acc, item) => {
          acc[item.type] = item.count
          return acc
        }, {} as Record<string, number>)

        if (!hasColumn('type') || Object.keys(typeStats).length === 0) {
          typeStats.COMPANY = statsRow[0]?.total || 0
        }

        return {
          total: statsRow[0]?.total || 0,
          active: statsRow[0]?.active || 0,
          inactive: (statsRow[0]?.total || 0) - (statsRow[0]?.active || 0),
          preferred: statsRow[0]?.preferred || 0,
          byType: typeStats,
        }
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques fournisseurs:', error)
      throw new Error('Impossible de récupérer les statistiques')
    }
  }
}

export const suppliersService = new SuppliersService()


