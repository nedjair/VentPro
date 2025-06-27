const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createStockData() {
  console.log('🇩🇿 Création de données de test algériennes pour le module Stock...')
  
  try {
    // Vérifier s'il y a une entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée. Créez d\'abord une entreprise.')
      return
    }
    
    console.log(`✅ Entreprise trouvée: ${company.name}`)
    
    // Créer une catégorie pour les produits alimentaires
    let category = await prisma.category.findFirst({
      where: { name: 'Produits Alimentaires', companyId: company.id }
    })
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Produits Alimentaires',
          description: 'Produits alimentaires algériens',
          companyId: company.id
        }
      })
      console.log('✅ Catégorie "Produits Alimentaires" créée')
    }
    
    // Produits algériens avec leurs stocks
    const produitsAlgeriens = [
      {
        name: 'Couscous Ferrero 1kg',
        description: 'Couscous grain moyen de qualité supérieure',
        price: 350.00,
        cost: 280.00,
        unit: 'paquet',
        stockQuantity: 45,
        minStock: 10,
        maxStock: 100,
        quantiteActuelle: 45,
        quantiteMinimale: 10,
        quantiteMaximale: 100
      },
      {
        name: 'Huile Elio 1L',
        description: 'Huile de table raffinée',
        price: 280.00,
        cost: 220.00,
        unit: 'bouteille',
        stockQuantity: 8,
        minStock: 15,
        maxStock: 50,
        quantiteActuelle: 8,
        quantiteMinimale: 15,
        quantiteMaximale: 50
      },
      {
        name: 'Harissa Traditionnelle 200g',
        description: 'Harissa artisanale piquante',
        price: 180.00,
        cost: 140.00,
        unit: 'pot',
        stockQuantity: 3,
        minStock: 10,
        maxStock: 30,
        quantiteActuelle: 3,
        quantiteMinimale: 10,
        quantiteMaximale: 30
      },
      {
        name: 'Thé Vert Palais des Thés',
        description: 'Thé vert de qualité premium',
        price: 450.00,
        cost: 350.00,
        unit: 'boîte',
        stockQuantity: 0,
        minStock: 5,
        maxStock: 25,
        quantiteActuelle: 0,
        quantiteMinimale: 5,
        quantiteMaximale: 25
      },
      {
        name: 'Savon Doux Alger 100g',
        description: 'Savon traditionnel à l\'huile d\'olive',
        price: 120.00,
        cost: 80.00,
        unit: 'pièce',
        stockQuantity: 120,
        minStock: 20,
        maxStock: 200,
        quantiteActuelle: 120,
        quantiteMinimale: 20,
        quantiteMaximale: 200
      }
    ]
    
    console.log('\n📦 Création des produits et stocks...')
    
    for (const produitData of produitsAlgeriens) {
      // Vérifier si le produit existe déjà
      let product = await prisma.product.findFirst({
        where: { name: produitData.name, companyId: company.id }
      })
      
      if (!product) {
        // Créer le produit
        product = await prisma.product.create({
          data: {
            name: produitData.name,
            description: produitData.description,
            price: produitData.price,
            cost: produitData.cost,
            unit: produitData.unit,
            stockQuantity: produitData.stockQuantity,
            minStock: produitData.minStock,
            maxStock: produitData.maxStock,
            categoryId: category.id,
            companyId: company.id,
            isService: false,
            isActive: true
          }
        })
        console.log(`   ✅ Produit créé: ${product.name}`)
      } else {
        console.log(`   ⚠️ Produit existe déjà: ${product.name}`)
      }
      
      // Vérifier si le stock existe déjà
      let stock = await prisma.stock.findUnique({
        where: { productId: product.id }
      })
      
      if (!stock) {
        // Créer le stock
        stock = await prisma.stock.create({
          data: {
            quantiteActuelle: produitData.quantiteActuelle,
            quantiteMinimale: produitData.quantiteMinimale,
            quantiteMaximale: produitData.quantiteMaximale,
            productId: product.id,
            companyId: company.id
          }
        })
        console.log(`   ✅ Stock créé: ${produitData.quantiteActuelle} ${produitData.unit}`)
      } else {
        console.log(`   ⚠️ Stock existe déjà pour: ${product.name}`)
      }
    }
    
    // Statistiques finales
    const totalProducts = await prisma.product.count({ where: { companyId: company.id, isService: false } })
    const totalStocks = await prisma.stock.count({ where: { companyId: company.id } })
    const lowStockCount = await prisma.stock.count({
      where: {
        companyId: company.id,
        quantiteActuelle: { lte: prisma.stock.fields.quantiteMinimale }
      }
    })
    
    console.log('\n📊 Résumé:')
    console.log(`   📦 Produits total: ${totalProducts}`)
    console.log(`   📋 Stocks créés: ${totalStocks}`)
    console.log(`   ⚠️ Alertes de stock: ${lowStockCount}`)
    
    console.log('\n🎉 Données de test créées avec succès !')
    console.log('💡 Vous pouvez maintenant:')
    console.log('   1. Aller sur http://localhost:3000/stocks')
    console.log('   2. Voir les alertes sur http://localhost:3000/dashboard')
    console.log('   3. Tester toutes les fonctionnalités CRUD')
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createStockData().catch(console.error)
