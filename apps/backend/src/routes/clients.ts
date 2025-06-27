import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { ClientService } from '../services/client.service'
import { ExportService } from '../services/export.service'
import { AuthenticatedRequest } from '../types/common'
import { logger } from '../utils/logger'
import { prisma } from '@gestion/database'
import { ClientType } from '@prisma/client'
import { ImportService } from '../services/import.service'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'
import { pipeline } from 'stream'

const clientQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  type: z.string().optional(), // Simplifié temporairement
  city: z.string().optional(),
  isActive: z.string().optional().transform(val => val === 'true').optional(),
});

const exportQuerySchema = z.object({
  format: z.enum(['xlsx', 'pdf']),
  search: z.string().optional(),
  type: z.nativeEnum(ClientType).optional(),
  city: z.string().optional(),
  isActive: z.string().optional().transform(val => val === 'true').optional(),
  // sortBy and sortOrder can be added if needed for export
});

export default async function clientRoutes(server: FastifyInstance) {
  // Test endpoint simple
  server.get('/test', async (request, reply) => {
    logger.info('🧪 Test endpoint appelé')
    return reply.send({
      success: true,
      message: 'Test endpoint fonctionne',
      timestamp: new Date().toISOString()
    })
  })

  // Créer un client
  server.post('/', {
    preHandler: [/* @ts-ignore */ server.authenticate],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user
      const body = request.body as any



      // Validation basique
      if (!body.type) {
        logger.warn('❌ Type de client manquant')
        return reply.status(400).send({
          success: false,
          message: 'Le type de client est requis',
        })
      }

      const client = await ClientService.createClient(body, companyId)

      return reply.status(201).send({
        success: true,
        data: client,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création du client', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création du client',
      })
    }
  })

  // Récupérer la liste des clients
  server.get(
    '/',
    {
      preHandler: [server.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        logger.info('🔍 Début de la récupération des clients')

        const { companyId } = request.user
        logger.info('🏢 CompanyId:', { companyId })

        const query = request.query as z.infer<typeof clientQuerySchema>
        logger.info('📋 Query reçue:', { query })

        const pagination = {
          page: parseInt(query.page || '1') || 1,
          limit: parseInt(query.limit || '10') || 10,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        }
        logger.info('📄 Pagination:', { pagination })

        const filters = {
          search: query.search,
          type: query.type as ClientType | undefined,
          city: query.city,
          isActive: query.isActive,
        }
        logger.info('🔍 Filtres:', { filters })

        logger.info('🚀 Appel du service ClientService.getClients...')
        const result = await ClientService.getClients(companyId, filters, pagination)
        logger.info('✅ Service appelé avec succès, nombre de clients:', { count: result.data.length })

        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
        })
      } catch (error: any) {
        logger.error('❌ Erreur lors de la récupération des clients', {
          error: error.message,
          stack: error.stack,
          companyId: request.user?.companyId
        })
        return reply.status(500).send({
          success: false,
          message: 'Erreur lors de la récupération des clients',
        })
      }
    },
  )

  // Récupérer un client par ID
  server.get('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      const client = await ClientService.getClientById(id, companyId)

      if (!client) {
        return reply.status(404).send({
          success: false,
          message: 'Client non trouvé',
        })
      }

      return reply.send({
        success: true,
        data: client,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du client', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du client',
      })
    }
  })

  // Mettre à jour un client
  server.put('/:id', {
    preHandler: [/* @ts-ignore */ server.authenticate],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string }
      const data = request.body as any
      const { companyId } = request.user

      const client = await ClientService.updateClient(id, data, companyId)

      return reply.send({
        success: true,
        data: client,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du client', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du client',
      })
    }
  })

  // Supprimer un client
  server.delete(
    '/:id',
    {
      preHandler: [server.authenticate],
    },
    async (request: AuthenticatedRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string }
        const { companyId } = request.user

        await ClientService.deleteClient(id, companyId)

        return reply.send({
          success: true,
          message: 'Client supprimé avec succès',
        })
      } catch (error: any) {
        logger.error('Erreur lors de la suppression du client', { error: error.message })
        return reply.status(400).send({
          success: false,
          message: error.message || 'Erreur lors de la suppression du client',
        })
      }
    },
  )

  // Exporter les clients
  server.get('/export', {
    preHandler: [server.authenticate],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user
      const query = request.query as z.infer<typeof exportQuerySchema>
      
      const filters = {
        search: query.search,
        type: query.type,
        city: query.city,
        isActive: query.isActive,
      }

      // Récupérer tous les clients (sans pagination) avec les filtres
      const { data: clients } = await ClientService.getClients(companyId, filters)

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (query.format === 'xlsx') {
        fileBuffer = await ExportService.generateClientsExcel(clients);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `clients_${timestamp}.xlsx`;
      } else { // pdf
        const company = await prisma.company.findUnique({ where: { id: companyId } });
        if (!company) {
          return reply.status(404).send({ success: false, message: "Informations de l'entreprise non trouvées." });
        }
        fileBuffer = await ExportService.generateClientsPdf(clients, company);
        contentType = 'application/pdf';
        filename = `clients_${timestamp}.pdf`;
      }

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.type(contentType);
      return reply.send(fileBuffer);

    } catch (error: any) {
      logger.error(`Erreur lors de l'export des clients`, { error: error.message });
      return reply.status(500).send({
        success: false,
        message: "Erreur interne lors de l'exportation des clients.",
      })
    }
  })

  // Importer des clients depuis un fichier Excel
  // Import Excel des clients
  server.post('/import/excel', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Import Excel des clients',
      tags: ['Clients'],
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
      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Sauvegarder le fichier temporairement
      tempFilePath = path.join(tempDir, `import_clients_${Date.now()}_${data.filename}`)
      const pump = promisify(pipeline)
      await pump(data.file, fs.createWriteStream(tempFilePath))

      // Utiliser le service d'import
      const importService = new ImportService()

      // Valider le fichier
      importService.validateFile(tempFilePath, 'clients')

      // Lire les données du fichier
      const { data: clientsData } = await importService.readExcelFile(tempFilePath)

      // Valider et normaliser les données
      const { validClients, errors, warnings } = importService.validateClientData(clientsData)

      if (errors.length > 0) {
        return reply.status(400).send({
          success: false,
          message: 'Erreurs de validation détectées',
          errors,
          warnings,
        })
      }

      // Importer les clients valides
      let imported = 0
      let updated = 0
      const importErrors = []

      for (const clientData of validClients) {
        try {
          // Vérifier si le client existe déjà (par email)
          const existingClient = await ClientService.getClientByEmail(clientData.email, companyId)

          if (existingClient) {
            // Mettre à jour le client existant
            await ClientService.updateClient(existingClient.id, clientData, companyId)
            updated++
          } else {
            // Créer un nouveau client
            await ClientService.createClient(clientData, companyId)
            imported++
          }
        } catch (error: any) {
          importErrors.push(`Erreur pour ${clientData.email}: ${error.message}`)
        }
      }

      return reply.send({
        success: true,
        message: `Import terminé: ${imported} clients créés, ${updated} mis à jour`,
        data: {
          imported,
          updated,
          errors: importErrors,
          warnings,
        },
      })

    } catch (error: any) {
      logger.error('Erreur lors de l\'import Excel des clients', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erreur lors de l\'import Excel des clients',
      })
    } finally {
      // Nettoyer le fichier temporaire
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath)
        } catch (error) {
          logger.error('Erreur lors de la suppression du fichier temporaire', { error })
        }
      }
    }
  })

  // Télécharger le template d'importation
  server.get('/import/template', {
    schema: {
      description: 'Télécharger le template d\'importation des clients',
      tags: ['Clients'],
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const importService = new ImportService()

      const workbook = await importService.generateImportTemplate('clients')

      const filename = 'template_clients.xlsx'
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const buffer = await workbook.xlsx.writeBuffer()
      reply.send(buffer)

    } catch (error: any) {
      logger.error('Erreur lors de la génération du template clients', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération du template',
      })
    }
  })

  // Importer des clients depuis un fichier Excel
  server.post('/import', {
    preHandler: [server.authenticate],
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ success: false, message: 'Aucun fichier uploadé.' });
    }

    try {
      const fileBuffer = await data.toBuffer();
      const { companyId } = request.user;
      
      const report = await ImportService.importClientsFromExcel(fileBuffer, companyId);

      if (report.success) {
        return reply.status(200).send({
          success: true,
          message: `${report.successfulCount} clients importés avec succès.`,
          data: report,
        });
      } else {
        return reply.status(400).send({
          success: false,
          message: `Échec de l'importation : ${report.errorCount} erreurs sur ${report.totalRows} lignes.`,
          data: report,
        });
      }

    } catch (error: any) {
      logger.error(`Erreur lors de l'import des clients`, { error: error.message });
      return reply.status(500).send({
        success: false,
        message: "Erreur interne lors du traitement du fichier.",
      });
    }
  });
}
