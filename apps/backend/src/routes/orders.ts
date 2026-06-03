import { ImportService } from '../services/import.service'
import { Quote } from '@gestion/database'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { OrderService, CreateOrderData, UpdateOrderData, OrderFilters } from '../services/order-sales.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'
import { ExportService } from '../services/export.service'
import { prisma } from '../lib/database'

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

// Types pour la validation des donnÃ©es
interface CreateOrderItem {
  productId: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number
}

interface CreateOrderRequest {
  type: 'QUOTE' | 'ORDER'
  clientId: string
  orderDate?: string
  validUntil?: string
  deliveryDate?: string
  notes?: string
  internalNotes?: string
  items: CreateOrderItem[]
}

interface UpdateOrderRequest {
  clientId?: string
  orderDate?: string
  validUntil?: string
  deliveryDate?: string
  notes?: string
  internalNotes?: string
  items?: CreateOrderItem[]
}

interface OrderFiltersRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  clientId?: string
  type?: 'QUOTE' | 'ORDER'
  status?: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
  dateFrom?: string
  dateTo?: string
}

interface UpdateStatusRequest {
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED'
}

export default async function orderRoutes(server: FastifyInstance) {
  // CrÃ©er une commande/devis
  server.post('/', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'CrÃ©er une nouvelle commande ou devis',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'clientId', 'items'],
        properties: {
          type: { type: 'string', enum: ['QUOTE', 'ORDER'] },
          clientId: { type: 'string', minLength: 1 },
          orderDate: { type: 'string' },
          validUntil: { type: 'string' },
          deliveryDate: { type: 'string' },
          notes: { type: 'string' },
          internalNotes: { type: 'string' },
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPrice', 'vatRate'],
              properties: {
                productId: { type: 'string', minLength: 1 },
                quantity: { type: 'number', minimum: 1 },
                unitPrice: { type: 'number', minimum: 0 },
                vatRate: { type: 'number', minimum: 0, maximum: 100 },
                discount: { type: 'number', minimum: 0, maximum: 100 },
              },
            },
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                number: { type: 'string' },
                type: { type: 'string' },
                status: { type: 'string' },
                total: { type: 'number' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateOrderRequest
      const companyId = getOwnerScopeId(request)

      // Validation basique
      if (!data.type || !data.clientId || !data.items || data.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'DonnÃ©es manquantes: type, clientId et items sont requis',
        })
      }
      // Convertir les dates string en Date objects
      const orderData: CreateOrderData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      }

      const order = await OrderService.createOrder(orderData, companyId)

      return reply.status(201).send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la crÃ©ation de la commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la crÃ©ation de la commande',
      })
    }
  })

  // RÃ©cupÃ©rer la liste des commandes
  server.get('/', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'RÃ©cupÃ©rer la liste des commandes avec filtres et pagination',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          // On accepte une marge plus large pour éviter de renvoyer un 400
          // à d'anciens clients qui envoient encore une page trop large.
          // Le handler reste la source de vérité et plafonne effectivement à 100.
          limit: { type: 'integer', minimum: 1, maximum: 10000, default: 20 },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          search: { type: 'string' },
          clientId: { type: 'string' },
          type: { type: 'string', enum: ['QUOTE', 'ORDER'] },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as OrderFiltersRequest
      const ownerScopeId = (request as any).user?.companyId || (request as any).user?.id || (request as any).user?.userId

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte dâ€™authentification incomplet',
        })
      }

      // Pagination avec valeurs par dÃ©faut
      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
      }

      // Filtres avec conversion des dates
      const orderFilters: OrderFilters = {
        search: query.search,
        clientId: query.clientId,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      }

      const result = await OrderService.getOrders(ownerScopeId, orderFilters, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la rÃ©cupÃ©ration des commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la rÃ©cupÃ©ration des commandes',
      })
    }
  })

