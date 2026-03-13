import { ImportService } from '../services/import.service'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { suppliersService, SupplierData, SupplierFilters } from '../services/suppliers.service'
import { ExportService } from '../services/export.service'
import { prisma } from '../lib/database'

interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string
    companyId: string
    email: string
    role: string
  }
}

interface SupplierParams {
  id: string
}

interface SupplierQuery {
  page?: string
  limit?: string
  search?: string
  type?: 'COMPANY' | 'INDIVIDUAL'
  isActive?: string
  isPreferred?: string
  country?: string
  tags?: string
}

/**
 * Schéma volontairement souple pour les objets métier fournisseur.
 *
 * Pourquoi : Fastify sérialise la réponse selon le schéma `response`.
 * Avec `data: { type: 'object' }`, les propriétés réelles du fournisseur sont
 * supprimées et l'API renvoie `{}` sur le détail/POST/PUT. On autorise donc les
 * propriétés dynamiques tant que le contrat exact n'est pas centralisé ailleurs.
 */
const supplierPayloadSchema = {
  type: 'object',
  additionalProperties: true,
} as const

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

export default async function supplierRoutes(server: FastifyInstance) {
  server.log.info('🔄 Enregistrement des routes fournisseurs...')
  
  // Récupérer tous les fournisseurs avec la vraie base de données
  server.get('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer la liste des fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          type: { type: 'string', enum: ['COMPANY', 'INDIVIDUAL'] },
          isActive: { type: 'boolean' },
          isPreferred: { type: 'boolean' },
          country: { type: 'string' },
          tags: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      server.log.info('📥 Requête GET /suppliers reçue avec authentification')

      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId
      const query = request.query as SupplierQuery

      const filters: SupplierFilters = {
        search: query.search,
        type: query.type,
        isActive: query.isActive !== undefined ? (
          typeof query.isActive === 'boolean' ? query.isActive : query.isActive === 'true'
        ) : undefined,
        isPreferred: query.isPreferred !== undefined ? (
          typeof query.isPreferred === 'boolean' ? query.isPreferred : query.isPreferred === 'true'
        ) : undefined,
        country: query.country,
        tags: query.tags ? query.tags.split(',') : undefined
      }

      const pagination = {
        page: parseInt(query.page || '1'),
        limit: parseInt(query.limit || '20')
      }

      const result = await suppliersService.getSuppliers(ownerScopeId, filters, pagination)

      server.log.info('✅ Retour des données de la base de données')

      return {
        success: true,
        data: result
      }
    } catch (error: any) {
      server.log.error('❌ Erreur récupération fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération des fournisseurs'
      }
    }
  })

  // Récupérer un fournisseur par ID
  server.get('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer un fournisseur par son ID',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: supplierPayloadSchema
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId
      const { id } = request.params as SupplierParams

      const supplier = await suppliersService.getSupplierById(ownerScopeId, id)

      return {
        success: true,
        data: supplier
      }
    } catch (error: any) {
      server.log.error(`Erreur récupération fournisseur ${(request.params as SupplierParams).id}:`, error)
      
      if (error.message === 'Fournisseur non trouvé') {
        reply.code(404)
      } else {
        reply.code(500)
      }
      
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération du fournisseur'
      }
    }
  })

  // Créer un nouveau fournisseur
  server.post('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Créer un nouveau fournisseur',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['COMPANY', 'INDIVIDUAL'], default: 'COMPANY' },
          contactName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          mobile: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          fax: { type: 'string' },
          address: { type: 'string' },
          postalCode: { type: 'string' },
          city: { type: 'string' },
          // Le marché local principal est l'Algérie : on aligne le défaut backend
          // sur le formulaire frontend pour éviter des créations incohérentes.
          country: { type: 'string', default: 'Algérie' },
          siret: { type: 'string' },
          vatNumber: { type: 'string' },
          rcs: { type: 'string' },
          paymentTerms: { type: 'integer', minimum: 0, default: 30 },
          discount: { type: 'number', minimum: 0, maximum: 100, default: 0 },
          currency: { type: 'string', default: 'EUR' },
          rating: { type: 'integer', minimum: 0, maximum: 5 },
          isActive: { type: 'boolean', default: true },
          isPreferred: { type: 'boolean', default: false },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' }, default: [] }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: supplierPayloadSchema,
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId
      const supplierData = request.body as SupplierData

      const supplier = await suppliersService.createSupplier(ownerScopeId, supplierData)

      reply.code(201)
      return {
        success: true,
        data: supplier,
        message: 'Fournisseur créé avec succès'
      }
    } catch (error: any) {
      server.log.error('Erreur création fournisseur:', error)
      
      if (error.message.includes('existe déjà')) {
        reply.code(409)
      } else {
        reply.code(500)
      }
      
      return {
        success: false,
        message: error.message || 'Erreur lors de la création du fournisseur'
      }
    }
  })

  // Mettre à jour un fournisseur
  server.put('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Mettre à jour un fournisseur',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          type: { type: 'string', enum: ['COMPANY', 'INDIVIDUAL'] },
          contactName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          mobile: { type: 'string' },
          website: { type: 'string', format: 'uri' },
          fax: { type: 'string' },
          address: { type: 'string' },
          postalCode: { type: 'string' },
          city: { type: 'string' },
          country: { type: 'string' },
          siret: { type: 'string' },
          vatNumber: { type: 'string' },
          rcs: { type: 'string' },
          paymentTerms: { type: 'integer', minimum: 0 },
          discount: { type: 'number', minimum: 0, maximum: 100 },
          currency: { type: 'string' },
          rating: { type: 'integer', minimum: 0, maximum: 5 },
          isActive: { type: 'boolean' },
          isPreferred: { type: 'boolean' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: supplierPayloadSchema,
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId
      const { id } = request.params as SupplierParams
      const supplierData = request.body as Partial<SupplierData>

      const supplier = await suppliersService.updateSupplier(ownerScopeId, id, supplierData)

      return {
        success: true,
        data: supplier,
        message: 'Fournisseur mis à jour avec succès'
      }
    } catch (error: any) {
      server.log.error(`Erreur mise à jour fournisseur ${(request.params as SupplierParams).id}:`, error)
      
      if (error.message === 'Fournisseur non trouvé') {
        reply.code(404)
      } else if (error.message.includes('existe déjà')) {
        reply.code(409)
      } else {
        reply.code(500)
      }
      
      return {
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du fournisseur'
      }
    }
  })

  // Supprimer un fournisseur
  server.delete('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Supprimer un fournisseur',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId
      const { id } = request.params as SupplierParams

      const result = await suppliersService.deleteSupplier(ownerScopeId, id)

      return result
    } catch (error: any) {
      server.log.error(`Erreur suppression fournisseur ${(request.params as SupplierParams).id}:`, error)

      if (error.message === 'Fournisseur non trouvé') {
        reply.code(404)
      } else if (error.message.includes('produits associés')) {
        reply.code(409)
      } else {
        reply.code(500)
      }

      return {
        success: false,
        message: error.message || 'Erreur lors de la suppression du fournisseur'
      }
    }
  })

  // Obtenir les statistiques des fournisseurs
  server.get('/stats/overview', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Obtenir les statistiques des fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                active: { type: 'number' },
                inactive: { type: 'number' },
                preferred: { type: 'number' },
                byType: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId

      const stats = await suppliersService.getSuppliersStats(ownerScopeId)

      return {
        success: true,
        data: stats
      }
    } catch (error: any) {
      server.log.error('Erreur récupération statistiques fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de la récupération des statistiques'
      }
    }
  })

  // Export Excel des fournisseurs
  server.get('/export/excel', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export Excel des fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId

      // Récupérer tous les fournisseurs pour l'export
      const result = await suppliersService.getSuppliers(ownerScopeId, {}, { page: 1, limit: 10000 })
      const suppliers = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `fournisseurs_${Date.now()}.xlsx`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateExcelReport(suppliers, 'suppliers', outputPath)

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

      server.log.info('✅ Export Excel fournisseurs généré avec succès')
    } catch (error: any) {
      server.log.error('❌ Erreur export Excel fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de l\'export Excel'
      }
    }
  })

  // Export PDF des fournisseurs
  server.get('/export/pdf', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export PDF des fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId

      // Récupérer tous les fournisseurs pour l'export
      const result = await suppliersService.getSuppliers(ownerScopeId, {}, { page: 1, limit: 10000 })
      const suppliers = result.data

      // Utiliser le service d'export
      const exportService = new ExportService()

      const filename = `fournisseurs_${Date.now()}.pdf`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generatePDFReport(suppliers, 'Liste des Fournisseurs', outputPath)

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

      server.log.info('✅ Export PDF fournisseurs généré avec succès')
    } catch (error: any) {
      server.log.error('❌ Erreur export PDF fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de l\'export PDF'
      }
    }
  })

  // Import Excel des fournisseurs
  server.post('/import/excel', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Import Excel des fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    let tempFilePath: string | null = null

    try {
      const ownerScopeId = (request.user as any).companyId || (request.user as any).id || (request.user as any).userId

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
      tempFilePath = path.join(tempDir, `import_suppliers_${Date.now()}.xlsx`)
      const buffer = await data.buffer()
      fs.writeFileSync(tempFilePath, buffer)

      // Utiliser le service d'import
      const importService = new ImportService()

      const result = await importService.importSuppliersFromExcel(tempFilePath, ownerScopeId)

      server.log.info('✅ Import Excel fournisseurs traité avec succès')

      return {
        success: true,
        data: result,
        message: `Import terminé: ${result.imported} fournisseurs importés, ${result.errors.length} erreurs, ${result.warnings.length} avertissements`
      }
    } catch (error: any) {
      server.log.error('❌ Erreur import Excel fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de l\'import Excel'
      }
    } finally {
      // Nettoyer le fichier temporaire
      if (tempFilePath && require('fs').existsSync(tempFilePath)) {
        try {
          require('fs').unlinkSync(tempFilePath)
        } catch (cleanupError) {
          server.log.warn('⚠️ Erreur nettoyage fichier temporaire:', cleanupError)
        }
      }
    }
  })

  // Télécharger le template d'importation
  server.get('/import/template', {
    schema: {
      description: 'Télécharger le template d\'importation des fournisseurs',
      tags: ['Fournisseurs'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const importService = new ImportService()

      const workbook = await importService.generateImportTemplate('suppliers')

      const filename = 'template_fournisseurs.xlsx'
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const buffer = await workbook.xlsx.writeBuffer()
      reply.send(buffer)

      server.log.info('✅ Template import fournisseurs généré avec succès')
    } catch (error: any) {
      server.log.error('❌ Erreur génération template fournisseurs:', error)
      reply.code(500)
      return {
        success: false,
        message: error.message || 'Erreur lors de la génération du template'
      }
    }
  })

  // Statistiques des fournisseurs
  server.get('/stats', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Récupérer les statistiques sur les fournisseurs',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }]
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    // ...
  })

  // Exporter les fournisseurs
  server.get('/export', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Exporte les fournisseurs en format PDF ou Excel',
      tags: ['Fournisseurs'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['xlsx', 'pdf'] },
          search: { type: 'string' },
          type: { type: 'string', enum: ['COMPANY', 'INDIVIDUAL'] },
          isActive: { type: 'boolean' },
          isPreferred: { type: 'boolean' },
          country: { type: 'string' },
          tags: { type: 'string' }
        },
        required: ['format']
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const query = request.query as any

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const filters: SupplierFilters = {
        search: query.search,
        type: query.type,
        isActive: query.isActive,
        isPreferred: query.isPreferred,
        country: query.country,
        tags: query.tags ? query.tags.split(',') : undefined
      }

      const result = await suppliersService.getSuppliers(ownerScopeId, filters)

      // Mapper les données pour correspondre au modèle Supplier de base
      const suppliers = result.data.map((s: any) => ({
        ...s,
        discount: s.discount ? Number(s.discount) : 0,
      }));

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (query.format === 'xlsx') {
        fileBuffer = await ExportService.generateSuppliersExcel(suppliers);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `fournisseurs_${timestamp}.xlsx`;
      } else { // pdf
        const companyId = (request.user as any)?.companyId
        const company = companyId
          ? await prisma.company.findUnique({ where: { id: companyId } })
          : null

        fileBuffer = await ExportService.generateSuppliersPdf(
          suppliers,
          (company || { name: 'Gestion Commerciale' }) as any
        );
        contentType = 'application/pdf';
        filename = `fournisseurs_${timestamp}.pdf`;
      }

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.type(contentType);
      return reply.send(fileBuffer);

    } catch (error: any) {
      server.log.error(`Erreur lors de l'export des fournisseurs:`, error)
      return reply.status(500).send({
        success: false,
        message: "Erreur interne lors de l'exportation des fournisseurs.",
      })
    }
  })
}

