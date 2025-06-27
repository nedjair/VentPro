import { prisma } from '../lib/database'
import { logger } from '../utils/logger'

export interface ClientFilters {
  search?: string
  type?: 'INDIVIDUAL' | 'COMPANY'
  city?: string
  isActive?: boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
}

export interface ClientData {
  type: 'INDIVIDUAL' | 'COMPANY'
  firstName?: string
  lastName?: string
  companyName?: string
  email: string
  phone?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  notes?: string
  isActive?: boolean
}

export class ClientsService {
  /**
   * Récupérer tous les clients avec filtres et pagination
   */
  async getClients(
    companyId: string,
    filters: ClientFilters = {},
    pagination: PaginationOptions = {}
  ) {
    try {
      const { search, type, city, isActive } = filters
      const { page = 1, limit = 10 } = pagination

      const skip = (page - 1) * limit

      // Construire les conditions de filtrage
      const where: any = {
        companyId,
        ...(search && {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(type && { type }),
        ...(city && { city: { contains: city, mode: 'insensitive' } }),
        ...(typeof isActive === 'boolean' && { isActive })
      }

      // Récupérer les clients avec pagination
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.client.count({ where })
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        data: clients,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des clients:', error)
      throw new Error('Erreur lors de la récupération des clients')
    }
  }

  /**
   * Récupérer un client par ID
   */
  async getClientById(clientId: string, companyId: string) {
    try {
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId
        },
        include: {
          orders: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              number: true,
              type: true,
              status: true,
              total: true,
              orderDate: true
            }
          },
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              number: true,
              type: true,
              status: true,
              total: true,
              invoiceDate: true,
              dueDate: true
            }
          }
        }
      })

      if (!client) {
        throw new Error('Client non trouvé')
      }

      return client

    } catch (error) {
      logger.error('Erreur lors de la récupération du client:', error)
      throw error
    }
  }

  /**
   * Créer un nouveau client
   */
  async createClient(companyId: string, clientData: ClientData) {
    try {
      // Vérifier si l'email existe déjà
      const existingClient = await prisma.client.findFirst({
        where: {
          email: clientData.email,
          companyId
        }
      })

      if (existingClient) {
        throw new Error('Un client avec cet email existe déjà')
      }

      const client = await prisma.client.create({
        data: {
          ...clientData,
          companyId
        }
      })

      logger.info(`Nouveau client créé: ${client.email} (${client.id})`)
      return client

    } catch (error) {
      logger.error('Erreur lors de la création du client:', error)
      throw error
    }
  }

  /**
   * Mettre à jour un client
   */
  async updateClient(clientId: string, companyId: string, clientData: Partial<ClientData>) {
    try {
      // Vérifier que le client appartient à l'entreprise
      const existingClient = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId
        }
      })

      if (!existingClient) {
        throw new Error('Client non trouvé')
      }

      // Vérifier l'unicité de l'email si modifié
      if (clientData.email && clientData.email !== existingClient.email) {
        const emailExists = await prisma.client.findFirst({
          where: {
            email: clientData.email,
            companyId,
            id: { not: clientId }
          }
        })

        if (emailExists) {
          throw new Error('Un client avec cet email existe déjà')
        }
      }

      const client = await prisma.client.update({
        where: { id: clientId },
        data: clientData
      })

      logger.info(`Client mis à jour: ${client.email} (${client.id})`)
      return client

    } catch (error) {
      logger.error('Erreur lors de la mise à jour du client:', error)
      throw error
    }
  }

  /**
   * Supprimer un client (soft delete)
   */
  async deleteClient(clientId: string, companyId: string) {
    try {
      // Vérifier que le client appartient à l'entreprise
      const existingClient = await prisma.client.findFirst({
        where: {
          id: clientId,
          companyId
        }
      })

      if (!existingClient) {
        throw new Error('Client non trouvé')
      }

      // Vérifier s'il y a des commandes ou factures liées
      const [ordersCount, invoicesCount] = await Promise.all([
        prisma.order.count({ where: { clientId } }),
        prisma.invoice.count({ where: { clientId } })
      ])

      if (ordersCount > 0 || invoicesCount > 0) {
        // Soft delete - marquer comme inactif
        const client = await prisma.client.update({
          where: { id: clientId },
          data: { isActive: false }
        })

        logger.info(`Client désactivé: ${client.email} (${client.id})`)
        return client
      } else {
        // Suppression complète si aucune donnée liée
        await prisma.client.delete({
          where: { id: clientId }
        })

        logger.info(`Client supprimé: ${existingClient.email} (${clientId})`)
        return existingClient
      }

    } catch (error) {
      logger.error('Erreur lors de la suppression du client:', error)
      throw error
    }
  }

  /**
   * Rechercher des clients par nom ou email
   */
  async searchClients(companyId: string, query: string, limit: number = 10) {
    try {
      const clients = await prisma.client.findMany({
        where: {
          companyId,
          isActive: true,
          OR: [
            { firstName: { contains: query, mode: 'insensitive' } },
            { lastName: { contains: query, mode: 'insensitive' } },
            { companyName: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })

      return clients

    } catch (error) {
      logger.error('Erreur lors de la recherche de clients:', error)
      throw error
    }
  }

  /**
   * Récupérer les statistiques des clients
   */
  async getClientsStats(companyId: string) {
    try {
      const [
        totalClients,
        activeClients,
        individualClients,
        companyClients,
        recentClients
      ] = await Promise.all([
        prisma.client.count({ where: { companyId } }),
        prisma.client.count({ where: { companyId, isActive: true } }),
        prisma.client.count({ where: { companyId, type: 'INDIVIDUAL', isActive: true } }),
        prisma.client.count({ where: { companyId, type: 'COMPANY', isActive: true } }),
        prisma.client.count({
          where: {
            companyId,
            isActive: true,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 derniers jours
            }
          }
        })
      ])

      return {
        total: totalClients,
        active: activeClients,
        individual: individualClients,
        company: companyClients,
        recent: recentClients
      }

    } catch (error) {
      logger.error('Erreur lors de la récupération des statistiques clients:', error)
      throw error
    }
  }
}
