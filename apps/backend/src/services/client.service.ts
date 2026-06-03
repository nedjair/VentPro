import { prisma } from '../lib/prisma'
import { Prisma, Client, ClientType } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'
import { getFallbackClientById, getFallbackClientStats, getFallbackClients, isDatabaseUnavailableError } from './dev-fallback-data.service'

export interface CreateClientData {
  type: ClientType
  firstName?: string
  lastName?: string
  companyName?: string
  email?: string
  phone?: string
  mobile?: string
  address?: string
  postalCode?: string
  city?: string
  country?: string
  siret?: string
  vatNumber?: string
  paymentTerms?: number
  discount?: number
  // Nouvelles propriétés
  website?: string
  fax?: string
  billingAddress?: string
  billingPostalCode?: string
  billingCity?: string
  billingCountry?: string
  creditLimit?: number
  isActive?: boolean
  notes?: string
  tags?: string[]
}

export interface UpdateClientData extends Partial<CreateClientData> {}

export interface ClientFilters {
  search?: string
  type?: ClientType
  city?: string
  country?: string
  isActive?: boolean
  tags?: string[]
  creditLimitMin?: number
  creditLimitMax?: number
  createdAfter?: string
  createdBefore?: string
}

export interface InteractionData {
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'ORDER' | 'INVOICE'
  subject: string
  description?: string
  date?: string
  userId?: string
}

interface CurrentSchemaClientRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  createdAt: Date
  updatedAt: Date
  userId: string
}

export class ClientService {
  private static normalizeCurrentSchemaClient(client: CurrentSchemaClientRow): Client {
    return {
      id: client.id,
      type: 'COMPANY',
      firstName: null,
      lastName: null,
      companyName: client.name,
      email: client.email || '',
      phone: client.phone || undefined,
      address: client.address || undefined,
      postalCode: undefined,
      city: undefined,
      country: undefined,
      notes: undefined,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    } as unknown as Client
  }

  private static buildClientName(data: Partial<CreateClientData>, fallback = ''): string {
    const companyName = data.companyName?.trim()
    const individualName = `${data.firstName?.trim() || ''} ${data.lastName?.trim() || ''}`.trim()

    if (data.type === 'COMPANY') {
      return companyName || fallback
    }

    if (data.type === 'INDIVIDUAL') {
      return individualName || fallback
    }

    return companyName || individualName || fallback
  }

  /**
   * Créer un nouveau client
   */
  static async createClient(
    data: CreateClientData,
    ownerScopeId: string
  ): Promise<Client> {
    try {
      logger.info('Création d\'un nouveau client', { ownerScopeId, type: data.type })

      // Validation métier
      if (data.type === 'INDIVIDUAL' && (!data.firstName || !data.lastName)) {
        throw new Error('Le prénom et nom sont requis pour un particulier')
      }

      if (data.type === 'COMPANY' && !data.companyName) {
        throw new Error('Le nom de l\'entreprise est requis pour une société')
      }

      const normalizedName = this.buildClientName(data)
      if (!normalizedName) {
        throw new Error('Le nom du client est requis')
      }

      try {
        if (data.email) {
          const existingClient = await prisma.client.findFirst({
            where: {
              email: data.email,
              userId: ownerScopeId,
            },
          })

          if (existingClient) {
            throw new Error('Un client avec cet email existe déjà')
          }
        }

        const client = await prisma.client.create({
          data: {
            name: normalizedName,
            email: data.email?.trim() || null,
            phone: data.phone?.trim() || null,
            address: data.address?.trim() || null,
            userId: ownerScopeId,
          },
        })

        logger.info('Client créé avec succès via le schéma local courant', { clientId: client.id })
        return this.normalizeCurrentSchemaClient(client)
      } catch (currentSchemaError) {
        if (currentSchemaError instanceof Error && currentSchemaError.message === 'Un client avec cet email existe déjà') {
          throw currentSchemaError
        }
        logger.warn('Fallback createClient vers schéma legacy', { error: currentSchemaError, ownerScopeId })
      }

      // Vérifier l'unicité de l'email dans l'entreprise
      if (data.email) {
        const existingClient = await (prisma.client as any).findFirst({
          where: {
            email: data.email,
            companyId: ownerScopeId,
          },
        })

        if (existingClient) {
          throw new Error('Un client avec cet email existe déjà')
        }
      }

      // Vérifier l'unicité du SIRET
      if (data.siret) {
        const existingClient = await (prisma.client as any).findFirst({
          where: {
            siret: data.siret,
            companyId: ownerScopeId,
          },
        })

        if (existingClient) {
          throw new Error('Un client avec ce SIRET existe déjà')
        }
      }

      const client = await (prisma.client as any).create({
        data: {
          ...data,
          companyId: ownerScopeId,
          country: data.country || 'Algérie',
          paymentTerms: data.paymentTerms || 30,
          discount: data.discount || 0,
        },
      })

      logger.info('Client créé avec succès', { clientId: client.id })
      return client
    } catch (error) {
      logger.error('Erreur lors de la création du client', { error, data })
      throw error
    }
  }

