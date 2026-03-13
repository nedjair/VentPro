#!/usr/bin/env node

/**
 * Test simple pour vérifier la connexion Prisma et la génération de numéros
 */

const { PrismaClient } = require('../prisma/generated/client')

const prisma = new PrismaClient()

async function simpleTest() {
  console.log('🧪 Test simple de connexion et génération')
  console.log('=========================================\n')
  
  try {
    // Test 1: Connexion à la base
    console.log('1. 🔌 Test de connexion à la base de données...')
    const companyCount = await prisma.company.count()
    console.log(`✅ Connexion réussie - ${companyCount} entreprise(s) trouvée(s)\n`)
    
    // Test 2: Récupérer une entreprise
    console.log('2. 🏢 Récupération d\'une entreprise...')
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }
    console.log(`✅ Entreprise: ${company.name} (ID: ${company.id})\n`)
    
    // Test 3: Compter les ordres existants
    console.log('3. 📊 Comptage des ordres existants...')
    const orderCount = await prisma.order.count({
      where: { companyId: company.id }
    })
    console.log(`✅ ${orderCount} ordre(s) existant(s)\n`)
    
    // Test 4: Génération de numéro simple
    console.log('4. 🔢 Test de génération de numéro...')
    const year = new Date().getFullYear()
    const prefix = `CMD-${year}-`
    
    console.log(`   Préfixe: ${prefix}`)
    
    // Chercher le dernier ordre avec ce préfixe
    const lastOrder = await prisma.order.findFirst({
      where: {
        companyId: company.id,
        number: { startsWith: prefix },
      },
      orderBy: { number: 'desc' },
    })
    
    let nextNumber = 1
    if (lastOrder) {
      console.log(`   Dernier ordre trouvé: ${lastOrder.number}`)
      const lastNum = parseInt(lastOrder.number.split('-').pop() || '0')
      nextNumber = lastNum + 1
      console.log(`   Dernier numéro: ${lastNum}`)
    } else {
      console.log('   Aucun ordre existant avec ce préfixe')
    }
    
    const newNumber = `${prefix}${nextNumber.toString().padStart(4, '0')}`
    console.log(`   Nouveau numéro généré: ${newNumber}`)
    
    // Vérifier que ce numéro n'existe pas
    const existing = await prisma.order.findUnique({
      where: { number: newNumber }
    })
    
    if (existing) {
      console.log(`   ❌ Le numéro ${newNumber} existe déjà!`)
    } else {
      console.log(`   ✅ Le numéro ${newNumber} est unique`)
    }
    
    console.log('\n✅ Test terminé avec succès!')
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  try {
    await simpleTest()
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}
