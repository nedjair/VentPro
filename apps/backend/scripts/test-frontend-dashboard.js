#!/usr/bin/env node

/**
 * Test de l'intégration frontend-backend pour le dashboard
 */

const axios = require('axios')

async function testFrontendDashboard() {
  console.log('🧪 TEST INTÉGRATION FRONTEND-BACKEND')
  console.log('====================================\n')
  
  try {
    // 1. Test de l'API backend directement
    console.log('1. 🔐 Test API Backend - Authentification...')
    const authResponse = await axios.post('http://localhost:3004/api/v1/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    })
    
    const token = authResponse.data.data.tokens.accessToken
    console.log('✅ Backend - Authentification réussie\n')
    
    // 2. Test de l'API dashboard backend
    console.log('2. 📊 Test API Backend - Dashboard...')
    const dashboardResponse = await axios.get('http://localhost:3004/api/v1/dashboard/stats', {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    console.log('✅ Backend - Dashboard API fonctionne')
    console.log('📊 Structure des données backend:')
    console.log(JSON.stringify(dashboardResponse.data.data, null, 2))
    console.log()
    
    // 3. Vérification de la structure des données
    const data = dashboardResponse.data.data
    
    console.log('3. 🔍 VÉRIFICATION DE LA STRUCTURE DES DONNÉES\n')
    
    // Vérifier clients
    if (data.clients && typeof data.clients.total === 'number') {
      console.log('✅ Clients - Structure correcte')
      console.log(`   • Total: ${data.clients.total}`)
      console.log(`   • Particuliers: ${data.clients.individuals}`)
      console.log(`   • Entreprises: ${data.clients.companies}`)
    } else {
      console.log('❌ Clients - Structure incorrecte')
    }
    
    // Vérifier produits
    if (data.products && typeof data.products.total === 'number') {
      console.log('✅ Produits - Structure correcte')
      console.log(`   • Total: ${data.products.total}`)
      console.log(`   • En stock: ${data.products.inStock}`)
      console.log(`   • Rupture: ${data.products.outOfStock}`)
      console.log(`   • Stock faible: ${data.products.lowStock}`)
    } else {
      console.log('❌ Produits - Structure incorrecte')
    }
    
    // Vérifier ventes
    if (data.sales && typeof data.sales.currentMonth === 'number') {
      console.log('✅ Ventes - Structure correcte')
      console.log(`   • Mois actuel: ${data.sales.currentMonth} ${data.sales.currency}`)
      console.log(`   • Mois précédent: ${data.sales.previousMonth} ${data.sales.currency}`)
      console.log(`   • Croissance: ${data.sales.growth}%`)
    } else {
      console.log('❌ Ventes - Structure incorrecte')
    }
    
    // Vérifier commandes
    if (data.orders && typeof data.orders.total === 'number') {
      console.log('✅ Commandes - Structure correcte')
      console.log(`   • Total: ${data.orders.total}`)
      console.log(`   • En attente: ${data.orders.pending}`)
      console.log(`   • Acceptées: ${data.orders.accepted}`)
      console.log(`   • Valeur moyenne: ${data.orders.averageValue} DA`)
    } else {
      console.log('❌ Commandes - Structure incorrecte')
    }
    
    // Vérifier factures
    if (data.invoices && typeof data.invoices.total === 'number') {
      console.log('✅ Factures - Structure correcte')
      console.log(`   • Total: ${data.invoices.total}`)
      console.log(`   • Payées: ${data.invoices.paid}`)
      console.log(`   • En attente: ${data.invoices.pending}`)
      console.log(`   • En retard: ${data.invoices.overdue}`)
    } else {
      console.log('❌ Factures - Structure incorrecte')
    }
    
    console.log('\n4. 🎯 RÉSUMÉ DU TEST\n')
    
    // Vérifier que toutes les données nécessaires sont présentes
    const requiredFields = [
      'clients.total',
      'products.total', 
      'products.inStock',
      'products.outOfStock',
      'sales.currentMonth',
      'orders.total',
      'invoices.total'
    ]
    
    let allFieldsPresent = true
    for (const field of requiredFields) {
      const value = field.split('.').reduce((obj, key) => obj?.[key], data)
      if (typeof value !== 'number') {
        console.log(`❌ Champ manquant ou incorrect: ${field}`)
        allFieldsPresent = false
      }
    }
    
    if (allFieldsPresent) {
      console.log('🎉 SUCCÈS COMPLET !')
      console.log('✅ Toutes les données nécessaires sont présentes')
      console.log('✅ La structure correspond à l\'interface frontend')
      console.log('✅ Le dashboard frontend devrait maintenant afficher les données')
      console.log('\n🚀 Vous pouvez maintenant tester le frontend sur http://localhost:3005')
    } else {
      console.log('⚠️  PROBLÈMES DÉTECTÉS')
      console.log('❌ Certains champs sont manquants ou incorrects')
      console.log('🔧 Vérifiez la structure des données backend')
    }
    
    return allFieldsPresent
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    if (error.response) {
      console.error('Détails:', error.response.data)
    }
    return false
  }
}

async function main() {
  const success = await testFrontendDashboard()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
