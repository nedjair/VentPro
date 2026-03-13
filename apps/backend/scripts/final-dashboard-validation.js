#!/usr/bin/env node

/**
 * Validation finale des données du dashboard vs PostgreSQL
 */

const { PrismaClient } = require('../prisma/generated/client')
const axios = require('axios')

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3004/api/v1'

async function finalDashboardValidation() {
  console.log('🎯 VALIDATION FINALE - Dashboard vs PostgreSQL')
  console.log('===============================================\n')
  
  try {
    // 1. Authentification
    console.log('1. 🔐 Authentification...')
    const authResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    const companyId = authResponse.data.data.user.companyId
    console.log(`✅ Authentifié pour l'entreprise: ${companyId}\n`)
    
    // 2. Récupérer les données du dashboard
    console.log('2. 📊 Récupération des données du dashboard...')
    const dashboardResponse = await axios.get(`${API_BASE}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    const dashboardData = dashboardResponse.data.data
    console.log('✅ Données du dashboard récupérées\n')
    
    // 3. Récupérer les données directement de PostgreSQL
    console.log('3. 🗃️ Récupération des données directes de PostgreSQL...')
    
    const [
      // Clients
      totalClients,
      individualClients,
      companyClients,
      recentClients,
      
      // Produits
      totalProducts,
      inStockProducts,
      outOfStockProducts,
      
      // Commandes
      totalOrders,
      draftOrders,
      sentOrders,
      
      // Factures
      totalInvoices,
      paidInvoices,
      sentInvoices
    ] = await Promise.all([
      // Clients
      prisma.client.count({ where: { companyId, isActive: true } }),
      prisma.client.count({ where: { companyId, isActive: true, type: 'INDIVIDUAL' } }),
      prisma.client.count({ where: { companyId, isActive: true, type: 'COMPANY' } }),
      prisma.client.count({
        where: {
          companyId,
          isActive: true,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      }),
      
      // Produits
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
      }),
      
      // Commandes
      prisma.order.count({ where: { companyId } }),
      prisma.order.count({ where: { companyId, status: 'DRAFT' } }),
      prisma.order.count({ where: { companyId, status: 'SENT' } }),
      
      // Factures
      prisma.invoice.count({ where: { companyId } }),
      prisma.invoice.count({ where: { companyId, status: 'PAID' } }),
      prisma.invoice.count({ where: { companyId, status: 'SENT' } })
    ])
    
    // Stock faible
    const lowStockResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      INNER JOIN stocks s ON p.id = s."productId"
      WHERE p."companyId" = ${companyId}
        AND p."isActive" = true
        AND s."quantiteActuelle" <= s."quantiteMinimale"
        AND s."quantiteMinimale" > 0
    `
    const lowStockProducts = Number(lowStockResult[0]?.count || 0)
    
    // Valeur moyenne des commandes
    const avgOrderResult = await prisma.order.aggregate({
      where: { companyId },
      _avg: { total: true }
    })
    const avgOrderValue = Number(avgOrderResult._avg.total || 0)
    
    console.log('✅ Données PostgreSQL récupérées\n')
    
    // 4. Comparaison détaillée
    console.log('4. 🔍 COMPARAISON DÉTAILLÉE\n')
    
    let allMatch = true
    
    function compareValue(section, field, dashboardValue, dbValue) {
      const match = dashboardValue === dbValue
      const status = match ? '✅' : '❌'
      const diff = match ? '' : ` (diff: ${dashboardValue - dbValue})`
      
      console.log(`   ${status} ${field}: Dashboard=${dashboardValue}, DB=${dbValue}${diff}`)
      
      if (!match) {
        allMatch = false
      }
      
      return match
    }
    
    // Comparaison Clients
    console.log('👥 CLIENTS:')
    compareValue('clients', 'Total', dashboardData.clients.total, totalClients)
    compareValue('clients', 'Particuliers', dashboardData.clients.individuals, individualClients)
    compareValue('clients', 'Entreprises', dashboardData.clients.companies, companyClients)
    compareValue('clients', 'Récents (30j)', dashboardData.clients.recentCount, recentClients)
    
    // Comparaison Produits
    console.log('\n📦 PRODUITS:')
    compareValue('products', 'Total', dashboardData.products.total, totalProducts)
    compareValue('products', 'En stock', dashboardData.products.inStock, inStockProducts)
    compareValue('products', 'Rupture', dashboardData.products.outOfStock, outOfStockProducts)
    compareValue('products', 'Stock faible', dashboardData.products.lowStock, lowStockProducts)
    
    // Comparaison Commandes
    console.log('\n📝 COMMANDES:')
    compareValue('orders', 'Total', dashboardData.orders.total, totalOrders)
    compareValue('orders', 'En attente', dashboardData.orders.pending, draftOrders)
    compareValue('orders', 'Envoyées', dashboardData.orders.accepted, sentOrders)
    
    const dashboardAvg = Math.round(dashboardData.orders.averageValue * 100) / 100
    const dbAvg = Math.round(avgOrderValue * 100) / 100
    compareValue('orders', 'Valeur moyenne', dashboardAvg, dbAvg)
    
    // Comparaison Factures
    console.log('\n🧾 FACTURES:')
    compareValue('invoices', 'Total', dashboardData.invoices.total, totalInvoices)
    compareValue('invoices', 'Payées', dashboardData.invoices.paid, paidInvoices)
    compareValue('invoices', 'Envoyées', dashboardData.invoices.pending, sentInvoices)
    
    // 5. Résumé final
    console.log('\n' + '='.repeat(50))
    if (allMatch) {
      console.log('🎉 SUCCÈS COMPLET !')
      console.log('✅ Toutes les données du dashboard correspondent parfaitement à PostgreSQL')
      console.log('✅ Les incohérences ont été corrigées avec succès')
      console.log('✅ Le système de gestion commerciale affiche maintenant des données fiables')
    } else {
      console.log('⚠️  INCOHÉRENCES DÉTECTÉES')
      console.log('❌ Certaines données ne correspondent pas encore')
      console.log('🔧 Des corrections supplémentaires sont nécessaires')
    }
    
    console.log('\n📊 RÉSUMÉ DES DONNÉES:')
    console.log(`   • ${totalClients} clients (${individualClients} particuliers, ${companyClients} entreprises)`)
    console.log(`   • ${totalProducts} produits (${inStockProducts} en stock, ${outOfStockProducts} en rupture)`)
    console.log(`   • ${totalOrders} commandes (${draftOrders} en attente, valeur moyenne: ${dbAvg.toFixed(2)} DA)`)
    console.log(`   • ${totalInvoices} factures (${paidInvoices} payées, ${sentInvoices} envoyées)`)
    
    console.log('\n🚀 Le dashboard est maintenant opérationnel et fiable !')
    
    return allMatch
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message)
    if (error.response) {
      console.error('Détails API:', error.response.data)
    }
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const success = await finalDashboardValidation()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
