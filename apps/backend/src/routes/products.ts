import { ImportService } from '../services/import.service'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { ProductService } from '../services/product.service'
import { ExportService } from '../services/export.service'
import { PaginationSchema, AuthenticatedRequest } from '@gestion/shared'
import { logger } from '../utils/logger'
import { prisma, Product } from '@gestion/database'

// Schémas de validation
const CreateProductSchema = z.object({
  name: z.string().min(1, 'Le nom du produit est requis'),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0, 'Le prix doit être positif'),
  cost: z.number().min(0, 'Le coût doit être positif').optional(),
  vatRate: z.number().min(0).max(100).default(20),
  stockQuantity: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  maxStock: z.number().int().min(0).optional(),
  isActive: z.boolean().default(true),
  isService: z.boolean().default(false),
  unit: z.string().default('pièce'),
  categoryId: z.string().optional(),
})

const UpdateProductSchema = CreateProductSchema.partial()

const ProductFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  isService: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  priceMin: z.number().optional(),
  priceMax: z.number().optional(),
  inStock: z.boolean().optional(),
})

function getOwnerScopeId(request: FastifyRequest): string | undefined {
  const user = (request as any).user
  return user?.companyId || user?.id || user?.userId
}

// Schémas pour les images
const ProductImageSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().min(1),
  url: z.string().url(),
  altText: z.string().optional(),
  isMain: z.boolean().default(false),
})

// Schémas pour les variantes
const ProductVariantSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  material: z.string().optional(),
  price: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  stock: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
})

const UpdateProductVariantSchema = ProductVariantSchema.partial()

const exportQuerySchema = ProductFiltersSchema.extend({
  format: z.enum(['xlsx', 'pdf']),
});

