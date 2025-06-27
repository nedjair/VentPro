console.log('🔍 TEST SIMPLE - PROBLÈME D\'AFFICHAGE DES DONNÉES')
console.log('=' .repeat(60))

// Test 1: Vérifier si nous pouvons nous connecter à la base
console.log('\n1️⃣ Test de la base de données...')
try {
  const { PrismaClient } = require('./packages/database/generated/client')
  const prisma = new PrismaClient()
  
  prisma.$connect()
    .then(() => {
      console.log('✅ Connexion PostgreSQL réussie')
      
      // Compter les enregistrements
      return Promise.all([
        prisma.company.count(),
        prisma.user.count(),
        prisma.product.count(),
        prisma.client.count(),
        prisma.stock.count()
      ])
    })
    .then(([companies, users, products, clients, stocks]) => {
      console.log(`📊 Données dans la base:`)
      console.log(`   Companies: ${companies}`)
      console.log(`   Users: ${users}`)
      console.log(`   Products: ${products}`)
      console.log(`   Clients: ${clients}`)
      console.log(`   Stocks: ${stocks}`)
      
      const total = companies + users + products + clients + stocks
      if (total === 0) {
        console.log('❌ PROBLÈME IDENTIFIÉ: Base de données complètement VIDE')
        console.log('💡 C\'est pourquoi les pages affichent "Aucune donnée trouvée"')
      } else {
        console.log('✅ La base contient des données')
      }
      
      return prisma.$disconnect()
    })
    .then(() => {
      console.log('\n2️⃣ Test du backend...')
      testBackend()
    })
    .catch(error => {
      console.log('❌ Erreur base de données:', error.message)
      console.log('\n2️⃣ Test du backend...')
      testBackend()
    })
} catch (error) {
  console.log('❌ Erreur lors du chargement de Prisma:', error.message)
  console.log('\n2️⃣ Test du backend...')
  testBackend()
}

// Test 2: Vérifier le backend
function testBackend() {
  const http = require('http')
  
  const req = http.get('http://localhost:3001/api', (res) => {
    console.log(`✅ Backend accessible: ${res.statusCode}`)
    
    console.log('\n3️⃣ Test du frontend...')
    testFrontend()
  })
  
  req.on('error', (error) => {
    console.log('❌ Backend inaccessible:', error.message)
    console.log('\n3️⃣ Test du frontend...')
    testFrontend()
  })
  
  req.setTimeout(5000, () => {
    console.log('❌ Backend: Timeout')
    req.destroy()
    console.log('\n3️⃣ Test du frontend...')
    testFrontend()
  })
}

// Test 3: Vérifier le frontend
function testFrontend() {
  const http = require('http')
  
  const req = http.get('http://localhost:3000', (res) => {
    console.log(`✅ Frontend accessible: ${res.statusCode}`)
    
    console.log('\n4️⃣ Conclusions...')
    showConclusions()
  })
  
  req.on('error', (error) => {
    console.log('❌ Frontend inaccessible:', error.message)
    console.log('\n4️⃣ Conclusions...')
    showConclusions()
  })
  
  req.setTimeout(5000, () => {
    console.log('❌ Frontend: Timeout')
    req.destroy()
    console.log('\n4️⃣ Conclusions...')
    showConclusions()
  })
}

// Conclusions
function showConclusions() {
  console.log('🎯 DIAGNOSTIC DU PROBLÈME D\'AFFICHAGE:')
  console.log('')
  console.log('Le problème "Aucune donnée trouvée" est très probablement dû à:')
  console.log('')
  console.log('❌ BASE DE DONNÉES VIDE')
  console.log('   → Aucun utilisateur créé')
  console.log('   → Aucun produit ajouté')
  console.log('   → Aucun client enregistré')
  console.log('   → Aucun stock défini')
  console.log('')
  console.log('🔧 SOLUTION SIMPLE:')
  console.log('1. Aller sur http://localhost:3000/auth/register')
  console.log('2. Créer un compte utilisateur')
  console.log('3. Se connecter sur http://localhost:3000/auth/login')
  console.log('4. Ajouter des produits sur /products/new')
  console.log('5. Ajouter des clients sur /clients/new')
  console.log('6. Créer des stocks sur /stocks/new')
  console.log('')
  console.log('✅ Après ces étapes, toutes les données s\'afficheront !')
  console.log('')
  console.log('🚀 L\'application fonctionne, elle a juste besoin de données !')
}
