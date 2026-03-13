#!/usr/bin/env node

/**
 * Analyse simplifiée des données du dashboard
 */

const { PrismaClient } = require('../prisma/generated/client')
const axios = require('axios')

const prisma = new PrismaClient()
const API_BASE = 'http://localhost:3004/api/v1'

async function simpleDashboardAnalysis() {
  console.log('🔍 Analyse simplifiée Dashboard vs PostgreSQL')
  console.log('==============================================\n')
  
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
    
    // 3. Vérifications directes en base
    console.log('3. 🗃️ Vérifications directes en PostgreSQL...\n')
    
    // Clients
    console.log('📊 CLIENTS:')
    const totalClients = await prisma.client.count({ where: { companyId, isActive: true } })
    console.log(`   Dashboard: ${dashboardData.clients.total} | DB: ${totalClients} ${dashboardData.clients.total === totalClients ? '✅' : '❌'}`)
    
    // Produits
    console.log('\n📦 PRODUITS:')
    const totalProducts = await prisma.product.count({ where: { companyId, isActive: true } })
    console.log(`   Total - Dashboard: ${dashboardData.products.total} | DB: ${totalProducts} ${dashboardData.products.total === totalProducts ? '✅' : '❌'}`)
    
    // Produits en stock
    const inStockProducts = await prisma.product.count({ 
      where: { 
        companyId, 
        isActive: true,
        stock: { quantiteActuelle: { gt: 0 } }
      } 
    })
    console.log(`   En stock - Dashboard: ${dashboardData.products.inStock} | DB: ${inStockProducts} ${dashboardData.products.inStock === inStockProducts ? '✅' : '❌'}`)
    
    // Commandes
    console.log('\n📝 COMMANDES:')
    const totalOrders = await prisma.order.count({ where: { companyId } })
    console.log(`   Total - Dashboard: ${dashboardData.orders.total} | DB: ${totalOrders} ${dashboardData.orders.total === totalOrders ? '✅' : '❌'}`)
    
    const draftOrders = await prisma.order.count({ where: { companyId, status: 'DRAFT' } })
    console.log(`   Brouillons - Dashboard: ${dashboardData.orders.pending} | DB: ${draftOrders} ${dashboardData.orders.pending === draftOrders ? '✅' : '❌'}`)
    
    // Factures
    console.log('\n🧾 FACTURES:')
    const totalInvoices = await prisma.invoice.count({ where: { companyId } })
    console.log(`   Total - Dashboard: ${dashboardData.invoices.total} | DB: ${totalInvoices} ${dashboardData.invoices.total === totalInvoices ? '✅' : '❌'}`)
    
    // 4. Vérification des requêtes du service dashboard
    console.log('\n4. 🔍 Analyse du service dashboard...')
    
    // Vérifier si les tables existent et ont des données
    const tablesCheck = await Promise.all([
      prisma.client.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.invoice.count(),
      prisma.stock.count()
    ])
    
    console.log('\n📋 État des tables:')
    console.log(`   Clients: ${tablesCheck[0]} enregistrements`)
    console.log(`   Produits: ${tablesCheck[1]} enregistrements`)
    console.log(`   Commandes: ${tablesCheck[2]} enregistrements`)
    console.log(`   Factures: ${tablesCheck[3]} enregistrements`)
    console.log(`   Stocks: ${tablesCheck[4]} enregistrements`)
    
    // 5. Vérifier les requêtes problématiques du dashboard service
    console.log('\n5. 🔧 Test des requêtes du dashboard service...')
    
    try {
      // Test de la requête stock faible comme dans le service
      const lowStockQuery = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN stocks s ON p.id = s."productId"
        WHERE p."companyId" = ${companyId}
          AND p."isActive" = true
          AND s."quantiteActuelle" <= s."quantiteMinimale"
      `
      console.log(`   ✅ Requête stock faible: ${lowStockQuery[0]?.count || 0} produits`)
    } catch (error) {
      console.log(`   ❌ Erreur requête stock faible: ${error.message}`)
    }
    
    try {
      // Test de la requête valeur stock
      const stockValue = await prisma.stock.aggregate({
        where: { companyId },
        _sum: { valeurStock: true }
      })
      console.log(`   ✅ Valeur stock: ${stockValue._sum.valeurStock || 0}`)
    } catch (error) {
      console.log(`   ❌ Erreur valeur stock: ${error.message}`)
    }
    
    // 6. Recommandations
    console.log('\n6. 💡 Recommandations:')
    
    if (dashboardData.clients.total !== totalClients) {
      console.log('   ❌ Incohérence clients détectée - vérifier les filtres isActive')
    }
    
    if (dashboardData.products.total !== totalProducts) {
      console.log('   ❌ Incohérence produits détectée - vérifier les filtres isActive')
    }
    
    if (dashboardData.orders.total !== totalOrders) {
      console.log('   ❌ Incohérence commandes détectée - vérifier les requêtes du service')
    }
    
    if (dashboardData.invoices.total !== totalInvoices) {
      console.log('   ❌ Incohérence factures détectée - vérifier les requêtes du service')
    }
    
    console.log('\n✅ Analyse terminée!')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error.message)
    if (error.response) {
      console.error('Détails API:', error.response.data)
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await simpleDashboardAnalysis()
}

if (require.main === module) {
  main()
}
