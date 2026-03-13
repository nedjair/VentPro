import { ImportService } from '../services/import.service'
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { InvoiceService, CreateInvoiceData, UpdateInvoiceData, InvoiceFilters } from '../services/invoice-sales.service'
// AuthenticatedRequest type removed - using FastifyRequest with type assertion
import { logger } from '../utils/logger'
import { ExportService } from '../services/export.service'

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.id || user?.userId || user?.companyId
}

// Types pour la validation des données
interface CreateInvoiceItem {
  productId: string
  quantity: number
  unitPrice: number
  vatRate: number
  discount?: number
}

interface CreateInvoiceRequest {
  type: 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA'
  clientId: string
  orderId?: string
  invoiceDate?: string
  dueDate?: string
  notes?: string
  paymentMethod?: string
  items: CreateInvoiceItem[]
}

interface UpdateInvoiceRequest {
  clientId?: string
  orderId?: string
  invoiceDate?: string
  dueDate?: string
  notes?: string
  paymentMethod?: string
  items?: CreateInvoiceItem[]
}

interface InvoiceFiltersRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  clientId?: string
  type?: 'INVOICE' | 'CREDIT_NOTE' | 'PROFORMA'
  status?: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
  dateFrom?: string
  dateTo?: string
  dueDateFrom?: string
  dueDateTo?: string
}

interface UpdateStatusRequest {
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED'
}

interface RecordPaymentRequest {
  amount: number
  paymentDate: string
  paymentMethod: string
}

interface CreateFromOrderRequest {
  orderId: string
}

