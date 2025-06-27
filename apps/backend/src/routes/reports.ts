import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AuthenticatedRequest } from '../types/common'
import { logger } from '../utils/logger'
import { ClientService } from '../services/client.service'
import { ProductService } from '../services/product.service'
import { OrderService } from '../services/order.service'
import { InvoiceService } from '../services/invoice.service'
import * as fs from 'fs'
import * as path from 'path'

const reportPeriodSchema = z.object({
  period: z.enum(['1m', '3m', '6m', '12m']).optional().default('12m'),
})

export async function reportsRoutes(server: FastifyInstance) {
  // Export PDF du rapport des ventes
  server.get('/sales/pdf', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export PDF du rapport des ventes',
      tags: ['Rapports'],
      security: [{ bearerAuth: [] }],
      querystring: reportPeriodSchema,
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user
      const { period } = request.query as z.infer<typeof reportPeriodSchema>

      // Calculer les dates selon la période
      const endDate = new Date()
      const startDate = new Date()
      
      switch (period) {
        case '1m':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case '3m':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case '6m':
          startDate.setMonth(startDate.getMonth() - 6)
          break
        case '12m':
        default:
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      // Récupérer les données pour le rapport
      const [orders, invoices, clients, products] = await Promise.all([
        OrderService.getOrders(companyId, { 
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString()
        }, { page: 1, limit: 10000 }),
        InvoiceService.getInvoices(companyId, {
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString()
        }, { page: 1, limit: 10000 }),
        ClientService.getClients(companyId, {}, { page: 1, limit: 10000 }),
        ProductService.getProducts(companyId, {}, { page: 1, limit: 10000 })
      ])

      // Calculer les métriques de vente
      const salesData = {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalOrders: orders.data.length,
        totalInvoices: invoices.data.length,
        totalRevenue: invoices.data.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        totalClients: clients.data.length,
        totalProducts: products.data.length,
        orders: orders.data,
        invoices: invoices.data,
        topProducts: [], // TODO: Calculer les produits les plus vendus
        topClients: [], // TODO: Calculer les meilleurs clients
      }

      // Utiliser le service d'export
      const ExportService = require('../services/export-service.js')
      const exportService = new ExportService()

      const filename = `rapport_ventes_${period}_${Date.now()}.pdf`
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateSalesReportPDF(salesData, outputPath)

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
      logger.error('Erreur lors de l\'export PDF du rapport des ventes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export PDF du rapport des ventes',
      })
    }
  })

  // Export Excel du rapport des ventes
  server.get('/sales/excel', {
    preHandler: [/* @ts-ignore */ server.authenticate],
    schema: {
      description: 'Export Excel du rapport des ventes',
      tags: ['Rapports'],
      security: [{ bearerAuth: [] }],
      querystring: reportPeriodSchema,
    },
  }, async (request: AuthenticatedRequest, reply: FastifyReply) => {
    try {
      const { companyId } = request.user
      const { period } = request.query as z.infer<typeof reportPeriodSchema>

      // Calculer les dates selon la période
      const endDate = new Date()
      const startDate = new Date()
      
      switch (period) {
        case '1m':
          startDate.setMonth(startDate.getMonth() - 1)
          break
        case '3m':
          startDate.setMonth(startDate.getMonth() - 3)
          break
        case '6m':
          startDate.setMonth(startDate.getMonth() - 6)
          break
        case '12m':
        default:
          startDate.setFullYear(startDate.getFullYear() - 1)
          break
      }

      // Récupérer les données pour le rapport
      const [orders, invoices, clients, products] = await Promise.all([
        OrderService.getOrders(companyId, { 
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString()
        }, { page: 1, limit: 10000 }),
        InvoiceService.getInvoices(companyId, {
          dateFrom: startDate.toISOString(),
          dateTo: endDate.toISOString()
        }, { page: 1, limit: 10000 }),
        ClientService.getClients(companyId, {}, { page: 1, limit: 10000 }),
        ProductService.getProducts(companyId, {}, { page: 1, limit: 10000 })
      ])

      // Calculer les métriques de vente
      const salesData = {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalOrders: orders.data.length,
        totalInvoices: invoices.data.length,
        totalRevenue: invoices.data.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
        totalClients: clients.data.length,
        totalProducts: products.data.length,
        orders: orders.data,
        invoices: invoices.data,
        clients: clients.data,
        products: products.data,
      }

      // Utiliser le service d'export
      const ExportService = require('../services/export-service.js')
      const exportService = new ExportService()

      const filename = `rapport_ventes_${period}_${Date.now()}.xlsx`
      const exportsDir = path.join(process.cwd(), 'exports')
      if (!fs.existsSync(exportsDir)) {
        fs.mkdirSync(exportsDir, { recursive: true })
      }

      const outputPath = path.join(exportsDir, filename)
      await exportService.generateSalesReportExcel(salesData, outputPath)

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
      logger.error('Erreur lors de l\'export Excel du rapport des ventes', { error: error.message })
      return reply.status(500).send({
        success: false,
        message: 'Erreur lors de l\'export Excel du rapport des ventes',
      })
    }
  })
}

