#!/usr/bin/env node

/**
 * Script d'analyse des incohérences entre les données du dashboard et PostgreSQL
 */

const { PrismaClient } = require('../prisma/generated/client')
const axios = require('axios')

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3004/api/v1'

async function analyzeDashboardData() {
  console.log('🔍 Analyse des incohérences Dashboard vs PostgreSQL')
  console.log('==================================================\n')
  
  try {
    // 1. Authentification pour récupérer les données du dashboard
    console.log('1. 🔐 Authentification...')
    const authResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    const companyId = authResponse.data.data.user.companyId
    console.log(`✅ Authentifié pour l'entreprise: ${companyId}\n`)
    
    // 2. Récupérer les données du dashboard via l'API
    console.log('2. 📊 Récupération des données du dashboard...')
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const dashboardData = dashboardResponse.data.data
    console.log('✅ Données du dashboard récupérées\n')
    
    // 3. Récupérer les données directement de PostgreSQL
    console.log('3. 🗃️ Récupération des données directes de PostgreSQL...')
    
    // Clients
    const [totalClients, individualClients, companyClients, recentClients] = await Promise.all([
      prisma.client.count({ where: { companyId, isActive: true } }),
      prisma.client.count({ where: { companyId, isActive: true, type: 'INDIVIDUAL' } }),
      prisma.client.count({ where: { companyId, isActive: true, type: 'COMPANY' } }),
      prisma.client.count({
        where: {
          companyId,
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      })
    ])
    
    // Produits et stocks
    const [totalProducts, inStockProducts, outOfStockProducts] = await Promise.all([
      prisma.product.count({ where: { companyId, isActive: true } }),
      prisma.product.count({ 
        where: { 
          companyId, 
          isActive: true,
          stock: { quantiteActuelle: { gt: 0 } }
        } 
      }),
      prisma.product.count({ 
        where: { 
          companyId, 
          isActive: true,
          stock: { quantiteActuelle: { lte: 0 } }
        } 
      })
    ])
    
    // Stock faible (quantité <= seuil minimum) - utiliser une requête SQL brute
    const lowStockProductsResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      INNER JOIN stocks s ON p.id = s."productId"
      WHERE p."companyId" = ${companyId}
        AND p."isActive" = true
        AND s."quantiteActuelle" <= s."quantiteMinimale"
    `
    const lowStockProducts = Number(lowStockProductsResult[0]?.count || 0)
    
    // Valeur totale du stock
    const stockValueResult = await prisma.stock.aggregate({
      where: { companyId },
      _sum: { valeurStock: true }
    })
    
    // Commandes
    const [totalOrders, draftOrders, sentOrders, acceptedOrders] = await Promise.all([
      prisma.order.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: 'DRAFT' } }),
      prisma.order.count({ where: { companyId, status: 'SENT' } }),
      prisma.order.count({ where: { companyId, status: 'ACCEPTED' } })
    ])
    
    // Valeur moyenne des commandes
    const avgOrderValue = await prisma.order.aggregate({
      where: { companyId },
      _avg: { total: true }
    })
    
    // Factures
    const [totalInvoices, paidInvoices, sentInvoices] = await Promise.all([
      prisma.invoice.count({ where: { companyId } }),
      prisma.invoice.count({ where: { companyId, status: 'PAID' } }),
      prisma.invoice.count({ where: { companyId, status: 'SENT' } })
    ])
    
    // Montants des factures
    const [totalInvoiceAmount, paidInvoiceAmount] = await Promise.all([
      prisma.invoice.aggregate({
        where: { companyId },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: { companyId, status: 'PAID' },
        _sum: { total: true }
      })
    ])
    
    // Ventes du mois actuel et précédent
    const currentDate = new Date()
    const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const previousMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0)
    
    const [currentMonthSales, previousMonthSales] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          companyId,
          status: 'PAID',
          paidDate: { gte: currentMonthStart }
        },
        _sum: { total: true }
      }),
      prisma.invoice.aggregate({
        where: {
          companyId,
          status: 'PAID',
          paidDate: { gte: previousMonthStart, lt: previousMonthEnd }
        },
        _sum: { total: true }
      })
    ])
    
    console.log('✅ Données PostgreSQL récupérées\n')
    
    // 4. Comparaison et analyse des incohérences
    console.log('4. 🔍 Analyse des incohérences...\n')
    
    const dbData = {
      clients: {
        total: totalClients,
        individuals: individualClients,
        companies: companyClients,
        recentCount: recentClients
      },
      products: {
        total: totalProducts,
        inStock: inStockProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
        totalStockValue: Number(stockValueResult._sum.valeurStock || 0)
      },
      orders: {
        total: totalOrders,
        pending: draftOrders,
        accepted: acceptedOrders,
        sent: sentOrders,
        averageValue: Number(avgOrderValue._avg.total || 0)
      },
      invoices: {
        total: totalInvoices,
        paid: paidInvoices,
        pending: sentInvoices,
        totalAmount: Number(totalInvoiceAmount._sum.total || 0),
        paidAmount: Number(paidInvoiceAmount._sum.total || 0)
      },
      sales: {
        currentMonth: Number(currentMonthSales._sum.total || 0),
        previousMonth: Number(previousMonthSales._sum.total || 0)
      }
    }
    
    // Fonction pour comparer les valeurs
    function compareValues(section, field, dashboardValue, dbValue) {
      const match = dashboardValue === dbValue
      const status = match ? '✅' : '❌'
      const diff = dashboardValue - dbValue
      
      console.log(`   ${status} ${field}: Dashboard=${dashboardValue}, DB=${dbValue}${!match ? ` (diff: ${diff})` : ''}`)
      
      return !match
    }
    
    let hasInconsistencies = false
    
    // Comparaison Clients
    console.log('📊 CLIENTS:')
    hasInconsistencies |= compareValues('clients', 'Total', dashboardData.clients.total, dbData.clients.total)
    hasInconsistencies |= compareValues('clients', 'Particuliers', dashboardData.clients.individuals, dbData.clients.individuals)
    hasInconsistencies |= compareValues('clients', 'Entreprises', dashboardData.clients.companies, dbData.clients.companies)
    hasInconsistencies |= compareValues('clients', 'Récents', dashboardData.clients.recentCount, dbData.clients.recentCount)
    
    // Comparaison Produits
    console.log('\n📦 PRODUITS:')
    hasInconsistencies |= compareValues('products', 'Total', dashboardData.products.total, dbData.products.total)
    hasInconsistencies |= compareValues('products', 'En stock', dashboardData.products.inStock, dbData.products.inStock)
    hasInconsistencies |= compareValues('products', 'Stock faible', dashboardData.products.lowStock, dbData.products.lowStock)
    hasInconsistencies |= compareValues('products', 'Rupture', dashboardData.products.outOfStock, dbData.products.outOfStock)
    hasInconsistencies |= compareValues('products', 'Valeur stock', dashboardData.products.totalStockValue, dbData.products.totalStockValue)
    
    // Comparaison Commandes
    console.log('\n📝 COMMANDES:')
    hasInconsistencies |= compareValues('orders', 'Total', dashboardData.orders.total, dbData.orders.total)
    hasInconsistencies |= compareValues('orders', 'En attente', dashboardData.orders.pending, dbData.orders.pending)
    hasInconsistencies |= compareValues('orders', 'Acceptées', dashboardData.orders.accepted, dbData.orders.accepted)
    hasInconsistencies |= compareValues('orders', 'Valeur moyenne', Math.round(dashboardData.orders.averageValue * 100) / 100, Math.round(dbData.orders.averageValue * 100) / 100)
    
    // Comparaison Factures
    console.log('\n🧾 FACTURES:')
    hasInconsistencies |= compareValues('invoices', 'Total', dashboardData.invoices.total, dbData.invoices.total)
    hasInconsistencies |= compareValues('invoices', 'Payées', dashboardData.invoices.paid, dbData.invoices.paid)
    hasInconsistencies |= compareValues('invoices', 'En attente', dashboardData.invoices.pending, dbData.invoices.pending)
    hasInconsistencies |= compareValues('invoices', 'Montant total', dashboardData.invoices.totalAmount, dbData.invoices.totalAmount)
    hasInconsistencies |= compareValues('invoices', 'Montant payé', dashboardData.invoices.paidAmount, dbData.invoices.paidAmount)
    
    // Comparaison Ventes
    console.log('\n💰 VENTES:')
    hasInconsistencies |= compareValues('sales', 'Mois actuel', dashboardData.sales.currentMonth, dbData.sales.currentMonth)
    hasInconsistencies |= compareValues('sales', 'Mois précédent', dashboardData.sales.previousMonth, dbData.sales.previousMonth)
    
    // Résumé
    console.log('\n' + '='.repeat(50))
    if (hasInconsistencies) {
      console.log('❌ INCOHÉRENCES DÉTECTÉES!')
      console.log('Les données du dashboard ne correspondent pas à la base de données.')
    } else {
      console.log('✅ AUCUNE INCOHÉRENCE DÉTECTÉE')
      console.log('Les données du dashboard correspondent à la base de données.')
    }
    
    return { hasInconsistencies, dashboardData, dbData }
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message)
    if (error.response) {
      console.error('Détails API:', error.response.data)
    }
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await analyzeDashboardData()
}

if (require.main === module) {
  main()
}
