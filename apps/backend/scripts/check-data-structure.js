#!/usr/bin/env node

const { PrismaClient } = require('../prisma/generated/client')
const prisma = new PrismaClient()

async function checkDataStructure() {
  console.log('🔍 Vérification de la structure des données')
  console.log('==========================================\n')
  
  try {
    // Vérifier les clients
    console.log('📊 CLIENTS:')
    const firstClient = await prisma.client.findFirst()
    console.log('Structure du premier client:', JSON.stringify(firstClient, null, 2))
    
    const clientsWithIsActive = await prisma.client.count({ where: { isActive: true } })
    const clientsWithoutFilter = await prisma.client.count()
    console.log(`Clients avec isActive=true: ${clientsWithIsActive}`)
    console.log(`Clients total: ${clientsWithoutFilter}`)
    
    // Vérifier les produits
    console.log('\n📦 PRODUITS:')
    const firstProduct = await prisma.product.findFirst()
    console.log('Structure du premier produit:', JSON.stringify(firstProduct, null, 2))
    
    const productsWithIsActive = await prisma.product.count({ where: { isActive: true } })
    const productsWithoutFilter = await prisma.product.count()
    console.log(`Produits avec isActive=true: ${productsWithIsActive}`)
    console.log(`Produits total: ${productsWithoutFilter}`)
    
    // Vérifier les commandes
    console.log('\n📝 COMMANDES:')
    const firstOrder = await prisma.order.findFirst()
    console.log('Structure de la première commande:', JSON.stringify(firstOrder, null, 2))
    
    const ordersTotal = await prisma.order.count()
    console.log(`Commandes total: ${ordersTotal}`)
    
    // Vérifier les entreprises
    console.log('\n🏢 ENTREPRISES:')
    const companies = await prisma.company.findMany()
    console.log('Entreprises:', companies.map(c => ({ id: c.id, name: c.name })))
    
  } catch (error) {
    console.error('❌ Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkDataStructure()
