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
  /**
   * Récupérer tous les fournisseurs avec filtres et pagination
   */
  async getSuppliers(
    companyId: string,
    filters: SupplierFilters = {},
    pagination?: PaginationOptions
  ) {
    try {
      logger.info(`Début getSuppliers - companyId: ${companyId}, filters: ${JSON.stringify(filters)}, pagination: ${JSON.stringify(pagination)}`)
      
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
        companyId,
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.isPreferred !== undefined && { isPreferred: filters.isPreferred }),
        ...(filters.type && { type: filters.type }),
        ...(filters.country && { country: filters.country }),
        ...(filters.tags && filters.tags.length > 0 && {
          tags: {
            hasSome: filters.tags
          }
        })
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
            ],
            include: {
              products: {
                select: {
                  id: true,
                  name: true,
                  sku: true
                },
                take: 5
              },
              _count: {
                select: {
                  products: true
                }
              }
            }
          }),
          prisma.supplier.count({ where })
        ])

        const totalPages = pagination ? Math.ceil(total / limit) : 1;

        logger.info(`Récupération réussie de ${suppliers.length} fournisseurs (page ${page}/${totalPages})`)

        return {
          data: suppliers,
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
        logger.error('Erreur Prisma lors de la récupération des fournisseurs:', prismaError)
        // Propager l'erreur au lieu de retourner des données fictives
        throw new Error('Erreur lors de la récupération des fournisseurs depuis la base de données')
      }
    } catch (error) {
      logger.error('Erreur lors de la récupération des fournisseurs:', error)
      // Propager l'erreur pour que le frontend puisse la gérer correctement
      throw error
    }
  }

  // Méthode pour générer des données fictives
  private getMockSuppliers(pagination: PaginationOptions = {}) {
    const { page = 1, limit = 20 } = pagination
    
    const mockSuppliers = [
      {
        id: '1',
        name: 'TechCorp Solutions',
        type: 'COMPANY',
        contactName: 'Marie Dubois',
        email: 'contact@techcorp.fr',
        phone: '01 23 45 67 89',
        city: 'Paris',
        country: 'France',
        isActive: true,
        isPreferred: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 'company-test',
        _count: {
          products: 25
        },
        products: []
      },
      {
        id: '2',
        name: 'Fournitures Bureau Plus',
        type: 'COMPANY',
        contactName: 'Jean Martin',
        email: 'commandes@bureauplus.fr',
        phone: '01 98 76 54 32',
        city: 'Lyon',
        country: 'France',
        isActive: true,
        isPreferred: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 'company-test',
        _count: {
          products: 12
        },
        products: []
      },
      {
        id: '3',
        name: 'Électronique Pro',
        type: 'COMPANY',
        contactName: 'Sophie Leroy',
        email: 'contact@electroniquepro.fr',
        phone: '01 45 67 89 10',
        city: 'Marseille',
        country: 'France',
        isActive: true,
        isPreferred: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 'company-test',
        _count: {
          products: 18
        },
        products: []
      }
    ]

    logger.info(`Retour de ${mockSuppliers.length} fournisseurs fictifs`)

    return {
      data: mockSuppliers,
      pagination: {
        page,
        limit,
        total: mockSuppliers.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false
      }
    }
  }

  /**
   * Récupérer un fournisseur par ID
   */
  async getSupplierById(companyId: string, supplierId: string) {
    try {
      const supplier = await prisma.supplier.findFirst({
        where: {
          id: supplierId,
          companyId
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
      return supplier
    } catch (error) {
      logger.error(`Erreur lors de la récupération du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Créer un nouveau fournisseur
   */
  async createSupplier(companyId: string, supplierData: SupplierData) {
    try {
      // Vérifier l'unicité du SIRET si fourni
      if (supplierData.siret) {
        const existingSiret = await prisma.supplier.findFirst({
          where: {
            siret: supplierData.siret,
            companyId
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
            companyId
          }
        })

        if (existingEmail) {
          throw new Error('Un fournisseur avec cet email existe déjà')
        }
      }

      const supplier = await prisma.supplier.create({
        data: {
          type: supplierData.type || 'COMPANY',
          name: supplierData.name,
          email: supplierData.email,
          phone: supplierData.phone,
          mobile: supplierData.mobile,
          address: supplierData.address,
          postalCode: supplierData.postalCode,
          city: supplierData.city,
          country: supplierData.country || 'France',
          website: supplierData.website,
          siret: supplierData.siret,
          vatNumber: supplierData.vatNumber,
          rcs: supplierData.rcs,
          contactName: supplierData.contactName,
          fax: supplierData.fax,
          paymentTerms: supplierData.paymentTerms || 30,
          discount: supplierData.discount || 0,
          currency: supplierData.currency || 'EUR',
          rating: supplierData.rating || 0,
          isActive: supplierData.isActive !== undefined ? supplierData.isActive : true,
          isPreferred: supplierData.isPreferred || false,
          notes: supplierData.notes,
          tags: supplierData.tags,
          companyId
        },
        include: {
          _count: {
            select: {
              products: true
            }
          }
        }
      })

      logger.info(`Nouveau fournisseur créé: ${supplier.name} (${supplier.id})`)
      return supplier
    } catch (error) {
      logger.error('Erreur lors de la création du fournisseur:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un fournisseur
   */
  async updateSupplier(companyId: string, supplierId: string, supplierData: Partial<SupplierData>) {
    try {
      // Vérifier que le fournisseur existe
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          id: supplierId,
          companyId
        }
      })

      if (!existingSupplier) {
        throw new Error('Fournisseur non trouvé')
      }

      // Vérifier l'unicité du SIRET si modifié
      if (supplierData.siret && supplierData.siret !== existingSupplier.siret) {
        const existingSiret = await prisma.supplier.findFirst({
          where: {
            siret: supplierData.siret,
            companyId,
            id: { not: supplierId }
          }
        })

        if (existingSiret) {
          throw new Error('Un fournisseur avec ce SIRET existe déjà')
        }
      }

      // Vérifier l'unicité de l'email si modifié
      if (supplierData.email && supplierData.email !== existingSupplier.email) {
        const existingEmail = await prisma.supplier.findFirst({
          where: {
            email: supplierData.email,
            companyId,
            id: { not: supplierId }
          }
        })

        if (existingEmail) {
          throw new Error('Un fournisseur avec cet email existe déjà')
        }
      }

      // Filtrer les champs autorisés
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
        tags: supplierData.tags
      }

      // Supprimer les champs undefined
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
      return supplier
    } catch (error) {
      logger.error(`Erreur lors de la mise à jour du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Supprimer un fournisseur
   */
  async deleteSupplier(companyId: string, supplierId: string) {
    try {
      // Vérifier que le fournisseur existe
      const existingSupplier = await prisma.supplier.findFirst({
        where: {
          id: supplierId,
          companyId
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

      // Vérifier qu'aucun produit n'est lié à ce fournisseur
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
    } catch (error) {
      logger.error(`Erreur lors de la suppression du fournisseur ${supplierId}:`, error)
      throw error
    }
  }

  /**
   * Obtenir les statistiques des fournisseurs
   */
  async getSuppliersStats(companyId: string) {
    try {
      const [total, active, preferred, byType] = await Promise.all([
        prisma.supplier.count({ where: { companyId } }),
        prisma.supplier.count({ where: { companyId, isActive: true } }),
        prisma.supplier.count({ where: { companyId, isPreferred: true } }),
        prisma.supplier.groupBy({
          by: ['type'],
          where: { companyId },
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
    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques fournisseurs:', error)
      throw new Error('Impossible de récupérer les statistiques')
    }
  }
}

export const suppliersService = new SuppliersService()


