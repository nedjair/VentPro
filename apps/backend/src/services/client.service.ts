import { prisma, Prisma, Client, ClientType } from '@gestion/database'
import { PaginationParams, PaginationResponse } from '@gestion/shared'
import { logger } from '../utils/logger'

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

export class ClientService {
  /**
   * Créer un nouveau client
   */
  static async createClient(
    data: CreateClientData,
    companyId: string
  ): Promise<Client> {
    try {
      logger.info('Création d\'un nouveau client', { companyId, type: data.type })

      // Validation métier
      if (data.type === 'INDIVIDUAL' && (!data.firstName || !data.lastName)) {
        throw new Error('Le prénom et nom sont requis pour un particulier')
      }

      if (data.type === 'COMPANY' && !data.companyName) {
        throw new Error('Le nom de l\'entreprise est requis pour une société')
      }

      // Vérifier l'unicité de l'email dans l'entreprise
      if (data.email) {
        const existingClient = await prisma.client.findFirst({
          where: {
            email: data.email,
            companyId,
          },
        })

        if (existingClient) {
          throw new Error('Un client avec cet email existe déjà')
        }
      }

      // Vérifier l'unicité du SIRET
      if (data.siret) {
        const existingClient = await prisma.client.findFirst({
          where: {
            siret: data.siret,
            companyId,
          },
        })

        if (existingClient) {
          throw new Error('Un client avec ce SIRET existe déjà')
        }
      }

      const client = await prisma.client.create({
        data: {
          ...data,
          companyId,
          country: data.country || 'France',
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
  static async getClientById(id: string, companyId: string): Promise<Client | null> {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id,
          companyId,
        },
      })

      return client
    } catch (error) {
      logger.error('Erreur lors de la récupération du client', { error, id })
      throw error
    }
  }

  /**
   * Récupérer un client par email
   */
  static async getClientByEmail(email: string, companyId: string): Promise<Client | null> {
    try {
      const client = await prisma.client.findFirst({
        where: {
          email,
          companyId,
        },
      })

      return client
    } catch (error) {
      logger.error('Erreur lors de la récupération du client par email', { error, email, companyId })
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
    companyId: string
  ): Promise<Client> {
    try {
      logger.info('Mise à jour du client', { clientId: id, companyId })

      // Vérifier que le client existe et appartient à l'entreprise
      const existingClient = await this.getClientById(id, companyId)
      if (!existingClient) {
        throw new Error('Client non trouvé')
      }

      // Vérifier l'unicité de l'email si modifié
      if (data.email && data.email !== existingClient.email) {
        const emailExists = await prisma.client.findFirst({
          where: {
            email: data.email,
            companyId,
            id: { not: id },
          },
        })

        if (emailExists) {
          throw new Error('Un client avec cet email existe déjà')
        }
      }

      // Vérifier l'unicité du SIRET si modifié
      if (data.siret && data.siret !== existingClient.siret) {
        const siretExists = await prisma.client.findFirst({
          where: {
            siret: data.siret,
            companyId,
            id: { not: id },
          },
        })

        if (siretExists) {
          throw new Error('Un client avec ce SIRET existe déjà')
        }
      }

      const updatedClient = await prisma.client.update({
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
  static async deleteClient(id: string, companyId: string): Promise<void> {
    try {
      logger.info('Suppression du client', { clientId: id, companyId })

      // Vérifier que le client existe et appartient à l'entreprise
      const existingClient = await this.getClientById(id, companyId)
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

      await prisma.client.delete({
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