export default async function productRoutes(server: FastifyInstance) {
  // Créer un produit
  server.post('/', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Créer un nouveau produit',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          sku: { type: 'string' },
          barcode: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          cost: { type: 'number', minimum: 0 },
          vatRate: { type: 'number', minimum: 0, maximum: 100, default: 20 },
          stockQuantity: { type: 'integer', minimum: 0, default: 0 },
          minStock: { type: 'integer', minimum: 0, default: 0 },
          maxStock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean', default: true },
          isService: { type: 'boolean', default: false },
          unit: { type: 'string', default: 'pièce' },
          categoryId: { type: 'string' }
        }
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
                name: { type: 'string' },
                sku: { type: 'string' },
                price: { type: 'number' },
                stockQuantity: { type: 'number' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const data = CreateProductSchema.parse(request.body)
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const product = await ProductService.createProduct(data, ownerScopeId)

      return reply.status(201).send({
        success: true,
        data: product,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la création du produit', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la création du produit',
      })
    }
  })

  // Récupérer la liste des produits
  server.get('/', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Récupérer la liste des produits',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          // On autorise une borne large à l'entrée, puis le handler plafonne
          // réellement la pagination. Cela évite les 400 sur d'anciens clients
          // qui envoient encore des tailles de page élevées.
          limit: { type: 'integer', minimum: 1, maximum: 10000, default: 10 },
          search: { type: 'string' },
          categoryId: { type: 'string' },
          isActive: { type: 'boolean' },
          isService: { type: 'boolean' },
          lowStock: { type: 'boolean' },
          priceMin: { type: 'number' },
          priceMax: { type: 'number' },
          inStock: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const pagination = PaginationSchema.parse(request.query)
      const filters = ProductFiltersSchema.parse(request.query)
      // Compatibilité double schéma :
      // - ancien backend => périmètre par `companyId`
      // - base PostgreSQL locale actuelle => périmètre par `userId`
      const ownerScopeId = request.user.companyId || request.user.id || request.user.userId

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const normalizedPagination = {
        ...pagination,
        page: Math.max(1, Math.floor(Number(pagination.page) || 1)),
        limit: Math.min(Math.max(1, Math.floor(Number(pagination.limit) || 10)), 100),
      }

      const result = await ProductService.getProducts(ownerScopeId, filters, normalizedPagination)

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des produits',
      })
    }
  })

  // Récupérer un produit par ID
  server.get('/:id', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Récupérer un produit par ID',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const product = await ProductService.getProductById(id, ownerScopeId)

      if (!product) {
        return reply.status(404).send({
          success: false,
          message: 'Produit non trouvé',
        })
      }

      return reply.send({
        success: true,
        data: product,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération du produit', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération du produit',
      })
    }
  })

  // Mettre à jour un produit
  server.put('/:id', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Mettre à jour un produit',
      tags: ['Produits'],
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
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          sku: { type: 'string' },
          barcode: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          cost: { type: 'number', minimum: 0 },
          vatRate: { type: 'number', minimum: 0, maximum: 100 },
          stockQuantity: { type: 'integer', minimum: 0 },
          minStock: { type: 'integer', minimum: 0 },
          maxStock: { type: 'integer', minimum: 0 },
          isActive: { type: 'boolean' },
          isService: { type: 'boolean' },
          unit: { type: 'string' },
          categoryId: { type: 'string' }
        }
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = UpdateProductSchema.parse(request.body)
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const product = await ProductService.updateProduct(id, data, ownerScopeId)

      return reply.send({
        success: true,
        data: product,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la mise à jour du produit', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la mise à jour du produit',
      })
    }
  })

  // Supprimer un produit
  server.delete('/:id', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Supprimer un produit',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const ownerScopeId = getOwnerScopeId(request)

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      await ProductService.deleteProduct(id, ownerScopeId)

      return reply.send({
        success: true,
        message: 'Produit supprimé avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression du produit', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression du produit',
      })
    }
  })

  // Rechercher des produits
  server.get('/search/:query', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Rechercher des produits',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          query: { type: 'string', minLength: 2 },
        },
        required: ['query'],
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const { query } = request.params as { query: string }
      const { limit = 10 } = request.query as { limit?: number }
      const { companyId } = request.user

      const products = await ProductService.searchProducts(companyId, query, limit)

      return reply.send({
        success: true,
        data: products,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la recherche de produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la recherche de produits',
      })
    }
  })

  // Produits en rupture de stock
  server.get('/alerts/low-stock', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Récupérer les produits en rupture de stock',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { companyId } = request.user

      const products = await ProductService.getLowStockProducts(companyId)

      return reply.send({
        success: true,
        data: products,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des produits en rupture', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des produits en rupture',
      })
    }
  })

  // Statistiques des produits
  server.get('/stats/overview', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Statistiques des produits',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { companyId } = request.user

      const stats = await ProductService.getProductStats(companyId)

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

  // ===== ROUTES POUR LES IMAGES =====

  // Ajouter une image à un produit
  server.post('/:id/images', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Ajouter une image à un produit',
      tags: ['Produits'],
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
        required: ['filename', 'originalName', 'mimeType', 'size', 'url'],
        properties: {
          filename: { type: 'string', minLength: 1 },
          originalName: { type: 'string', minLength: 1 },
          mimeType: { type: 'string', minLength: 1 },
          size: { type: 'integer', minimum: 1 },
          url: { type: 'string', format: 'uri' },
          altText: { type: 'string' },
          isMain: { type: 'boolean', default: false }
        }
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const imageData = ProductImageSchema.parse(request.body)
      const { companyId } = request.user

      const image = await ProductService.addProductImage(id, imageData, companyId)

      return reply.status(201).send({
        success: true,
        data: image,
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'ajout de l\'image', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de l\'ajout de l\'image',
      })
    }
  })

  // Récupérer les images d'un produit
  server.get('/:id/images', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Récupérer les images d\'un produit',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      const images = await ProductService.getProductImages(id, companyId)

      return reply.send({
        success: true,
        data: images,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des images', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des images',
      })
    }
  })

  // Supprimer une image de produit
  server.delete('/images/:imageId', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Supprimer une image de produit',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          imageId: { type: 'string' },
        },
        required: ['imageId'],
      },
    },
  }, async (request, reply) => {
    try {
      const { imageId } = request.params as { imageId: string }
      const { companyId } = request.user

      await ProductService.deleteProductImage(imageId, companyId)

      return reply.send({
        success: true,
        message: 'Image supprimée avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de l\'image', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression de l\'image',
      })
    }
  })

  // ===== ROUTES D'EXPORT =====

  // Export Excel des produits
  server.get('/export/excel', {
    preHandler: [server.authenticate],
  }, async (request, reply) => {
    try {
      const { companyId } = request.user

      // Récupérer tous les produits pour l'export
      const result = await ProductService.getProducts(companyId, {}, { page: 1, limit: 10000 })
      const products = result.data

      // Réutiliser le service d'export TypeScript centralisé du backend.
      const exportService = new ExportService()

      const filename = `produits_${Date.now()}.xlsx`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateExcelReport(products, 'products', outputPath)

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
      logger.error('Erreur lors de l\'export Excel des produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export Excel des produits',
      })
    }
  })

  // ===== ROUTES POUR LES VARIANTES =====

  // Ajouter une variante à un produit
  server.post('/:id/variants', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Ajouter une variante à un produit',
      tags: ['Produits'],
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
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1 },
          sku: { type: 'string' },
          barcode: { type: 'string' },
          color: { type: 'string' },
          size: { type: 'string' },
          material: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          cost: { type: 'number', minimum: 0 },
          stock: { type: 'integer', minimum: 0, default: 0 },
          isActive: { type: 'boolean', default: true }
        }
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const variantData = ProductVariantSchema.parse(request.body)
      const { companyId } = request.user

      const variant = await ProductService.addProductVariant(id, variantData, companyId)

      return reply.status(201).send({
        success: true,
        data: variant,
      })
    } catch (error: any) {
      logger.error('Erreur lors de l\'ajout de la variante', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de l\'ajout de la variante',
      })
    }
  })

  // Récupérer les variantes d'un produit
  server.get('/:id/variants', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Récupérer les variantes d\'un produit',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
        required: ['id'],
      },
    },
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { companyId } = request.user

      const variants = await ProductService.getProductVariants(id, companyId)

      return reply.send({
        success: true,
        data: variants,
      })
    } catch (error: any) {
      logger.error('Erreur lors de la récupération des variantes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la récupération des variantes',
      })
    }
  })

  // Export PDF des produits
  server.get('/export/pdf', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Export PDF des produits',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
    },
  }, async (request, reply) => {
    try {
      const { companyId } = request.user

      // Récupérer tous les produits pour l'export
      const result = await ProductService.getProducts(companyId, {}, { page: 1, limit: 10000 })
      const products = result.data

      // Réutiliser le service d'export TypeScript centralisé du backend.
      const exportService = new ExportService()

      const filename = `produits_${Date.now()}.pdf`
      const fs = require('fs')
      const path = require('path')

      // Créer le dossier exports s'il n'existe pas
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generatePDFReport(products, 'Liste des Produits', outputPath)

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

    } catch (error: any) {
      logger.error('Erreur lors de l\'export PDF des produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export PDF des produits',
      })
    }
  })

  // Import Excel des produits
  server.post('/import/excel', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Import Excel des produits',
      tags: ['Produits'],
      security: [{ bearerAuth: [] }],
      consumes: ['multipart/form-data'],
    },
  }, async (request, reply) => {
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
      const { pipeline } = require('stream')
      const { promisify } = require('util')

      const tempDir = path.join(process.cwd(), 'temp')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Sauvegarder le fichier temporairement
      tempFilePath = path.join(tempDir, `import_products_${Date.now()}_${data.filename}`)
      const pump = promisify(pipeline)
      await pump(data.file, fs.createWriteStream(tempFilePath))

      // Utiliser le service d'import
      const ImportService = require('../services/import-service.js')
      const importService = new ImportService()

      // Valider le fichier
      importService.validateFile(tempFilePath, 'products')

      // Lire les données du fichier
      const { data: productsData } = await importService.readExcelFile(tempFilePath)

      // Valider et normaliser les données
      const { validProducts, errors, warnings } = importService.validateProductData(productsData)

      if (errors.length > 0) {
        return reply.status(400).send({
          success: false,
          message: 'Erreurs de validation détectées',
          errors,
          warnings,
        })
      }

      // Importer les produits valides
      let imported = 0
      let updated = 0
      const importErrors = []

      for (const productData of validProducts) {
        try {
          // Vérifier si le produit existe déjà (par nom ou SKU)
          const existingProduct = await ProductService.getProductByNameOrSku(productData.name, productData.sku, companyId)

          if (existingProduct) {
            // Mettre à jour le produit existant
            await ProductService.updateProduct(existingProduct.id, productData, companyId)
            updated++
          } else {
            // Créer un nouveau produit
            await ProductService.createProduct(productData, companyId)
            imported++
          }
        } catch (error: any) {
          importErrors.push(`Erreur pour ${productData.name}: ${error.message}`)
        }
      }

      return reply.send({
        success: true,
        message: `Import terminé: ${imported} produits créés, ${updated} mis à jour`,
        data: {
          imported,
          updated,
          errors: importErrors,
          warnings,
        },
      })

    } catch (error: any) {
      logger.error('Erreur lors de l\'import Excel des produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: error.message || 'Erreur lors de l\'import Excel des produits',
      })
    } finally {
      // Nettoyer le fichier temporaire
      if (tempFilePath && require('fs').existsSync(tempFilePath)) {
        try {
          require('fs').unlinkSync(tempFilePath)
        } catch (error) {
          logger.error('Erreur lors de la suppression du fichier temporaire', { error })
        }
      }
    }
  })

  // Télécharger le template d'importation
  server.get('/import/template', {
    schema: {
      description: 'Télécharger le template d\'importation des produits',
      tags: ['Produits'],
    },
  }, async (request, reply) => {
    try {
      const ImportService = require('../services/import-service.js')
      const importService = new ImportService()

      const workbook = await importService.generateImportTemplate('products')

      const filename = 'template_produits.xlsx'
      reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)

      const buffer = await workbook.xlsx.writeBuffer()
      reply.send(buffer)

    } catch (error: any) {
      logger.error('Erreur lors de la génération du template produits', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de la génération du template',
      })
    }
  })

  // Supprimer une variante de produit
  server.delete('/variants/:variantId', {
    preHandler: [server.authenticate],
    schema: {
      description: 'Supprimer une variante de produit',
      tags: ['Produits', 'Variantes'],
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          variantId: { type: 'string' },
        },
        required: ['variantId'],
      },
    }
  }, async (request, reply) => {
    try {
      const { variantId } = request.params as { variantId: string }
      const { companyId } = request.user

      await ProductService.deleteProductVariant(variantId, companyId)

      return reply.send({
        success: true,
        message: 'Variante de produit supprimée avec succès',
      })
    } catch (error: any) {
      logger.error('Erreur lors de la suppression de la variante', { error: error.message })
      return reply.status(400).send({
        success: false,
        message: error.message || 'Erreur lors de la suppression de la variante',
      })
    }
  })

  // Exporter les produits
  server.get('/export', {
    preHandler: [/* @ts-ignore */ server.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const ownerScopeId = getOwnerScopeId(request)
      const { format, ...productFilters } = request.query as any

      if (!ownerScopeId) {
        return reply.status(401).send({
          success: false,
          message: 'Contexte d’authentification incomplet',
        })
      }

      const { data: products } = await ProductService.getProducts(ownerScopeId, productFilters)

      let fileBuffer: Buffer;
      let contentType: string;
      let filename: string;
      const timestamp = new Date().toISOString().replace(/:/g, '-');

      if (format === 'xlsx') {
        fileBuffer = await ExportService.generateProductsExcel(products);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `produits_${timestamp}.xlsx`;
      } else { // pdf
        const companyId = (request.user as any)?.companyId
        const company = companyId
          ? await prisma.company.findUnique({ where: { id: companyId } })
          : null

        fileBuffer = await ExportService.generateProductsPdf(
          products,
          (company || { name: 'Gestion Commerciale' }) as any
        );
        contentType = 'application/pdf';
        filename = `produits_${timestamp}.pdf`;
      }

      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.type(contentType);
      return reply.send(fileBuffer);

    } catch (error: any) {
      logger.error(`Erreur lors de l'export des produits`, { error: error.message, stack: error.stack });
      return reply.status(500).send({
        success: false,
        message: "Erreur interne lors de l'exportation des produits.",
      })
    }
  })
}

