import { FastifyInstance, FastifyReply } from 'fastify'
import { AuthenticatedRequest } from '../types/auth'
import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

/**
 * Routes pour la gestion des entreprises
 */
export default async function companyRoutes(server: FastifyInstance) {
  
  /**
   * GET /api/v1/companies/current - Récupérer les informations de l'entreprise actuelle
   */
  server.get('/current', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les informations de l\'entreprise de l\'utilisateur connecté',
      tags: ['Entreprises'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                city: { type: 'string' },
                postalCode: { type: 'string' },
                country: { type: 'string' },
                currency: { type: 'string' },
                timezone: { type: 'string' },
                website: { type: 'string' },
                siret: { type: 'string' },
                vatNumber: { type: 'string' }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          postalCode: true,
          country: true,
          currency: true,
          timezone: true,
          website: true,
          siret: true,
          vatNumber: true
        }
      })

      if (!company) {
        return reply.status(404).send({
          success: false,
          message: 'Entreprise non trouvée'
        })
      }

      return reply.send({
        success: true,
        data: company
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de l\'entreprise', { 
        error: error.message, 
        companyId: request.user.companyId 
      })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de l\'entreprise'
      })
    }
  })

  /**
   * GET /api/v1/companies - Récupérer toutes les entreprises (ADMIN seulement)
   */
  server.get('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer la liste de toutes les entreprises (ADMIN seulement)',
      tags: ['Entreprises'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  city: { type: 'string' },
                  country: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      // Vérifier que l'utilisateur est ADMIN
      if (request.user.role !== 'ADMIN') {
        return reply.status(403).send({
          success: false,
          message: 'Accès refusé. Seuls les administrateurs peuvent voir toutes les entreprises.'
        })
      }

      const companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          city: true,
          country: true
        },
        orderBy: {
          name: 'asc'
        }
      })

      return reply.send({
        success: true,
        data: companies
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des entreprises', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des entreprises'
      })
    }
  })
}
