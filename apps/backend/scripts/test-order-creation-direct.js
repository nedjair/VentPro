#!/usr/bin/env node

/**
 * Test direct de création d'ordres pour vérifier la correction du bug
 */

const { PrismaClient } = require('../prisma/generated/client')

const prisma = new PrismaClient()

// Import the actual OrderService
const { OrderService } = require('../src/services/order.service.ts')

async function createTestOrder(companyId, clientId, productId, type = 'ORDER') {
  // Simuler la logique de OrderService.createOrder
  
  // 1. Générer le numéro (logique corrigée)
  const prefix = type === 'QUOTE' ? 'DEV' : 'CMD'
  const year = new Date().getFullYear()
  const yearPrefix = `${prefix}-${year}-`

  const lastOrder = await prisma.order.findFirst({
    where: {
      companyId,
      number: { startsWith: yearPrefix },
    },
    orderBy: { number: 'desc' },
  })

  let nextNumber = 1
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.number.split('-').pop() || '0')
    nextNumber = lastNum + 1
  }

  // Générer le numéro avec retry en cas de conflit
  let attempts = 0
  const maxAttempts = 10
  let orderNumber = null
  
  while (attempts < maxAttempts) {
    const candidateNumber = `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`
    
    const existing = await prisma.order.findUnique({
      where: { number: candidateNumber },
    })
    
    if (!existing) {
      orderNumber = candidateNumber
      break
    }
    
    nextNumber++
    attempts++
  }
  
  if (!orderNumber) {
    const timestamp = Date.now().toString().slice(-6)
    orderNumber = `${yearPrefix}${timestamp}`
  }

  // 2. Créer l'ordre
  const orderData = {
    number: orderNumber,
    type: type,
    status: 'DRAFT',
    clientId: clientId,
    companyId: companyId,
    orderDate: new Date(),
    subtotal: 100.00,
    vatAmount: 19.00,
    total: 119.00,
    discount: 0,
    notes: 'Test order creation',
    items: {
      create: [{
        productId: productId,
        quantity: 1,
        unitPrice: 100.00,
        vatRate: 19.00,
        discount: 0,
      }]
    }
  }

  const order = await prisma.order.create({
    data: orderData,
    include: {
      client: true,
      items: {
        include: {
          product: true,
        },
      },
    },
  })

  return order
}

async function testOrderCreation() {
  console.log('🧪 Test de création d\'ordres avec numéros uniques')
  console.log('==================================================\n')
  
  try {
    // Récupérer les données nécessaires
    console.log('1. 📋 Préparation des données de test...')
    
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }
    
    const client = await prisma.client.findFirst({
      where: { companyId: company.id }
    })
    if (!client) {
      console.log('❌ Aucun client trouvé')
      return
    }
    
    const product = await prisma.product.findFirst({
      where: { companyId: company.id }
    })
    if (!product) {
      console.log('❌ Aucun produit trouvé')
      return
    }
    
    console.log(`✅ Entreprise: ${company.name}`)
    console.log(`✅ Client: ${client.name}`)
    console.log(`✅ Produit: ${product.name}\n`)
    
    // Test 1: Créer plusieurs commandes séquentiellement
    console.log('2. 📝 Test de création séquentielle...')
    const sequentialOrders = []
    
    for (let i = 0; i < 3; i++) {
      const order = await createTestOrder(company.id, client.id, product.id, 'ORDER')
      sequentialOrders.push(order)
      console.log(`   ✅ Commande ${i + 1}: ${order.number}`)
    }
    
    // Vérifier l'unicité
    const sequentialNumbers = sequentialOrders.map(o => o.number)
    const uniqueSequential = new Set(sequentialNumbers)
    
    if (uniqueSequential.size === sequentialNumbers.length) {
      console.log('   ✅ Tous les numéros séquentiels sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans la création séquentielle\n')
    }
    
    // Test 2: Créer plusieurs devis séquentiellement
    console.log('3. 📋 Test de création de devis séquentiels...')
    const sequentialQuotes = []
    
    for (let i = 0; i < 3; i++) {
      const quote = await createTestOrder(company.id, client.id, product.id, 'QUOTE')
      sequentialQuotes.push(quote)
      console.log(`   ✅ Devis ${i + 1}: ${quote.number}`)
    }
    
    // Vérifier l'unicité
    const quoteNumbers = sequentialQuotes.map(o => o.number)
    const uniqueQuotes = new Set(quoteNumbers)
    
    if (uniqueQuotes.size === quoteNumbers.length) {
      console.log('   ✅ Tous les numéros de devis sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans les devis\n')
    }
    
    // Test 3: Création concurrente (simulation de race condition)
    console.log('4. ⚡ Test de création concurrente...')
    
    const concurrentPromises = []
    for (let i = 0; i < 5; i++) {
      concurrentPromises.push(createTestOrder(company.id, client.id, product.id, 'ORDER'))
    }
    
    try {
      const concurrentOrders = await Promise.all(concurrentPromises)
      const concurrentNumbers = concurrentOrders.map(o => o.number)
      const uniqueConcurrent = new Set(concurrentNumbers)
      
      console.log('   Numéros générés en parallèle:')
      concurrentNumbers.forEach((num, index) => {
        console.log(`     ${index + 1}: ${num}`)
      })
      
      if (uniqueConcurrent.size === concurrentNumbers.length) {
        console.log('   ✅ Création concurrente réussie - tous uniques\n')
      } else {
        console.log('   ❌ Doublons détectés en création concurrente\n')
        
        // Identifier les doublons
        const duplicates = concurrentNumbers.filter((num, index) => 
          concurrentNumbers.indexOf(num) !== index
        )
        console.log('   Doublons:', duplicates)
      }
      
    } catch (error) {
      console.error('   ❌ Erreur lors de la création concurrente:', error.message)
    }
    
    // Résumé final
    console.log('5. 📊 Résumé final...')
    const totalOrders = await prisma.order.count({
      where: { companyId: company.id }
    })
    console.log(`   Total d'ordres dans la base: ${totalOrders}`)
    
    // Vérifier les doublons globaux
    const allOrders = await prisma.order.findMany({
      where: { companyId: company.id },
      select: { number: true }
    })
    
    const allNumbers = allOrders.map(o => o.number)
    const uniqueAll = new Set(allNumbers)
    
    if (uniqueAll.size === allNumbers.length) {
      console.log('   ✅ Aucun doublon dans toute la base de données')
    } else {
      console.log('   ❌ Doublons détectés dans la base de données')
    }
    
    console.log('\n✅ Tests terminés!')
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  try {
    await testOrderCreation()
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
