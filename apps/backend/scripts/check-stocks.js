#!/usr/bin/env node

const { PrismaClient } = require('../prisma/generated/client')
const prisma = new PrismaClient()

async function checkStocks() {
  try {
    console.log('🔍 Vérification des stocks')
    console.log('==========================\n')
    
    // Vérifier les produits avec stocks
    const productWithStock = await prisma.product.findFirst({
      include: { stock: true }
    })
    
    console.log('Premier produit avec stock:')
    console.log(JSON.stringify(productWithStock, null, 2))
    
    // Compter les produits avec stock
    const productsWithStock = await prisma.product.count({
      where: {
        stock: { quantiteActuelle: { gt: 0 } }
      }
    })
    
    console.log(`\nProduits avec stock > 0: ${productsWithStock}`)
    
    // Compter tous les stocks
    const totalStocks = await prisma.stock.count()
    console.log(`Total stocks: ${totalStocks}`)
    
    // Vérifier la relation
    const productsWithStockRelation = await prisma.product.count({
      where: {
        stock: { isNot: null }
      }
    })
    
    console.log(`Produits avec relation stock: ${productsWithStockRelation}`)
    
  } catch (error) {
    console.error('Erreur:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkStocks()