export default async function invoiceRoutes(server: FastifyInstance) {
  // Créer une facture
  server.post('/', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Créer une nouvelle facture',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['type', 'clientId', 'items'],
        properties: {
          type: { type: 'string', enum: ['INVOICE', 'CREDIT_NOTE', 'PROFORMA'] },
          clientId: { type: 'string', minLength: 1 },
          orderId: { type: 'string' },
          invoiceDate: { type: 'string' },
          dueDate: { type: 'string' },
          notes: { type: 'string' },
          paymentMethod: { type: 'string' },
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
      const data = request.body as CreateInvoiceRequest
      const companyId = getOwnerScopeId(request)

      // Validation basique
      if (!data.type || !data.clientId || !data.items || data.items.length === 0) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes: type, clientId et items sont requis',
        })
      }

      // Convertir les dates string en Date objects
      const invoiceData: CreateInvoiceData = {
        ...data,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      }

      const invoice = await InvoiceService.createInvoice(invoiceData, companyId)

      return reply.status(201).send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création de la facture', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création de la facture',
      })
    }
  })

  // Créer une facture depuis une commande
  server.post('/from-order', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Créer une facture depuis une commande',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['orderId'],
        properties: {
          orderId: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { orderId } = request.body as CreateFromOrderRequest
      const companyId = getOwnerScopeId(request)

      if (!orderId) {
        return reply.status(400).send({
          success: false,
          message: 'ID de commande requis',
        })
      }

      const invoice = await InvoiceService.createInvoiceFromOrder(orderId, companyId)

      return reply.status(201).send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création de la facture depuis commande', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création de la facture',
      })
    }
  })

  // Récupérer la liste des factures
  server.get('/', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Récupérer la liste des factures avec filtres et pagination',
      tags: ['Factures'],
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
          type: { type: 'string', enum: ['INVOICE', 'CREDIT_NOTE', 'PROFORMA'] },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          dueDateFrom: { type: 'string' },
          dueDateTo: { type: 'string' },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as InvoiceFiltersRequest
      const ownerScopeId = (request as any).user?.companyId || (request as any).user?.id || (request as any).user?.userId

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      // Pagination avec valeurs par défaut
      const pagination = {
        page: query.page || 1,
        limit: Math.min(query.limit || 20, 100),
      }

      // Filtres avec conversion des dates
      const invoiceFilters: InvoiceFilters = {
        search: query.search,
        clientId: query.clientId,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
        dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
      }

      const result = await InvoiceService.getInvoices(ownerScopeId, invoiceFilters, pagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des factures', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des factures',
      })
    }
  })

  // Récupérer une facture par ID
  server.get('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Récupérer une facture par son ID',
      tags: ['Factures'],
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

      const invoice = await InvoiceService.getInvoiceById(id, companyId)

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          message: 'Facture non trouvée',
        })
      }

      return reply.send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération de la facture', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération de la facture',
      })
    }
  })

  // Mettre à jour une facture
  server.put('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Mettre à jour une facture',
      tags: ['Factures'],
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
          orderId: { type: 'string' },
          invoiceDate: { type: 'string' },
          dueDate: { type: 'string' },
          notes: { type: 'string' },
          paymentMethod: { type: 'string' },
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
      const data = request.body as UpdateInvoiceRequest
      const companyId = getOwnerScopeId(request)

      // Convertir les dates string en Date objects
      const updateData: UpdateInvoiceData = {
        ...data,
        invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      }

      const invoice = await InvoiceService.updateInvoice(id, updateData, companyId)

      return reply.send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour de la facture', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour de la facture',
      })
    }
  })

  // Enregistrer un paiement
  server.post('/:id/payment', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Enregistrer un paiement sur une facture',
      tags: ['Factures'],
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
        required: ['amount', 'paymentDate', 'paymentMethod'],
        properties: {
          amount: { type: 'number', minimum: 0.01 },
          paymentDate: { type: 'string' },
          paymentMethod: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { amount, paymentDate, paymentMethod } = request.body as RecordPaymentRequest
      const companyId = getOwnerScopeId(request)

      // Validation basique
      if (!amount || !paymentDate || !paymentMethod) {
        return reply.status(400).send({
          success: false,
          message: 'Données manquantes: amount, paymentDate et paymentMethod sont requis',
        })
      }

      const invoice = await InvoiceService.recordPayment(
        id,
        amount,
        new Date(paymentDate),
        paymentMethod,
        companyId
      )

      return reply.send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'enregistrement du paiement', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de l\'enregistrement du paiement',
      })
    }
  })

  // Changer le statut d'une facture
  server.patch('/:id/status', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Changer le statut d\'une facture',
      tags: ['Factures'],
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
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'] },
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

      const invoice = await InvoiceService.updateInvoiceStatus(id, status as any, companyId)

      return reply.send({
        success: true,
        data: invoice,
      })
    } catch (error: any) {
      logger.error('Erreur lors du changement de statut', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors du changement de statut',
      })
    }
  })

  // Supprimer une facture
  server.delete('/:id', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Supprimer une facture',
      tags: ['Factures'],
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

      await InvoiceService.deleteInvoice(id, companyId)

      return reply.send({
        success: true,
        message: 'Facture supprimée avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de la facture', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression de la facture',
      })
    }
  })

  // Export Excel des factures
  server.get('/export/excel', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Export Excel des factures',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      // Récupérer toutes les factures pour l'export
      const result = await InvoiceService.getInvoices(ownerScopeId, {}, { page: 1, limit: 10000 })
      const invoices = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `factures_${Date.now()}.xlsx`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateExcelReport(invoices, 'invoices', outputPath)

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
      logger.error('Erreur lors de l\'export Excel des factures', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erreur lors de l\'export Excel des factures',
      })
    }
  })

  // Export PDF d'une facture
  server.get('/:id/pdf', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Export PDF d\'une facture',
      tags: ['Factures'],
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
      const sanitizedId = String(id || '').trim()
      if (!sanitizedId) {
        return reply.status(400).send({
          success: false,
          message: 'Identifiant de facture invalide',
        })
      }
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      // Récupérer la facture avec tous les détails
      const invoice = await InvoiceService.getInvoiceById(sanitizedId, ownerScopeId)

      if (!invoice) {
        return reply.status(404).send({
          success: false,
          message: 'Facture non trouvée',
        })
      }

      const filename = ExportService.buildInvoicePdfFilename(invoice)
      const pdfBuffer = await ExportService.generateInvoicePdfBuffer(invoice, {
        ownerScopeId,
        requestUser: (request as any).user,
      })
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('Le PDF généré est vide')
      }

      reply.type('application/pdf')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      reply.header('Content-Length', String(pdfBuffer.length))
      return reply.send(pdfBuffer)

    } catch (error: any) {
      logger.error('Erreur lors de l\'export PDF de la facture', {
        error: error.message,
        stack: error.stack,
        invoiceId: (request.params as any)?.id,
      })
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erreur lors de l\'export PDF de la facture',
      })
    }
  })

  // Statistiques des factures
  server.get('/stats/overview', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Statistiques des factures',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { companyId } = (request as any).user

      const stats = await InvoiceService.getInvoiceStats(companyId)

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

  // Export PDF des factures
  server.get('/export/pdf', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Export PDF des factures',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      // Récupérer toutes les factures pour l'export
      const result = await InvoiceService.getInvoices(ownerScopeId, {}, { page: 1, limit: 10000 })
      const invoices = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `factures_${Date.now()}.pdf`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generatePDFReport(invoices, 'Liste des Factures', outputPath)

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

      logger.info('✅ Export PDF factures généré avec succès')
    } catch (error: any) {
      logger.error('Erreur lors de l\'export PDF des factures', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erreur lors de l\'export PDF des factures',
      })
    }
  })

  // Import Excel des factures
  server.post('/import/excel', {
    preHandler: [(server as any).authenticate],
    schema: {
      description: 'Import Excel des factures',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let tempFilePath: string | null = null

    try {
      const { companyId } = (request as any).user

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
      tempFilePath = path.join(tempDir, `import_invoices_${Date.now()}.xlsx`)
      const buffer = await data.buffer()
      fs.writeFileSync(tempFilePath, buffer)

      // Utiliser le service d'import
      const importService = new ImportService()

      const result = await importService.importInvoicesFromExcel(tempFilePath, companyId)

      logger.info('✅ Import Excel factures traité avec succès')

      return {
        success: true,
        data: result,
        message: `Import terminé: ${result.imported} factures importées, ${result.errors.length} erreurs, ${result.warnings.length} avertissements`
      }
    } catch (error: any) {
      logger.error('Erreur lors de l\'import Excel des factures', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'import Excel des factures',
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
      description: 'Télécharger le template d\'importation des factures',
      tags: ['Factures'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const importService = new ImportService()

      const workbook = await importService.generateImportTemplate('invoices')

      const filename = 'template_factures.xlsx'
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const buffer = await workbook.xlsx.writeBuffer()
      reply.send(buffer)

      logger.info('✅ Template import factures généré avec succès')
    } catch (error: any) {
      logger.error('Erreur lors de la génération du template factures', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération du template',
      })
    }
  })

  // Exporter les factures
  server.get('/export', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Exporte les factures en format PDF ou Excel',
      tags: ['Factures'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'pdf'] },
          search: { type: 'string' },
          clientId: { type: 'string' },
          type: { type: 'string', enum: ['INVOICE', 'CREDIT_NOTE', 'PROFORMA'] },
          status: { type: 'string', enum: ['DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED'] },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          dueDateFrom: { type: 'string' },
          dueDateTo: { type: 'string' },
        },
        required: ['format']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const { companyId } = (request as any).user || {}
      const query = request.query as any;

      const filters: InvoiceFilters = {
        search: query.search,
        clientId: query.clientId,
        type: query.type,
        status: query.status,
        dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
        dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
        dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
        dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
      };

      const { data: invoices } = await InvoiceService.getInvoices(ownerScopeId, filters);

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (query.format === 'xlsx') {
        fileBuffer = await ExportService.generateInvoicesExcel(invoices as any);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `factures_${timestamp}.xlsx`;
      } else { // pdf
        const companyName = (request as any).user?.companyName
          || (request as any).user?.fullName
          || (request as any).user?.email
          || 'Gestion Commerciale'
        fileBuffer = await ExportService.generateInvoicesPdf(
          invoices as any,
          { id: companyId || ownerScopeId, name: companyName } as any
        );
        contentType = 'application/pdf';
        filename = `factures_${timestamp}.pdf`;
      }

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.type(contentType);
      return reply.send(fileBuffer);

    } catch (error: any) {
      logger.error(`Erreur lors de l'export des factures:`, error);
      return reply.status(500).send({
        success: false,
        message: error.message || "Erreur interne lors de l'exportation des factures.",
      });
    }
  });
}
