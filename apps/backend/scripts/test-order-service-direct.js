#!/usr/bin/env node

/**
 * Test direct du service OrderService pour diagnostiquer le problème
 */

const { PrismaClient } = require('../prisma/generated/client')

const prisma = new PrismaClient()

async function testOrderServiceDirect() {
  console.log('🧪 Test direct du service OrderService')
  console.log('=====================================\n')
  
  try {
    // Récupérer les données nécessaires
    const company = await prisma.company.findFirst()
    const client = await prisma.client.findFirst({ where: { companyId: company.id } })
    const product = await prisma.product.findFirst({ where: { companyId: company.id } })
    
    console.log(`✅ Entreprise: ${company.name}`)
    console.log(`✅ Client: ${client.name || client.firstName + ' ' + client.lastName}`)
    console.log(`✅ Produit: ${product.name}\n`)
    
    // Importer le service OrderService
    const path = require('path')
    const serviceFile = path.join(__dirname, '..', 'src', 'services', 'order.service.ts')
    
    // Utiliser tsx pour compiler et exécuter le TypeScript
    const { execSync } = require('child_process')
    
    // Test simple de génération de numéro
    console.log('1. 🔢 Test de génération de numéro...')
    
    // Créer un script temporaire pour tester la génération
    const testScript = `
const { PrismaClient } = require('./prisma/generated/client')
const prisma = new PrismaClient()

async function generateOrderNumber(type, companyId) {
  const prefix = type === 'QUOTE' ? 'DEV' : 'CMD'
  const year = new Date().getFullYear()
  const yearPrefix = \`\${prefix}-\${year}-\`

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

  let attempts = 0
  const maxAttempts = 10
  
  while (attempts < maxAttempts) {
    const candidateNumber = \`\${yearPrefix}\${nextNumber.toString().padStart(4, '0')}\`
    
    const existing = await prisma.order.findUnique({
      where: { number: candidateNumber },
    })
    
    if (!existing) {
      return candidateNumber
    }
    
    nextNumber++
    attempts++
    
    if (attempts > 1) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
    }
  }
  
  const timestamp = Date.now().toString().slice(-6)
  return \`\${yearPrefix}\${timestamp}\`
}

async function test() {
  try {
    const orderNumber = await generateOrderNumber('ORDER', '${company.id}')
    console.log('Numéro généré:', orderNumber)
    
    const quoteNumber = await generateOrderNumber('QUOTE', '${company.id}')
    console.log('Numéro devis généré:', quoteNumber)
    
  } catch (error) {
    console.error('Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

test()
`
    
    const fs = require('fs')
    const tempFile = path.join(__dirname, 'temp-test.js')
    fs.writeFileSync(tempFile, testScript)
    
    try {
      const result = execSync(`node ${tempFile}`, { 
        cwd: path.join(__dirname, '..'),
        encoding: 'utf8' 
      })
      console.log(result)
      
      // Nettoyer le fichier temporaire
      fs.unlinkSync(tempFile)
      
    } catch (error) {
      console.error('Erreur lors de l\'exécution:', error.message)
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile)
      }
    }
    
    console.log('\n2. 📝 Test de création d\'ordre simple...')
    
    // Test de création d'ordre simple
    const orderData = {
      number: 'TEST-2025-0001',
      type: 'ORDER',
      status: 'DRAFT',
      clientId: client.id,
      companyId: company.id,
      orderDate: new Date(),
      subtotal: 100.00,
      vatAmount: 19.00,
      total: 119.00,
      discount: 0,
      notes: 'Test direct',
      items: {
        create: [{
          productId: product.id,
          quantity: 1,
          unitPrice: 100.00,
          vatRate: 19.00,
          discount: 0,
        }]
      }
    }
    
    try {
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
      
      console.log(`✅ Ordre créé avec succès: ${order.number}`)
      
      // Supprimer l'ordre de test
      await prisma.orderItem.deleteMany({ where: { orderId: order.id } })
      await prisma.order.delete({ where: { id: order.id } })
      console.log('✅ Ordre de test supprimé')
      
    } catch (error) {
      console.error('❌ Erreur lors de la création:', error.message)
    }
    
    console.log('\n✅ Tests terminés!')
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await testOrderServiceDirect()
}

if (require.main === module) {
  main()
}
