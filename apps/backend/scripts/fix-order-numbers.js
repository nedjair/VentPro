#!/usr/bin/env node

/**
 * Script pour corriger les numéros de commandes en doublon
 * Ce script identifie et corrige les conflits de numérotation dans la base de données
 */

const { PrismaClient } = require('../prisma/generated/client')

const prisma = new PrismaClient()

async function fixOrderNumbers() {
  console.log('🔍 Recherche des doublons de numéros de commandes...')
  
  try {
    // Trouver tous les numéros en doublon
    const duplicates = await prisma.$queryRaw`
      SELECT number, COUNT(*) as count
      FROM orders
      GROUP BY number
      HAVING COUNT(*) > 1
    `
    
    if (duplicates.length === 0) {
      console.log('✅ Aucun doublon trouvé.')
      return
    }
    
    console.log(`⚠️  ${duplicates.length} numéros en doublon trouvés:`)
    duplicates.forEach(dup => {
      console.log(`   - ${dup.number}: ${dup.count} occurrences`)
    })
    
    // Corriger chaque doublon
    for (const duplicate of duplicates) {
      console.log(`\n🔧 Correction du doublon: ${duplicate.number}`)
      
      // Récupérer tous les ordres avec ce numéro
      const orders = await prisma.order.findMany({
        where: { number: duplicate.number },
        orderBy: { createdAt: 'asc' }
      })
      
      // Garder le premier, renommer les autres
      for (let i = 1; i < orders.length; i++) {
        const order = orders[i]
        const newNumber = await generateUniqueOrderNumber(order.type, order.companyId, order.number)
        
        await prisma.order.update({
          where: { id: order.id },
          data: { number: newNumber }
        })
        
        console.log(`   ✅ ${order.number} → ${newNumber}`)
      }
    }
    
    console.log('\n✅ Correction terminée!')
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
    throw error
  }
}

async function generateUniqueOrderNumber(type, companyId, originalNumber) {
  const prefix = type === 'QUOTE' ? 'DEV' : 'CMD'
  const year = new Date().getFullYear()
  const yearPrefix = `${prefix}-${year}-`
  
  // Trouver le prochain numéro disponible
  let nextNumber = 1
  const lastOrder = await prisma.order.findFirst({
    where: {
      companyId,
      number: { startsWith: yearPrefix },
    },
    orderBy: { number: 'desc' },
  })
  
  if (lastOrder) {
    const lastNum = parseInt(lastOrder.number.split('-').pop() || '0')
    nextNumber = lastNum + 1
  }
  
  // Vérifier l'unicité
  let attempts = 0
  while (attempts < 100) {
    const candidateNumber = `${yearPrefix}${nextNumber.toString().padStart(4, '0')}`
    
    const existing = await prisma.order.findUnique({
      where: { number: candidateNumber },
    })
    
    if (!existing) {
      return candidateNumber
    }
    
    nextNumber++
    attempts++
  }
  
  // Fallback avec timestamp
  const timestamp = Date.now().toString().slice(-6)
  return `${yearPrefix}${timestamp}`
}

async function main() {
  try {
    await fixOrderNumbers()
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

module.exports = { fixOrderNumbers }
