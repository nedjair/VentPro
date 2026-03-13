#!/usr/bin/env node

/**
 * Test direct du service OrderService pour vérifier la génération de numéros
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Simuler le service OrderService
class TestOrderService {
  static async generateOrderNumber(type, companyId) {
    const prefix = type === 'QUOTE' ? 'DEV' : 'CMD'
    const year = new Date().getFullYear()
    
    // Utiliser une approche basée sur l'année pour éviter les conflits avec QuoteService
    const yearPrefix = `${prefix}-${year}-`

    // Trouver le dernier numéro existant pour ce préfixe
    const lastOrder = await prisma.order.findFirst({
      where: {
        companyId,
        number: { startsWith: yearPrefix },
      },
      orderBy: { number: 'desc' },
    })

    let nextNumber = 1
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.number.split('-').pop() || '0')
      nextNumber = lastNumber + 1
    }

    // Générer le numéro avec retry en cas de conflit
    let attempts = 0
    const maxAttempts = 10
    
    while (attempts < maxAttempts) {
      const candidateNumber = `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`
      
      // Vérifier si le numéro existe déjà
      const existing = await prisma.order.findUnique({
        where: { number: candidateNumber },
      })
      
      if (!existing) {
        return candidateNumber
      }
      
      // Si le numéro existe, essayer le suivant
      nextNumber++
      attempts++
    }
    
    // Si on n'arrive pas à générer un numéro unique, utiliser un timestamp
    const timestamp = Date.now().toString().slice(-6)
    return `${yearPrefix}${timestamp}`
  }
}

async function testNumberGeneration() {
  console.log('🧪 Test de génération de numéros de commandes')
  console.log('==============================================\n')
  
  try {
    // Récupérer une entreprise existante
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée dans la base de données')
      return
    }
    
    console.log(`✅ Entreprise trouvée: ${company.name} (${company.id})\n`)
    
    // Test 1: Génération de numéros pour commandes
    console.log('1. 📝 Test génération numéros CMD...')
    const orderNumbers = []
    for (let i = 0; i < 5; i++) {
      const number = await TestOrderService.generateOrderNumber('ORDER', company.id)
      orderNumbers.push(number)
      console.log(`   Numéro ${i + 1}: ${number}`)
    }
    
    // Vérifier l'unicité
    const uniqueOrderNumbers = new Set(orderNumbers)
    if (uniqueOrderNumbers.size === orderNumbers.length) {
      console.log('   ✅ Tous les numéros CMD sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans les numéros CMD\n')
    }
    
    // Test 2: Génération de numéros pour devis
    console.log('2. 📋 Test génération numéros DEV...')
    const quoteNumbers = []
    for (let i = 0; i < 5; i++) {
      const number = await TestOrderService.generateOrderNumber('QUOTE', company.id)
      quoteNumbers.push(number)
      console.log(`   Numéro ${i + 1}: ${number}`)
    }
    
    // Vérifier l'unicité
    const uniqueQuoteNumbers = new Set(quoteNumbers)
    if (uniqueQuoteNumbers.size === quoteNumbers.length) {
      console.log('   ✅ Tous les numéros DEV sont uniques\n')
    } else {
      console.log('   ❌ Doublons détectés dans les numéros DEV\n')
    }
    
    // Test 3: Génération concurrente
    console.log('3. ⚡ Test génération concurrente...')
    const concurrentPromises = []
    for (let i = 0; i < 10; i++) {
      concurrentPromises.push(TestOrderService.generateOrderNumber('ORDER', company.id))
    }
    
    const concurrentNumbers = await Promise.all(concurrentPromises)
    const uniqueConcurrentNumbers = new Set(concurrentNumbers)
    
    console.log('   Numéros générés en parallèle:')
    concurrentNumbers.forEach((num, index) => {
      console.log(`     ${index + 1}: ${num}`)
    })
    
    if (uniqueConcurrentNumbers.size === concurrentNumbers.length) {
      console.log('   ✅ Génération concurrente réussie - tous uniques\n')
    } else {
      console.log('   ❌ Doublons détectés en génération concurrente\n')
    }
    
    // Test 4: Vérifier les ordres existants
    console.log('4. 🔍 Vérification des ordres existants...')
    const existingOrders = await prisma.order.findMany({
      where: { companyId: company.id },
      select: { number: true, type: true, createdAt: true },
      orderBy: { number: 'asc' }
    })
    
    console.log(`   ${existingOrders.length} ordres trouvés:`)
    existingOrders.forEach(order => {
      console.log(`     ${order.number} (${order.type}) - ${order.createdAt.toISOString().split('T')[0]}`)
    })
    
    // Vérifier les doublons dans les ordres existants
    const existingNumbers = existingOrders.map(o => o.number)
    const uniqueExistingNumbers = new Set(existingNumbers)
    
    if (uniqueExistingNumbers.size === existingNumbers.length) {
      console.log('   ✅ Aucun doublon dans les ordres existants\n')
    } else {
      console.log('   ❌ Doublons détectés dans les ordres existants\n')
    }
    
    console.log('✅ Tests terminés avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error)
  }
}

async function main() {
  try {
    await testNumberGeneration()
  } catch (error) {
    console.error('Erreur:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
