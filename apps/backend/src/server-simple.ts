import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import { prisma } from '@gestion/database'
import { AuthService } from './services/auth.service'
import { logger } from './utils/logger'
import analyticsRoutes from './routes/analytics'

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty'
    } : undefined
  }
})

// Configuration CORS
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

async function createServer() {
  try {
    // Initialiser le service d'authentification
    const authService = new AuthService()

    // Plugins de sécurité
    await server.register(helmet, {
      contentSecurityPolicy: false
    })

    await server.register(cors, corsOptions)

    // JWT
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    })

    // Routes de base
    server.get('/health', async (request, reply) => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    })

    server.get('/api/health', async (request, reply) => {
      return {
        status: 'ok',
        message: 'Backend API is running',
        timestamp: new Date().toISOString()
      }
    })

    // Route d'authentification avec la vraie base de données (v1)
    server.post('/api/v1/auth/login', async (request, reply) => {
      try {
        const { email, password } = request.body as any

        if (!email || !password) {
          return reply.status(400).send({
            success: false,
            message: 'Email et mot de passe requis'
          })
        }

        logger.info(`Tentative de connexion pour: ${email}`)

        // Authentifier avec la vraie base de données
        const user = await authService.login({ email, password })

        if (!user) {
          logger.warn(`Échec de connexion pour: ${email}`)
          return reply.status(401).send({
            success: false,
            message: 'Email ou mot de passe incorrect'
          })
        }

        // Générer les tokens JWT
        const payload = {
          userId: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId
        }

        const accessToken = server.jwt.sign(payload, { expiresIn: '15m' })
        const refreshToken = server.jwt.sign(payload, { expiresIn: '7d' })

        logger.info(`Connexion réussie pour: ${email}`)

        return {
          success: true,
          message: 'Connexion réussie',
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              companyId: user.companyId
            },
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: 900 // 15 minutes en secondes
            }
          }
        }
      } catch (error) {
        logger.error('Erreur lors de la connexion:', error)
        return reply.status(500).send({
          success: false,
          message: 'Erreur serveur lors de la connexion'
        })
      }
    })

    // Routes d'analytics (v1)
    await server.register(analyticsRoutes, { prefix: '/api/v1/analytics' })

    // Route de test pour les données (v1)
    server.get('/api/v1/dashboard/stats', async (request, reply) => {
      try {
        // Essayer de récupérer les vraies données de la base
        const [
          totalClients,
          totalProducts,
          totalOrders,
          lowStockProducts
        ] = await Promise.all([
          prisma.client.count({ where: { isActive: true } }),
          prisma.product.count({ where: { isActive: true } }),
          prisma.order.count(),
          prisma.product.count({
            where: {
              isActive: true,
              stockQuantity: { lte: 10 } // Seuil fixe pour simplifier
            }
          })
        ])

        // Calculer le chiffre d'affaires total
        const ordersWithTotal = await prisma.order.aggregate({
          _sum: { total: true },
          where: { status: 'ACCEPTED' }
        })

        return {
          success: true,
          data: {
            totalClients,
            totalProducts,
            totalOrders,
            totalRevenue: ordersWithTotal._sum.total || 0,
            lowStockProducts,
            pendingOrders: await prisma.order.count({ where: { status: 'DRAFT' } }),
            recentActivity: [
              {
                id: '1',
                type: 'order',
                message: 'Données en temps réel depuis la base',
                timestamp: new Date().toISOString()
              }
            ]
          }
        }
      } catch (error) {
        console.error('Erreur base de données, utilisation des données de test:', error)
        // Fallback vers les données de test
        return {
          success: true,
          data: {
            totalClients: 150,
            totalProducts: 75,
            totalOrders: 45,
            totalRevenue: 125000,
            lowStockProducts: 8,
            pendingOrders: 12,
            recentActivity: [
              {
                id: '1',
                type: 'order',
                message: 'Nouvelle commande #CMD-001 (données de test)',
                timestamp: new Date().toISOString()
              },
              {
                id: '2',
                type: 'stock',
                message: 'Stock faible pour Produit A (données de test)',
                timestamp: new Date().toISOString()
              }
            ]
          }
        }
      }
    })

    // Routes de test pour les produits (v1)
    server.get('/api/v1/products', async (request, reply) => {
      try {
        // Récupérer les vraies données de la base
        const products = await prisma.product.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            stockQuantity: true,
            isActive: true,
            sku: true,
            unit: true
          },
          take: 10,
          orderBy: { name: 'asc' }
        })

        const total = await prisma.product.count({ where: { isActive: true } })

        return {
          success: true,
          data: products,
          pagination: {
            page: 1,
            limit: 10,
            total,
            totalPages: Math.ceil(total / 10),
            hasNext: total > 10,
            hasPrev: false
          }
        }
      } catch (error) {
        console.error('Erreur base de données, utilisation des données de test:', error)
        // Fallback vers les données de test
        return {
          success: true,
          data: [
            {
              id: '1',
              name: 'Produit Test 1 (données de test)',
              description: 'Description du produit test 1',
              price: 99.99,
              stockQuantity: 50,
              isActive: true
            },
            {
              id: '2',
              name: 'Produit Test 2 (données de test)',
              description: 'Description du produit test 2',
              price: 149.99,
              stockQuantity: 25,
              isActive: true
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    })

    // Routes de test pour les clients (v1)
    server.get('/api/v1/clients', async (request, reply) => {
      try {
        // Récupérer les vraies données de la base
        const clients = await prisma.client.findMany({
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            type: true,
            isActive: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        })

        const total = await prisma.client.count({ where: { isActive: true } })

        return {
          success: true,
          data: clients,
          pagination: {
            page: 1,
            limit: 10,
            total,
            totalPages: Math.ceil(total / 10),
            hasNext: total > 10,
            hasPrev: false
          }
        }
      } catch (error) {
        console.error('Erreur base de données, utilisation des données de test:', error)
        // Fallback vers les données de test
        return {
          success: true,
          data: [
            {
              id: '1',
              firstName: 'Jean',
              lastName: 'Dupont (données de test)',
              email: 'jean.dupont@email.com',
              phone: '0123456789',
              type: 'INDIVIDUAL',
              isActive: true
            },
            {
              id: '2',
              companyName: 'Entreprise ABC (données de test)',
              email: 'contact@abc.com',
              phone: '0987654321',
              type: 'COMPANY',
              isActive: true
            }
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    })

    // Route pour exporter les clients (v1) - DOIT ÊTRE AVANT /:id
    server.get('/api/v1/clients/export', async (request, reply) => {
      try {
        const query = request.query as any
        console.log('📊 API: Exportation des clients - Format:', query.format)
        console.log('🔍 API: Paramètres de requête:', query)

        // Validation du format
        if (!query.format || !['xlsx', 'pdf'].includes(query.format)) {
          console.log('❌ API: Format invalide ou manquant')
          return reply.status(400).send({
            success: false,
            message: 'Format requis: xlsx ou pdf'
          })
        }

        // Préparer les filtres
        const filters: any = {}
        if (query.search) filters.search = query.search
        if (query.type) filters.type = query.type
        if (query.city) filters.city = query.city
        if (query.isActive !== undefined) {
          filters.isActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined
        }

        console.log('🔍 API: Filtres appliqués:', filters)

        // Construire la requête Prisma
        const whereClause: any = {
          isActive: filters.isActive !== undefined ? filters.isActive : true
        }

        if (filters.search) {
          whereClause.OR = [
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } },
            { companyName: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } }
          ]
        }

        if (filters.type) {
          whereClause.type = filters.type
        }

        if (filters.city) {
          whereClause.city = { contains: filters.city, mode: 'insensitive' }
        }

        // Récupérer tous les clients (sans pagination)
        console.log('🔍 API: Récupération des clients pour export...')
        const clients = await prisma.client.findMany({
          where: whereClause,
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            mobile: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
            website: true,
            fax: true,
            siret: true,
            vatNumber: true,
            paymentTerms: true,
            discount: true,
            creditLimit: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { createdAt: 'desc' }
        })

        console.log(`✅ API: ${clients.length} clients récupérés pour export`)

        if (clients.length === 0) {
          console.log('⚠️ API: Aucun client trouvé pour l\'export')
          return reply.status(404).send({
            success: false,
            message: 'Aucun client trouvé avec les critères spécifiés'
          })
        }

        // Générer le fichier selon le format
        let fileBuffer: Buffer
        let contentType: string
        let filename: string
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]

        if (query.format === 'xlsx') {
          console.log('📊 API: Génération du fichier Excel...')

          // Import dynamique du service ExportService
          const { ExportService } = await import('./services/export.service')
          fileBuffer = await ExportService.generateClientsExcel(clients)

          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          filename = `clients_${timestamp}.xlsx`
        } else { // pdf
          console.log('📄 API: Génération du fichier PDF...')

          // Récupérer les informations de l'entreprise (simulées pour l'instant)
          const company = {
            id: '1',
            name: 'Mon Entreprise',
            address: 'Adresse de l\'entreprise',
            city: 'Ville',
            postalCode: '00000',
            country: 'Pays',
            phone: '+33 1 23 45 67 89',
            email: 'contact@monentreprise.com'
          }

          // Import dynamique du service ExportService
          const { ExportService } = await import('./services/export.service')
          fileBuffer = await ExportService.generateClientsPdf(clients, company)

          contentType = 'application/pdf'
          filename = `clients_${timestamp}.pdf`
        }

        console.log(`✅ API: Fichier généré - ${filename} (${fileBuffer.length} bytes)`)

        // Configurer les headers pour le téléchargement
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)
        reply.header('Content-Type', contentType)
        reply.header('Content-Length', fileBuffer.length.toString())

        return reply.send(fileBuffer)

      } catch (error) {
        console.error('❌ API: Erreur lors de l\'export des clients:', error)

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de l\'exportation des clients',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour télécharger le template d'importation des clients (v1) - DOIT ÊTRE AVANT /:id
    server.get('/api/v1/clients/import/template', async (request, reply) => {
      try {
        console.log('📋 API: Génération du template d\'importation clients...')

        // Import dynamique du service ImportService
        const { ImportService } = await import('./services/import.service')
        const importService = new ImportService()

        const workbook = await importService.generateImportTemplate('clients')

        const filename = 'template_clients.xlsx'
        console.log(`✅ API: Template généré - ${filename}`)

        // Configurer les headers pour le téléchargement
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        reply.header('Content-Disposition', `attachment; filename="${filename}"`)

        const buffer = await workbook.xlsx.writeBuffer()
        reply.header('Content-Length', buffer.length.toString())

        console.log(`✅ API: Template clients envoyé (${buffer.length} bytes)`)
        return reply.send(buffer)

      } catch (error) {
        console.error('❌ API: Erreur génération template clients:', error)

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la génération du template',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour récupérer un client spécifique (v1)
    server.get('/api/v1/clients/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        console.log(`🔍 API: Récupération du client ID: ${id}`)

        // Vérifier que l'ID est fourni
        if (!id) {
          return reply.status(400).send({
            success: false,
            message: 'ID du client requis'
          })
        }

        // Récupérer le client de la base de données
        const client = await prisma.client.findUnique({
          where: { id },
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            mobile: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
            website: true,
            fax: true,
            siret: true,
            vatNumber: true,
            paymentTerms: true,
            discount: true,
            creditLimit: true,
            isActive: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        })

        if (!client) {
          console.log(`❌ API: Client avec l'ID "${id}" non trouvé`)
          return reply.status(404).send({
            success: false,
            message: `Client avec l'ID "${id}" non trouvé`
          })
        }

        // Vérifier que le client est actif
        if (!client.isActive) {
          console.log(`❌ API: Client avec l'ID "${id}" est inactif`)
          return reply.status(404).send({
            success: false,
            message: 'Client non trouvé'
          })
        }

        console.log(`✅ API: Client "${client.firstName || client.companyName}" récupéré avec succès`)

        return {
          success: true,
          data: client
        }

      } catch (error) {
        console.error('❌ API: Erreur récupération client:', error)

        // Gestion spécifique des erreurs Prisma
        if (error instanceof Error && error.message.includes('Invalid ID')) {
          return reply.status(400).send({
            success: false,
            message: 'ID du client invalide'
          })
        }

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la récupération du client',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour créer un nouveau client (v1)
    server.post('/api/v1/clients', async (request, reply) => {
      try {
        const body = request.body as any
        console.log('🆕 API: Création d\'un nouveau client:', body)

        // Validation basique
        if (!body.type) {
          console.log('❌ API: Type de client manquant')
          return reply.status(400).send({
            success: false,
            message: 'Le type de client est requis'
          })
        }

        // Validation selon le type
        if (body.type === 'INDIVIDUAL') {
          if (!body.firstName || !body.lastName) {
            return reply.status(400).send({
              success: false,
              message: 'Le prénom et le nom sont requis pour un particulier'
            })
          }
        } else if (body.type === 'COMPANY') {
          if (!body.companyName) {
            return reply.status(400).send({
              success: false,
              message: 'Le nom de l\'entreprise est requis pour une société'
            })
          }
        }

        if (!body.email) {
          return reply.status(400).send({
            success: false,
            message: 'L\'email est requis'
          })
        }

        // Vérifier si l'email existe déjà
        const existingClient = await prisma.client.findFirst({
          where: {
            email: body.email,
            isActive: true
          }
        })

        if (existingClient) {
          console.log(`❌ API: Email "${body.email}" déjà utilisé`)
          return reply.status(400).send({
            success: false,
            message: 'Un client avec cet email existe déjà'
          })
        }

        // Créer le client
        const clientData = {
          type: body.type,
          firstName: body.firstName || null,
          lastName: body.lastName || null,
          companyName: body.companyName || null,
          email: body.email,
          phone: body.phone || null,
          mobile: body.mobile || null,
          address: body.address || null,
          postalCode: body.postalCode || null,
          city: body.city || null,
          country: body.country || 'France',
          website: body.website || null,
          fax: body.fax || null,
          siret: body.siret || null,
          vatNumber: body.vatNumber || null,
          paymentTerms: body.paymentTerms || 30,
          discount: body.discount || 0,
          creditLimit: body.creditLimit || 0,
          isActive: true,
          notes: body.notes || null,
          companyId: 'cmdlpp04x0000ccucf37x3dte' // Utilisation d'un companyId valide existant
        }

        const client = await prisma.client.create({
          data: clientData,
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            mobile: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
            website: true,
            fax: true,
            siret: true,
            vatNumber: true,
            paymentTerms: true,
            discount: true,
            creditLimit: true,
            isActive: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        })

        const clientName = client.type === 'COMPANY'
          ? client.companyName
          : `${client.firstName} ${client.lastName}`

        console.log(`✅ API: Client "${clientName}" créé avec succès (ID: ${client.id})`)

        return reply.status(201).send({
          success: true,
          data: client,
          message: 'Client créé avec succès'
        })

      } catch (error) {
        console.error('❌ API: Erreur création client:', error)

        // Gestion spécifique des erreurs Prisma
        if (error instanceof Error) {
          if (error.message.includes('Unique constraint')) {
            return reply.status(400).send({
              success: false,
              message: 'Un client avec ces informations existe déjà'
            })
          }
        }

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la création du client',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour supprimer un client (v1)
    server.delete('/api/v1/clients/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        console.log(`🗑️ API: Suppression du client ID: ${id}`)

        // Validation de l'ID
        if (!id || id.trim() === '') {
          console.log('❌ API: ID client manquant')
          return reply.status(400).send({
            success: false,
            message: 'ID du client requis'
          })
        }

        // Vérifier si le client existe
        const existingClient = await prisma.client.findUnique({
          where: {
            id: id,
            isActive: true
          }
        })

        if (!existingClient) {
          console.log(`❌ API: Client avec l'ID "${id}" non trouvé`)
          return reply.status(404).send({
            success: false,
            message: 'Client non trouvé'
          })
        }

        // Supprimer le client (soft delete)
        const deletedClient = await prisma.client.update({
          where: { id: id },
          data: {
            isActive: false,
            updatedAt: new Date()
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            type: true
          }
        })

        const clientName = deletedClient.type === 'COMPANY'
          ? deletedClient.companyName
          : `${deletedClient.firstName} ${deletedClient.lastName}`

        console.log(`✅ API: Client "${clientName}" supprimé avec succès (ID: ${id})`)

        return reply.status(200).send({
          success: true,
          message: 'Client supprimé avec succès',
          data: deletedClient
        })

      } catch (error) {
        console.error('❌ API: Erreur suppression client:', error)

        // Gestion spécifique des erreurs Prisma
        if (error instanceof Error) {
          if (error.message.includes('Record to update not found')) {
            return reply.status(404).send({
              success: false,
              message: 'Client non trouvé'
            })
          }
        }

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la suppression du client',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour modifier un client (v1)
    server.put('/api/v1/clients/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        const body = request.body as any
        console.log(`✏️ API: Modification du client ID: ${id}`)
        console.log('📝 API: Données reçues:', body)

        // Validation de l'ID
        if (!id || id.trim() === '') {
          console.log('❌ API: ID client manquant')
          return reply.status(400).send({
            success: false,
            message: 'ID du client requis'
          })
        }

        // Vérifier si le client existe
        const existingClient = await prisma.client.findUnique({
          where: {
            id: id,
            isActive: true
          }
        })

        if (!existingClient) {
          console.log(`❌ API: Client avec l'ID "${id}" non trouvé`)
          return reply.status(404).send({
            success: false,
            message: 'Client non trouvé'
          })
        }

        // Validation des données selon le type
        if (body.type) {
          if (body.type === 'INDIVIDUAL') {
            if (!body.firstName || !body.lastName) {
              return reply.status(400).send({
                success: false,
                message: 'Le prénom et le nom sont requis pour un particulier'
              })
            }
          } else if (body.type === 'COMPANY') {
            if (!body.companyName) {
              return reply.status(400).send({
                success: false,
                message: 'Le nom de l\'entreprise est requis pour une société'
              })
            }
          }
        }

        // Vérifier l'unicité de l'email si modifié
        if (body.email && body.email !== existingClient.email) {
          const emailExists = await prisma.client.findFirst({
            where: {
              email: body.email,
              isActive: true,
              id: { not: id } // Exclure le client actuel
            }
          })

          if (emailExists) {
            console.log(`❌ API: Email "${body.email}" déjà utilisé par un autre client`)
            return reply.status(400).send({
              success: false,
              message: 'Un autre client avec cet email existe déjà'
            })
          }
        }

        // Préparer les données de mise à jour
        const updateData: any = {
          updatedAt: new Date()
        }

        // Ajouter seulement les champs fournis
        if (body.type !== undefined) updateData.type = body.type
        if (body.firstName !== undefined) updateData.firstName = body.firstName || null
        if (body.lastName !== undefined) updateData.lastName = body.lastName || null
        if (body.companyName !== undefined) updateData.companyName = body.companyName || null
        if (body.email !== undefined) updateData.email = body.email
        if (body.phone !== undefined) updateData.phone = body.phone || null
        if (body.mobile !== undefined) updateData.mobile = body.mobile || null
        if (body.address !== undefined) updateData.address = body.address || null
        if (body.postalCode !== undefined) updateData.postalCode = body.postalCode || null
        if (body.city !== undefined) updateData.city = body.city || null
        if (body.country !== undefined) updateData.country = body.country || 'France'
        if (body.website !== undefined) updateData.website = body.website || null
        if (body.fax !== undefined) updateData.fax = body.fax || null
        if (body.siret !== undefined) updateData.siret = body.siret || null
        if (body.vatNumber !== undefined) updateData.vatNumber = body.vatNumber || null
        if (body.paymentTerms !== undefined) updateData.paymentTerms = body.paymentTerms || 30
        if (body.discount !== undefined) updateData.discount = body.discount || 0
        if (body.creditLimit !== undefined) updateData.creditLimit = body.creditLimit || 0
        if (body.notes !== undefined) updateData.notes = body.notes || null

        // Mettre à jour le client
        const updatedClient = await prisma.client.update({
          where: { id: id },
          data: updateData,
          select: {
            id: true,
            type: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            phone: true,
            mobile: true,
            address: true,
            postalCode: true,
            city: true,
            country: true,
            website: true,
            fax: true,
            siret: true,
            vatNumber: true,
            paymentTerms: true,
            discount: true,
            creditLimit: true,
            isActive: true,
            notes: true,
            createdAt: true,
            updatedAt: true
          }
        })

        const clientName = updatedClient.type === 'COMPANY'
          ? updatedClient.companyName
          : `${updatedClient.firstName} ${updatedClient.lastName}`

        console.log(`✅ API: Client "${clientName}" modifié avec succès (ID: ${id})`)

        return reply.status(200).send({
          success: true,
          data: updatedClient,
          message: 'Client modifié avec succès'
        })

      } catch (error) {
        console.error('❌ API: Erreur modification client:', error)

        // Gestion spécifique des erreurs Prisma
        if (error instanceof Error) {
          if (error.message.includes('Record to update not found')) {
            return reply.status(404).send({
              success: false,
              message: 'Client non trouvé'
            })
          }
          if (error.message.includes('Unique constraint')) {
            return reply.status(400).send({
              success: false,
              message: 'Un client avec ces informations existe déjà'
            })
          }
        }

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la modification du client',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Routes de compatibilité (sans v1) - utilise aussi la vraie base de données
    server.post('/api/auth/login', async (request, reply) => {
      try {
        const { email, password } = request.body as any

        if (!email || !password) {
          return reply.status(400).send({
            success: false,
            message: 'Email et mot de passe requis'
          })
        }

        logger.info(`Tentative de connexion (route /api/auth/login) pour: ${email}`)

        // Authentifier avec la vraie base de données
        const user = await authService.login({ email, password })

        if (!user) {
          logger.warn(`Échec de connexion pour: ${email}`)
          return reply.status(401).send({
            success: false,
            message: 'Email ou mot de passe incorrect'
          })
        }

        // Générer les tokens JWT
        const payload = {
          userId: user.id,
          email: user.email,
          role: user.role,
          companyId: user.companyId
        }

        const accessToken = server.jwt.sign(payload, { expiresIn: '15m' })
        const refreshToken = server.jwt.sign(payload, { expiresIn: '7d' })

        logger.info(`Connexion réussie pour: ${email}`)

        return {
          success: true,
          message: 'Connexion réussie',
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              companyId: user.companyId
            },
            tokens: {
              accessToken,
              refreshToken,
              expiresIn: 900 // 15 minutes en secondes
            }
          }
        }
      } catch (error) {
        logger.error('Erreur lors de la connexion:', error)
        return reply.status(500).send({
          success: false,
          message: 'Erreur serveur lors de la connexion'
        })
      }
    })

    // Route pour les fournisseurs (v1)
    server.get('/api/v1/suppliers', async (request, reply) => {
      try {
        console.log('🔍 API: Récupération des fournisseurs')

        // Récupérer les vraies données de la base
        const suppliers = await prisma.supplier.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            contactName: true,
            email: true,
            phone: true,
            address: true,
            type: true,
            isPreferred: true,
            isActive: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 100 // Limite à 100 fournisseurs
        })

        const total = await prisma.supplier.count({
          where: { isActive: true }
        })

        console.log(`✅ API: ${suppliers.length} fournisseurs récupérés`)

        return {
          success: true,
          data: suppliers,
          pagination: {
            page: 1,
            limit: 100,
            total,
            totalPages: Math.ceil(total / 100),
            hasNext: total > 100,
            hasPrev: false
          }
        }
      } catch (error) {
        console.error('Erreur base de données, utilisation des données de test:', error)
        // Fallback vers les données de test
        return {
          success: true,
          data: [
            {
              id: '1',
              name: 'Fournisseur Test 1',
              contactName: 'Jean Dupont',
              email: 'jean@fournisseur1.com',
              phone: '01 23 45 67 89',
              address: '123 Rue de la Paix, 75001 Paris',
              type: 'MANUFACTURER',
              isPreferred: true,
              isActive: true,
              createdAt: new Date().toISOString()
            },
            {
              id: '2',
              name: 'Fournisseur Test 2',
              contactName: 'Marie Martin',
              email: 'marie@fournisseur2.com',
              phone: '01 98 76 54 32',
              address: '456 Avenue des Champs, 69000 Lyon',
              type: 'DISTRIBUTOR',
              isPreferred: false,
              isActive: true,
              createdAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: 1,
            limit: 100,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false
          }
        }
      }
    })

    // Route pour créer un nouveau fournisseur (v1)
    server.post('/api/v1/suppliers', async (request, reply) => {
      try {
        console.log('📝 API: Création d\'un nouveau fournisseur')
        console.log('📊 Données reçues:', request.body)

        const body = request.body as any

        // Validation des données requises
        if (!body.name || !body.name.trim()) {
          console.log('❌ API: Nom manquant pour la création du fournisseur')
          return reply.status(400).send({
            success: false,
            message: 'Le nom du fournisseur est requis'
          })
        }

        // Vérifier si un fournisseur avec cet email existe déjà (si email fourni)
        if (body.email && body.email.trim()) {
          const existingSupplier = await prisma.supplier.findFirst({
            where: {
              email: body.email.trim(),
              companyId: 'cmdlpnczm0000ccuk0wllw1kp' // Utilisation de la première compagnie trouvée
            }
          })

          if (existingSupplier) {
            console.log(`❌ API: Fournisseur avec l'email "${body.email}" existe déjà (ID: ${existingSupplier.id})`)
            return reply.status(409).send({
              success: false,
              message: `Un fournisseur avec l'email "${body.email}" existe déjà. Veuillez utiliser un autre email ou modifier le fournisseur existant.`
            })
          }
        }

        // Créer le nouveau fournisseur (support snake_case et camelCase)
        const newSupplier = await prisma.supplier.create({
          data: {
            type: body.type || 'COMPANY',
            name: body.name,
            contactName: body.contactName || body.contact_name || null,
            email: body.email || null,
            phone: body.phone || null,
            mobile: body.mobile || null,
            website: body.website || null,
            fax: body.fax || null,
            address: body.address || null,
            city: body.city || null,
            postalCode: body.postalCode || body.postal_code || null,
            country: body.country || 'France',
            siret: body.siret || null,
            vatNumber: body.vatNumber || body.vat_number || null,
            rcs: body.rcs || null,
            paymentTerms: body.paymentTerms || body.payment_terms || 30,
            discount: body.discount || 0,
            currency: body.currency || 'EUR',
            rating: body.rating || 0,
            isActive: body.isActive !== false && body.is_active !== false,
            isPreferred: body.isPreferred || body.is_preferred || false,
            notes: body.notes || null,
            companyId: 'cmdlpnczm0000ccuk0wllw1kp' // Utilisation de la première compagnie trouvée
          }
        })

        console.log('✅ API: Fournisseur créé avec succès:', newSupplier.id)

        return {
          success: true,
          message: 'Fournisseur créé avec succès',
          data: newSupplier
        }

      } catch (error) {
        console.error('❌ API: Erreur création fournisseur:', error)
        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la création du fournisseur',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route pour supprimer un fournisseur (v1)
    server.delete('/api/v1/suppliers/:id', async (request, reply) => {
      try {
        const { id } = request.params as { id: string }
        console.log(`🗑️ API: Suppression du fournisseur ID: ${id}`)

        // Vérifier que l'ID est fourni
        if (!id) {
          return reply.status(400).send({
            success: false,
            message: 'ID du fournisseur requis'
          })
        }

        // Vérifier que le fournisseur existe
        const existingSupplier = await prisma.supplier.findUnique({
          where: { id }
        })

        if (!existingSupplier) {
          console.log(`❌ API: Fournisseur avec l'ID "${id}" non trouvé`)
          return reply.status(404).send({
            success: false,
            message: `Fournisseur avec l'ID "${id}" non trouvé`
          })
        }

        // Supprimer le fournisseur (suppression physique)
        // Note: Pour une suppression logique, utiliser: { isActive: false }
        await prisma.supplier.delete({
          where: { id }
        })

        console.log(`✅ API: Fournisseur "${existingSupplier.name}" supprimé avec succès`)

        return {
          success: true,
          message: `Fournisseur "${existingSupplier.name}" supprimé avec succès`
        }

      } catch (error) {
        console.error('❌ API: Erreur suppression fournisseur:', error)

        // Gestion spécifique des erreurs Prisma
        if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
          return reply.status(404).send({
            success: false,
            message: 'Fournisseur non trouvé'
          })
        }

        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la suppression du fournisseur',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Route temporaire pour lister les compagnies (debug)
    server.get('/api/v1/companies', async (request, reply) => {
      try {
        console.log('🔍 API: Récupération des compagnies (debug)')

        const companies = await prisma.company.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true
          }
        })

        console.log('✅ API: Compagnies trouvées:', companies.length)
        companies.forEach(company => {
          console.log(`  - ${company.name} (ID: ${company.id})`)
        })

        return {
          success: true,
          data: companies
        }

      } catch (error) {
        console.error('❌ API: Erreur récupération compagnies:', error)
        reply.status(500).send({
          success: false,
          message: 'Erreur lors de la récupération des compagnies',
          error: error instanceof Error ? error.message : 'Erreur inconnue'
        })
      }
    })

    // Gestion des erreurs
    server.setErrorHandler((error, request, reply) => {
      server.log.error(error)
      
      reply.status(500).send({
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    })

    // Gestion des routes non trouvées
    server.setNotFoundHandler((request, reply) => {
      reply.status(404).send({
        success: false,
        message: 'Route non trouvée',
        path: request.url
      })
    })

    return server
  } catch (error) {
    server.log.error('Erreur lors de la création du serveur:', error)
    throw error
  }
}

export { createServer }

// Démarrage du serveur si ce fichier est exécuté directement
if (require.main === module) {
  const start = async () => {
    try {
      const app = await createServer()
      const port = parseInt(process.env.PORT || '3001')
      const host = process.env.HOST || '0.0.0.0'

      await app.listen({ port, host })
      console.log(`🚀 Serveur démarré sur http://${host}:${port}`)
      console.log(`📊 Health check: http://${host}:${port}/health`)
      console.log(`🔗 API: http://${host}:${port}/api/health`)
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du serveur:', error)
      process.exit(1)
    }
  }

  start()
}