// Export PDF d'une commande
   server.get('/:id/pdf', {
     preHandler: [(server as any).authenticate],
     schema: {
       description: 'Export PDF d\'une commande',
       tags: ['Commandes'],
       security: [{ bearerAuth: [] }],
       params: {
         type: 'object',
         properties: {
           id: { type: 'string' },
         },
         required: ['id'],
       },
     },
   }, async (request: FastifyRequest, reply: FastifyReply) => {
     try {
       const { id } = request.params as { id: string }
       const companyId = getOwnerScopeId(request)

       const order = await OrderService.getOrderById(id, companyId)

       if (!order) {
         return reply.status(404).send({
           success: false,
           message: 'Commande non trouvée',
         })
       }

       const buffer = await ExportService.generateOrderPdfBuffer(order)

       if (!buffer || buffer.length === 0) {
         return reply.status(500).send({
           success: false,
           message: 'Le fichier généré est vide - erreur lors de la génération du PDF',
         })
       }

       const filename = `commande_${order.number}_${Date.now()}.pdf`
       reply.type('application/pdf')
       reply.header('Content-Disposition', `attachment; filename="${filename}"`)
       reply.header('Content-Length', String(buffer.length))
       return reply.send(buffer)
     } catch (error: any) {
       logger.error('Erreur lors de l\'export PDF de la commande', { error: error.message })
       return reply.status(500).send({
         success: false,
         message: error.message || 'Erreur lors de l\'export PDF de la commande',
      })
    }
  })

  // RÃ©cupÃ©rer une commande par ID
  server.get('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'RÃ©cupÃ©rer une commande par son ID',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const companyId = getOwnerScopeId(request)

      const order = await OrderService.getOrderById(id, companyId)

      if (!order) {
        return reply.status(404).send({
          success: false,
          message: 'Commande non trouvÃ©e',
        })
      }

      return reply.send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la rÃ©cupÃ©ration de la commande', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la rÃ©cupÃ©ration de la commande',
      })
    }
  })

  // Mettre Ã  jour une commande
  server.put('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Mettre Ã  jour une commande',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          clientId: { type: 'string', minLength: 1 },
          orderDate: { type: 'string' },
          validUntil: { type: 'string' },
          deliveryDate: { type: 'string' },
          notes: { type: 'string' },
          internalNotes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPrice', 'vatRate'],
              properties: {
                productId: { type: 'string', minLength: 1 },
                quantity: { type: 'number', minimum: 1 },
                unitPrice: { type: 'number', minimum: 0 },
                vatRate: { type: 'number', minimum: 0, maximum: 100 },
                discount: { type: 'number', minimum: 0, maximum: 100 },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const data = request.body as UpdateOrderRequest
      const companyId = getOwnerScopeId(request)

      // Convertir les dates string en Date objects
      const updateData: UpdateOrderData = {
        ...data,
        orderDate: data.orderDate ? new Date(data.orderDate) : undefined,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      }

      const order = await OrderService.updateOrder(id, updateData, companyId)

      return reply.send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise Ã  jour de la commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise Ã  jour de la commande',
      })
    }
  })

  // Changer le statut d'une commande
  server.patch('/:id/status', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Changer le statut d\'une commande',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { status } = request.body as UpdateStatusRequest
      const companyId = getOwnerScopeId(request)

      if (!status) {
        return reply.status(400).send({
          success: false,
          message: 'Le statut est requis',
        })
      }

      const order = await OrderService.updateOrderStatus(id, status as any, companyId)

      return reply.send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors du changement de statut', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors du changement de statut',
      })
    }
  })

  // Convertir un devis en commande
  server.post('/:id/convert', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Convertir un devis en commande',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const companyId = getOwnerScopeId(request)

      const order = await OrderService.convertQuoteToOrder(id, companyId)

      return reply.status(201).send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la conversion du devis', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la conversion du devis',
      })
    }
  })

  // Supprimer une commande
  server.delete('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Supprimer une commande',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const companyId = getOwnerScopeId(request)

      await OrderService.deleteOrder(id, companyId)

      return reply.send({
        success: true,
        message: 'Commande supprimÃ©e avec succÃ¨s',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de la commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression de la commande',
      })
    }
  })

  // Export Excel des commandes
  server.get('/export/excel', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Export Excel des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)

      // RÃ©cupÃ©rer toutes les commandes pour l'export
      const result = await OrderService.getOrders(companyId, {}, { page: 1, limit: 10000 })
      const orders = result.data

      const filename = `commandes_${Date.now()}.xlsx`
      const fileBuffer = await ExportService.generateOrdersExcel(orders as any)

      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      reply.header('Content-Length', String(fileBuffer.length))

      return reply.send(fileBuffer)

    } catch (error: any) {
      logger.error('Erreur lors de l\'export Excel des commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export Excel des commandes',
      })
    }
  })

  // Statistiques des commandes
  server.get('/stats/overview', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Statistiques des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)

      const stats = await OrderService.getOrderStats(companyId)

      return reply.send({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      logger.error('Erreur lors du calcul des statistiques', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors du calcul des statistiques',
      })
    }
  })

  // Export PDF des commandes
  server.get('/export/pdf', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Export PDF des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const companyId = getOwnerScopeId(request)

      // RÃ©cupÃ©rer toutes les commandes pour l'export
      const result = await OrderService.getOrders(companyId, {}, { page: 1, limit: 10000 })
      const orders = result.data

      const filename = `commandes_${Date.now()}.pdf`
      const fileBuffer = await ExportService.generateOrdersPdf(orders as any, {
        name: 'Gestion Commerciale',
      } as any)

      reply.type('application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      reply.header('Content-Length', String(fileBuffer.length))

      logger.info('âœ… Export PDF commandes gÃ©nÃ©rÃ© avec succÃ¨s')
      return reply.send(fileBuffer)
    } catch (error: any) {
      logger.error('Erreur lors de l\'export PDF des commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export PDF des commandes',
      })
    }
  })

  // Import Excel des commandes
  server.post('/import/excel', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Import Excel des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let tempFilePath: string | null = null

    try {
      const { companyId } = (request as any).user

      // RÃ©cupÃ©rer le fichier uploadÃ©
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'Aucun fichier fourni',
        })
      }

      // CrÃ©er le dossier temporaire
      const fs = require('fs')
      const path = require('path')
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Sauvegarder le fichier temporairement
      tempFilePath = path.join(tempDir, `import_orders_${Date.now()}.xlsx`)
      const buffer = await data.buffer()
      fs.writeFileSync(tempFilePath, buffer)

      // Utiliser le service d'import
      const ImportService = require('../services/import-service.js')
      const importService = new ImportService()

      const result = await importService.importOrdersFromExcel(tempFilePath, companyId)

      logger.info('âœ… Import Excel commandes traitÃ© avec succÃ¨s')

      return {
        success: true,
        data: result,
        message: `Import terminÃ©: ${result.imported} commandes importÃ©es, ${result.errors.length} erreurs, ${result.warnings.length} avertissements`
      }
    } catch (error: any) {
      logger.error('Erreur lors de l\'import Excel des commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'import Excel des commandes',
      })
    } finally {
      // Nettoyer le fichier temporaire
      if (tempFilePath && require('fs').existsSync(tempFilePath)) {
        try {
          require('fs').unlinkSync(tempFilePath)
        } catch (cleanupError) {
          logger.warn('âš ï¸ Erreur nettoyage fichier temporaire:', cleanupError)
        }
      }
    }
  })

  // TÃ©lÃ©charger le template d'importation
  server.get('/import/template', {
    schema: {
      description: 'TÃ©lÃ©charger le template d\'importation des commandes',
      tags: ['Commandes'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ImportService = require('../services/import-service.js')
      const importService = new ImportService()

      const workbook = await importService.generateImportTemplate('orders')

      const filename = 'template_commandes.xlsx'
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const buffer = await workbook.xlsx.writeBuffer()
      reply.send(buffer)

      logger.info('âœ… Template import commandes gÃ©nÃ©rÃ© avec succÃ¨s')
    } catch (error: any) {
      logger.error('Erreur lors de la gÃ©nÃ©ration du template commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la gÃ©nÃ©ration du template',
      })
    }
  })

  // Exporter les commandes
  server.get('/export', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Exporte les commandes en format PDF ou Excel',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'pdf'] },
          search: { type: 'string' },
          clientId: { type: 'string' },
          type: { type: 'string', enum: ['QUOTE', 'ORDER'] },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
        },
        required: ['format']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user;
      const query = request.query as any;

      console.log('ðŸ” Orders export - Raw query params:', query)

      if (!query.format || !['xlsx', 'pdf'].includes(query.format)) {
        return reply.status(400).send({
          success: false,
          message: 'Format requis: xlsx ou pdf'
        })
      }

      const filters: OrderFilters = {
        search: query.search,
        clientId: query.clientId,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      };

      console.log('ðŸ” Orders export - Filtres:', filters)
      const { data: orders } = await OrderService.getOrders(companyId, filters);
      console.log(`âœ… ${orders.length} commandes rÃ©cupÃ©rÃ©es`)

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (query.format === 'xlsx') {
        console.log('ðŸ“Š GÃ©nÃ©ration Excel commandes...')
        fileBuffer = await ExportService.generateOrdersExcel(orders as any);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `commandes_${timestamp}.xlsx`;
      } else { // pdf
        console.log('ðŸ“„ GÃ©nÃ©ration PDF commandes...')
        fileBuffer = await ExportService.generateOrdersPdf(orders as any, {
          name: 'Gestion Commerciale',
        } as any);
        contentType = 'application/pdf';
        filename = `commandes_${timestamp}.pdf`;
      }

      console.log(`âœ… Fichier gÃ©nÃ©rÃ©: ${filename} (${fileBuffer.length} bytes)`)

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.type(contentType);
      return reply.send(fileBuffer);

    } catch (error: any) {
      logger.error(`Erreur lors de l'export des commandes:`, error);
      return reply.status(500).send({
        success: false,
        message: "Erreur interne lors de l'exportation des commandes.",
      });
    }
  });
}