  /**
   * Récupérer un client par ID
   */
  static async getClientById(id: string, ownerScopeId: string): Promise<Client | null> {
    try {
      try {
        const client = await prisma.client.findFirst({
          where: {
            id,
            userId: ownerScopeId,
          },
        })

        if (client) {
          return this.normalizeCurrentSchemaClient(client)
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback getClientById vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      const client = await (prisma.client as any).findFirst({
        where: {
          id,
          companyId: ownerScopeId,
        },
      })

      return client
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackClientById(ownerScopeId, id) as unknown as Client | null
      }
      logger.error('Erreur lors de la récupération du client', { error, id })
      throw error
    }
  }

  /**
   * Récupérer un client par email
   */
  static async getClientByEmail(email: string, ownerScopeId: string): Promise<Client | null> {
    try {
      try {
        const client = await prisma.client.findFirst({
          where: {
            email,
            userId: ownerScopeId,
          },
        })

        if (client) {
          return this.normalizeCurrentSchemaClient(client)
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback getClientByEmail vers schéma legacy', { error: currentSchemaError, email, ownerScopeId })
      }

      const client = await (prisma.client as any).findFirst({
        where: {
          email,
          companyId: ownerScopeId,
        },
      })

      return client
    } catch (error) {
      logger.error('Erreur lors de la récupération du client par email', { error, email, ownerScopeId })
      throw error
    }
  }

  /**
   * Récupérer la liste des clients avec pagination et filtres
   */
  static async getClients(
    companyId: string,
    filters: ClientFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginationResponse<Client>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = pagination || {};

      const { search, type, city, country, isActive } = filters

      // 1) Schéma PostgreSQL réellement observé en local :
      //    table `Client` liée à l'utilisateur via `userId`.
      //    Le modèle courant est plus simple que l'ancien schéma Prisma legacy,
      //    on normalise donc les données pour rester compatible avec le frontend.
      try {
        const searchTerm = search?.trim()

        const clients = searchTerm
          ? await prisma.$queryRaw<Array<any>>`
              SELECT
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                c."createdAt",
                c."updatedAt",
                c."userId"
              FROM "Client" c
              WHERE c."userId" = ${companyId}
                AND (
                  LOWER(COALESCE(c.name, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.email, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.phone, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.address, '')) LIKE LOWER(${`%${searchTerm}%`})
                )
              ORDER BY c."createdAt" DESC
              LIMIT ${limit}
              OFFSET ${Math.max(0, (page - 1) * limit)}
            `
          : await prisma.$queryRaw<Array<any>>`
              SELECT
                c.id,
                c.name,
                c.email,
                c.phone,
                c.address,
                c."createdAt",
                c."updatedAt",
                c."userId"
              FROM "Client" c
              WHERE c."userId" = ${companyId}
              ORDER BY c."createdAt" DESC
              LIMIT ${limit}
              OFFSET ${Math.max(0, (page - 1) * limit)}
            `

        const totalRows = searchTerm
          ? await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
              SELECT COUNT(*) AS count
              FROM "Client" c
              WHERE c."userId" = ${companyId}
                AND (
                  LOWER(COALESCE(c.name, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.email, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.phone, '')) LIKE LOWER(${`%${searchTerm}%`})
                  OR LOWER(COALESCE(c.address, '')) LIKE LOWER(${`%${searchTerm}%`})
                )
            `
          : await prisma.$queryRaw<Array<{ count: bigint | number | string }>>`
              SELECT COUNT(*) AS count
              FROM "Client" c
              WHERE c."userId" = ${companyId}
            `

        const total = Number(totalRows[0]?.count || 0)

        const normalizedClients = clients.map((client) => ({
          id: client.id,
          type: 'COMPANY',
          firstName: null,
          lastName: null,
          companyName: client.name,
          email: client.email,
          phone: client.phone,
          address: client.address,
          postalCode: null,
          city: null,
          country: null,
          notes: null,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt,
        })) as Client[]

        return {
          data: normalizedClients,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        }
      } catch (currentSchemaError) {
        logger.warn('Fallback clients : schéma PostgreSQL actuel non accessible via SQL brut', { error: currentSchemaError })
      }

      // Construction de la clause WHERE
      const where: Prisma.ClientWhereInput = {
        companyId,
        ...(type && { type }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(country && { country: { contains: country, mode: 'insensitive' } }),
        ...(isActive !== undefined && { isActive }),
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }),
      }

      const skip = pagination ? Math.max(0, (page - 1) * limit) : undefined;
      const take = pagination ? Math.max(1, limit) : undefined;

      // Requêtes parallèles pour les données et le count
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.client.count({ where }),
      ])

      const totalPages = pagination ? Math.ceil(total / limit) : 1;

      return {
        data: clients,
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
      if (isDatabaseUnavailableError(error)) {
        return getFallbackClients(companyId, filters, pagination) as unknown as PaginationResponse<Client>
      }
      logger.error('Erreur lors de la récupération des clients', { error, filters })
      throw error
    }
  }

  /**
   * Mettre à jour un client
   */
  static async updateClient(
    id: string,
    data: UpdateClientData,
    ownerScopeId: string
  ): Promise<Client> {
    try {
      logger.info('Mise à jour du client', { clientId: id, ownerScopeId })

      try {
        const existingClient = await prisma.client.findFirst({
          where: {
            id,
            userId: ownerScopeId,
          },
        })

        if (existingClient) {
          if (data.email && data.email !== existingClient.email) {
            const emailExists = await prisma.client.findFirst({
              where: {
                email: data.email,
                userId: ownerScopeId,
                id: { not: id },
              },
            })

            if (emailExists) {
              throw new Error('Un client avec cet email existe déjà')
            }
          }

          const updatedClient = await prisma.client.update({
            where: { id },
            data: {
              name: this.buildClientName(data, existingClient.name),
              email: data.email !== undefined ? data.email?.trim() || null : undefined,
              phone: data.phone !== undefined ? data.phone?.trim() || null : undefined,
              address: data.address !== undefined ? data.address?.trim() || null : undefined,
            },
          })

          logger.info('Client mis à jour avec succès via le schéma local courant', { clientId: id })
          return this.normalizeCurrentSchemaClient(updatedClient)
        }
      } catch (currentSchemaError) {
        if (currentSchemaError instanceof Error && currentSchemaError.message === 'Un client avec cet email existe déjà') {
          throw currentSchemaError
        }
        logger.warn('Fallback updateClient vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      // Vérifier que le client existe et appartient à l'entreprise
      const existingClient = await this.getClientById(id, ownerScopeId)
      if (!existingClient) {
        throw new Error('Client non trouvé')
      }

      // Vérifier l'unicité de l'email si modifié
      if (data.email && data.email !== existingClient.email) {
        const emailExists = await (prisma.client as any).findFirst({
          where: {
            email: data.email,
            companyId: ownerScopeId,
            id: { not: id },
          },
        })

        if (emailExists) {
          throw new Error('Un client avec cet email existe déjà')
        }
      }

      // Vérifier l'unicité du SIRET si modifié
      if (data.siret && data.siret !== existingClient.siret) {
        const siretExists = await (prisma.client as any).findFirst({
          where: {
            siret: data.siret,
            companyId: ownerScopeId,
            id: { not: id },
          },
        })

        if (siretExists) {
          throw new Error('Un client avec ce SIRET existe déjà')
        }
      }

      const updatedClient = await (prisma.client as any).update({
        where: { id },
        data,
      })

      logger.info('Client mis à jour avec succès', { clientId: id })
      return updatedClient
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du client', { error, id, data })
      throw error
    }
  }

  /**
   * Supprimer un client
   */
  static async deleteClient(id: string, ownerScopeId: string): Promise<void> {
    try {
      logger.info('Suppression du client', { clientId: id, ownerScopeId })

      try {
        const existingClient = await prisma.client.findFirst({
          where: {
            id,
            userId: ownerScopeId,
          },
        })

        if (existingClient) {
          const [ordersCount, invoicesCount] = await Promise.all([
            prisma.order.count({ where: { clientId: id, userId: ownerScopeId } }),
            prisma.invoice.count({ where: { clientId: id, userId: ownerScopeId } }),
          ])

          if (ordersCount > 0 || invoicesCount > 0) {
            throw new Error(
              'Impossible de supprimer ce client car il a des commandes ou factures associées'
            )
          }

          await prisma.client.delete({
            where: { id },
          })

          logger.info('Client supprimé avec succès via le schéma local courant', { clientId: id })
          return
        }
      } catch (currentSchemaError) {
        if (
          currentSchemaError instanceof Error &&
          currentSchemaError.message === 'Impossible de supprimer ce client car il a des commandes ou factures associées'
        ) {
          throw currentSchemaError
        }
        logger.warn('Fallback deleteClient vers schéma legacy', { error: currentSchemaError, id, ownerScopeId })
      }

      // Vérifier que le client existe et appartient à l'entreprise
      const existingClient = await this.getClientById(id, ownerScopeId)
      if (!existingClient) {
        throw new Error('Client non trouvé')
      }

      // Vérifier qu'il n'y a pas de commandes ou factures liées
      const [ordersCount, invoicesCount] = await Promise.all([
        prisma.order.count({ where: { clientId: id } }),
        prisma.invoice.count({ where: { clientId: id } }),
      ])

      if (ordersCount > 0 || invoicesCount > 0) {
        throw new Error(
          'Impossible de supprimer ce client car il a des commandes ou factures associées'
        )
      }

      await (prisma.client as any).delete({
        where: { id },
      })

      logger.info('Client supprimé avec succès', { clientId: id })
    } catch (error) {
      logger.error('Erreur lors de la suppression du client', { error, id })
      throw error
    }
  }

  /**
   * Rechercher des clients par nom/email
   */
  static async searchClients(
    companyId: string,
    query: string,
    limit = 10
  ): Promise<Client[]> {
    try {
      const clients = await prisma.client.findMany({
        where: {
          companyId,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      })

      return clients
    } catch (error) {
      logger.error('Erreur lors de la recherche de clients', { error, query })
      throw error
    }
  }

  /**
   * Obtenir les statistiques des clients
   */
  static async getClientStats(companyId: string) {
    try {
      const [total, individuals, companies, recentCount] = await Promise.all([
        prisma.client.count({ where: { companyId } }),
        prisma.client.count({ where: { companyId, type: 'INDIVIDUAL' } }),
        prisma.client.count({ where: { companyId, type: 'COMPANY' } }),
        prisma.client.count({
          where: {
            companyId,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 jours
            },
          },
        }),
      ])

      return {
        total,
        individuals,
        companies,
        recentCount,
      }
    } catch (error) {
      if (isDatabaseUnavailableError(error)) {
        return getFallbackClientStats(companyId)
      }
      logger.error('Erreur lors du calcul des statistiques clients', { error })
      throw error
    }
  }

  /**
   * Ajouter une interaction à l'historique d'un client
   */
  static async addClientInteraction(
    clientId: string,
    data: InteractionData,
    companyId: string
  ) {
    try {
      logger.info('Ajout d\'une interaction client', { clientId, companyId })

      // Vérifier que le client existe et appartient à l'entreprise
      const client = await this.getClientById(clientId, companyId)
      if (!client) {
        throw new Error('Client non trouvé')
      }

      const interaction = await prisma.clientInteraction.create({
        data: {
          clientId,
          type: data.type,
          subject: data.subject,
          description: data.description,
          date: data.date ? new Date(data.date) : new Date(),
          userId: data.userId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      logger.info('Interaction ajoutée avec succès', { interactionId: interaction.id })
      return interaction
    } catch (error) {
      logger.error('Erreur lors de l\'ajout de l\'interaction', { error, clientId, data })
      throw error
    }
  }

  /**
   * Récupérer l'historique des interactions d'un client
   */
  static async getClientInteractions(
    clientId: string,
    companyId: string,
    options: { page?: number; limit?: number; type?: string } = {}
  ) {
    try {
      const { page = 1, limit = 20, type } = options

      // Vérifier que le client existe et appartient à l'entreprise
      const client = await this.getClientById(clientId, companyId)
      if (!client) {
        throw new Error('Client non trouvé')
      }

      const where: any = { clientId }
      if (type) {
        where.type = type
      }

      const [interactions, total] = await Promise.all([
        prisma.clientInteraction.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { date: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.clientInteraction.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: interactions,
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
      logger.error('Erreur lors de la récupération des interactions', { error, clientId })
      throw error
    }
  }

  /**
   * Récupérer l'historique des commandes d'un client
   */
  static async getClientOrders(
    clientId: string,
    companyId: string,
    options: { page?: number; limit?: number; status?: string } = {}
  ) {
    try {
      const { page = 1, limit = 10, status } = options

      // Vérifier que le client existe et appartient à l'entreprise
      const client = await this.getClientById(clientId, companyId)
      if (!client) {
        throw new Error('Client non trouvé')
      }

      const where: any = { clientId, companyId }
      if (status) {
        where.status = status
      }

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
          where,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.order.count({ where }),
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: orders,
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
      logger.error('Erreur lors de la récupération des commandes client', { error, clientId })
      throw error
    }
  }
}

