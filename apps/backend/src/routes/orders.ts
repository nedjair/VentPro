import { FastifyInstance, FastifyReply } from 'fastify'
import { OrderService, CreateOrderData, UpdateOrderData, OrderFilters } from '../services/order.service'
import { AuthenticatedRequest } from '@gestion/shared'
import { logger } from '../utils/logger'
import { ExportService } from '../services/export.service'
import { prisma } from '../lib/database'

// Types pour la validation des données
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
  // Créer une commande/devis
  server.post('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Créer une nouvelle commande ou devis',
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const data = request.body as CreateOrderRequest
      const { companyId } = request.user

      // Validation basique
      if (!data.type || !data.clientId || !data.items || data.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes: type, clientId et items sont requis',
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
      logger.error('Erreur lors de la création de la commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création de la commande',
      })
    }
  })

  // Récupérer la liste des commandes
  server.get('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer la liste des commandes avec filtres et pagination',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const query = request.query as OrderFiltersRequest
      const { companyId } = request.user

      // Pagination avec valeurs par défaut
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

      const result = await OrderService.getOrders(companyId, orderFilters, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des commandes',
      })
    }
  })

  // Récupérer une commande par ID
  server.get('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer une commande par son ID',
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      const order = await OrderService.getOrderById(id, companyId)

      if (!order) {
        return reply.status(404).send({
          success: false,
          message: 'Commande non trouvée',
        })
      }

      return reply.send({
        success: true,
        data: order,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de la commande', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la commande',
      })
    }
  })

  // Mettre à jour une commande
  server.put('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Mettre à jour une commande',
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const data = request.body as UpdateOrderRequest
      const { companyId } = request.user

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
      logger.error('Erreur lors de la mise à jour de la commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour de la commande',
      })
    }
  })

  // Changer le statut d'une commande
  server.patch('/:id/status', {
    preHandler: [/* @ts-ignore */ server.authenticate],
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { status } = request.body as UpdateStatusRequest
      const { companyId } = request.user

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
    preHandler: [/* @ts-ignore */ server.authenticate],
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

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
    preHandler: [/* @ts-ignore */ server.authenticate],
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      await OrderService.deleteOrder(id, companyId)

      return reply.send({
        success: true,
        message: 'Commande supprimée avec succès',
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
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export Excel des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      // Récupérer toutes les commandes pour l'export
      const result = await OrderService.getOrders(companyId, {}, { page: 1, limit: 10000 })
      const orders = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `commandes_${Date.now()}.xlsx`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateExcelReport(orders, 'orders', outputPath)

      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const fileStream = fs.createReadStream(outputPath)
      reply.send(fileStream)

      // Nettoyer le fichier après envoi
      fileStream.on('end', () => {
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
          }
        }, 5000)
      })

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
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Statistiques des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

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
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export PDF des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user

      // Récupérer toutes les commandes pour l'export
      const result = await OrderService.getOrders(companyId, {}, { page: 1, limit: 10000 })
      const orders = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `commandes_${Date.now()}.pdf`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generatePDFReport(orders, 'Liste des Commandes', outputPath)

      reply.type('application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const fileStream = fs.createReadStream(outputPath)
      reply.send(fileStream)

      // Nettoyer le fichier après envoi
      fileStream.on('end', () => {
        setTimeout(() => {
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath)
          }
        }, 5000)
      })

      logger.info('✅ Export PDF commandes généré avec succès')
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
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Import Excel des commandes',
      tags: ['Commandes'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    let tempFilePath: string | null = null

    try {
      const { companyId } = request.user

      // Récupérer le fichier uploadé
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({
          success: false,
          message: 'Aucun fichier fourni',
        })
      }

      // Créer le dossier temporaire
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

      logger.info('✅ Import Excel commandes traité avec succès')

      return {
        success: true,
        data: result,
        message: `Import terminé: ${result.imported} commandes importées, ${result.errors.length} erreurs, ${result.warnings.length} avertissements`
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
          logger.warn('⚠️ Erreur nettoyage fichier temporaire:', cleanupError)
        }
      }
    }
  })

  // Télécharger le template d'importation
  server.get('/import/template', {
    schema: {
      description: 'Télécharger le template d\'importation des commandes',
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

      logger.info('✅ Template import commandes généré avec succès')
    } catch (error: any) {
      logger.error('Erreur lors de la génération du template commandes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération du template',
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
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user;
      const query = request.query as any;

      const filters: OrderFilters = {
        search: query.search,
        clientId: query.clientId,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      };

      const { data: orders } = await OrderService.getOrders(companyId, filters);

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (query.format === 'xlsx') {
        fileBuffer = await ExportService.generateOrdersExcel(orders as any);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `commandes_${timestamp}.xlsx`;
      } else { // pdf
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
          return reply.status(404).send({ success: false, message: "Informations de l'entreprise non trouvées." });
        }
        fileBuffer = await ExportService.generateOrdersPdf(orders as any, company);
        contentType = 'application/pdf';
        filename = `commandes_${timestamp}.pdf`;
      }

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

