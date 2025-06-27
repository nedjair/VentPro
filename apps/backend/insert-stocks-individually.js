const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function insertStocksIndividually() {
  console.log('🇩🇿 Insertion des données de stock une par une...\n')
  
  try {
    // 1. Vérifier l'entreprise
    console.log('1️⃣ Vérification de l\'entreprise...')
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée. Créez d\'abord une entreprise.')
      return
    }
    console.log(`✅ Entreprise trouvée: ${company.name}\n`)
    
    // 2. Créer les catégories une par une
    console.log('2️⃣ Création des catégories...')
    
    const categories = [
      { name: 'Alimentation', description: 'Produits alimentaires algériens' },
      { name: 'Boissons', description: 'Boissons et thés' },
      { name: 'Hygiène', description: 'Produits d\'hygiène et cosmétiques' },
      { name: 'Épicerie', description: 'Épices et condiments' }
    ]
    
    const createdCategories = []
    for (const catData of categories) {
      let category = await prisma.category.findFirst({
        where: { name: catData.name, companyId: company.id }
      })
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: catData.name,
            description: catData.description,
            companyId: company.id
          }
        })
        console.log(`   ✅ Catégorie créée: ${category.name}`)
      } else {
        console.log(`   ⚠️ Catégorie existe: ${category.name}`)
      }
      createdCategories.push(category)
    }
    
    // 3. Créer les produits un par un
    console.log('\n3️⃣ Création des produits...')
    
    const produits = [
      {
        name: 'Couscous Ferrero 1kg',
        description: 'Couscous grain moyen de qualité supérieure',
        price: 350.00,
        cost: 280.00,
        unit: 'paquet',
        categoryIndex: 0,
        stock: { actuelle: 45, minimale: 10, maximale: 100 }
      },
      {
        name: 'Huile Elio 1L',
        description: 'Huile de table raffinée',
        price: 280.00,
        cost: 220.00,
        unit: 'bouteille',
        categoryIndex: 0,
        stock: { actuelle: 8, minimale: 15, maximale: 50 }
      },
      {
        name: 'Harissa Traditionnelle 200g',
        description: 'Harissa artisanale piquante',
        price: 180.00,
        cost: 140.00,
        unit: 'pot',
        categoryIndex: 3,
        stock: { actuelle: 3, minimale: 10, maximale: 30 }
      },
      {
        name: 'Thé Vert Palais des Thés',
        description: 'Thé vert de qualité premium',
        price: 450.00,
        cost: 350.00,
        unit: 'boîte',
        categoryIndex: 1,
        stock: { actuelle: 0, minimale: 5, maximale: 25 }
      },
      {
        name: 'Savon Doux Alger 100g',
        description: 'Savon traditionnel à l\'huile d\'olive',
        price: 120.00,
        cost: 80.00,
        unit: 'pièce',
        categoryIndex: 2,
        stock: { actuelle: 120, minimale: 20, maximale: 200 }
      },
      {
        name: 'Café Malongo 250g',
        description: 'Café moulu arabica',
        price: 680.00,
        cost: 520.00,
        unit: 'paquet',
        categoryIndex: 1,
        stock: { actuelle: 12, minimale: 8, maximale: 40 }
      },
      {
        name: 'Riz Basmati 1kg',
        description: 'Riz basmati long grain',
        price: 420.00,
        cost: 350.00,
        unit: 'sac',
        categoryIndex: 0,
        stock: { actuelle: 2, minimale: 10, maximale: 50 }
      },
      {
        name: 'Dentifrice Signal 75ml',
        description: 'Dentifrice protection complète',
        price: 180.00,
        cost: 140.00,
        unit: 'tube',
        categoryIndex: 2,
        stock: { actuelle: 25, minimale: 15, maximale: 60 }
      }
    ]
    
    const createdProducts = []
    for (let i = 0; i < produits.length; i++) {
      const produitData = produits[i]
      console.log(`\n   📦 Produit ${i + 1}/${produits.length}: ${produitData.name}`)
      
      // Vérifier si le produit existe
      let product = await prisma.product.findFirst({
        where: { name: produitData.name, companyId: company.id }
      })
      
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: produitData.name,
            description: produitData.description,
            price: produitData.price,
            cost: produitData.cost,
            unit: produitData.unit,
            stockQuantity: produitData.stock.actuelle,
            minStock: produitData.stock.minimale,
            maxStock: produitData.stock.maximale,
            categoryId: createdCategories[produitData.categoryIndex].id,
            companyId: company.id,
            isService: false,
            isActive: true
          }
        })
        console.log(`      ✅ Produit créé: ${product.name}`)
      } else {
        console.log(`      ⚠️ Produit existe: ${product.name}`)
      }
      
      createdProducts.push({ product, stockData: produitData.stock })
    }
    
    // 4. Créer les stocks un par un
    console.log('\n4️⃣ Création des stocks...')
    
    for (let i = 0; i < createdProducts.length; i++) {
      const { product, stockData } = createdProducts[i]
      console.log(`\n   📋 Stock ${i + 1}/${createdProducts.length}: ${product.name}`)
      
      // Vérifier si le stock existe
      let stock = await prisma.stock.findUnique({
        where: { productId: product.id }
      })
      
      if (!stock) {
        stock = await prisma.stock.create({
          data: {
            quantiteActuelle: stockData.actuelle,
            quantiteMinimale: stockData.minimale,
            quantiteMaximale: stockData.maximale,
            productId: product.id,
            companyId: company.id,
            dateLastUpdate: new Date()
          }
        })
        
        const status = stockData.actuelle === 0 ? '🔴 RUPTURE' : 
                      stockData.actuelle <= stockData.minimale ? '🟠 FAIBLE' : '🟢 NORMAL'
        
        console.log(`      ✅ Stock créé: ${stockData.actuelle}/${stockData.maximale} ${product.unit} - ${status}`)
      } else {
        console.log(`      ⚠️ Stock existe: ${product.name}`)
      }
    }
    
    // 5. Statistiques finales
    console.log('\n5️⃣ Statistiques finales...')
    const totalProducts = await prisma.product.count({ where: { companyId: company.id, isService: false } })
    const totalStocks = await prisma.stock.count({ where: { companyId: company.id } })
    
    const stocksRupture = await prisma.stock.count({
      where: { companyId: company.id, quantiteActuelle: 0 }
    })
    
    const stocksFaibles = await prisma.stock.count({
      where: {
        companyId: company.id,
        quantiteActuelle: { gt: 0, lte: 10 }
      }
    })
    
    console.log('\n📊 RÉSUMÉ FINAL:')
    console.log(`   📦 Produits total: ${totalProducts}`)
    console.log(`   📋 Stocks créés: ${totalStocks}`)
    console.log(`   🔴 Stocks en rupture: ${stocksRupture}`)
    console.log(`   🟠 Stocks faibles: ${stocksFaibles}`)
    console.log(`   🟢 Stocks normaux: ${totalStocks - stocksRupture - stocksFaibles}`)
    
    console.log('\n🎉 INSERTION TERMINÉE AVEC SUCCÈS !')
    console.log('💡 Testez maintenant:')
    console.log('   → http://localhost:3000/stocks')
    console.log('   → http://localhost:3000/dashboard')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'insertion:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

insertStocksIndividually().catch(console.error)
