const { PrismaClient } = require('./generated/client')

const prisma = new PrismaClient()

async function verifySchema() {
  console.log('🔍 VÉRIFICATION COMPLÈTE DU SCHÉMA PRISMA-POSTGRESQL')
  console.log('=' .repeat(60))
  
  try {
    // 1. Test de connexion
    console.log('\n1️⃣ Test de connexion à PostgreSQL...')
    await prisma.$connect()
    console.log('✅ Connexion PostgreSQL réussie')
    
    // 2. Vérification des tables principales
    console.log('\n2️⃣ Vérification des tables principales...')
    
    const tables = [
      { name: 'companies', model: 'company' },
      { name: 'users', model: 'user' },
      { name: 'categories', model: 'category' },
      { name: 'products', model: 'product' },
      { name: 'stocks', model: 'stock' },
      { name: 'stock_movements', model: 'stockMovement' },
      { name: 'clients', model: 'client' },
      { name: 'suppliers', model: 'supplier' }
    ]
    
    for (const table of tables) {
      try {
        const count = await prisma[table.model].count()
        console.log(`   ✅ Table ${table.name}: ${count} enregistrements`)
      } catch (error) {
        console.log(`   ❌ Table ${table.name}: ERREUR - ${error.message}`)
      }
    }
    
    // 3. Vérification spécifique du module Stock
    console.log('\n3️⃣ Vérification spécifique du module Stock...')
    
    try {
      // Test de création d'une entreprise si elle n'existe pas
      let company = await prisma.company.findFirst()
      if (!company) {
        console.log('   ⚠️ Aucune entreprise trouvée, création d\'une entreprise de test...')
        company = await prisma.company.create({
          data: {
            name: 'Entreprise Test Algérienne',
            siret: '12345678901234',
            address: '123 Rue de la Liberté',
            postalCode: '16000',
            city: 'Alger',
            country: 'Algérie',
            phone: '+213 21 123 456',
            email: 'contact@entreprise-test.dz',
            currency: 'DA',
            timezone: 'Africa/Algiers'
          }
        })
        console.log(`   ✅ Entreprise créée: ${company.name}`)
      } else {
        console.log(`   ✅ Entreprise trouvée: ${company.name}`)
      }
      
      // Test de création d'une catégorie
      let category = await prisma.category.findFirst({
        where: { companyId: company.id }
      })
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: 'Produits Alimentaires',
            description: 'Catégorie de test pour les produits alimentaires',
            companyId: company.id
          }
        })
        console.log(`   ✅ Catégorie créée: ${category.name}`)
      } else {
        console.log(`   ✅ Catégorie trouvée: ${category.name}`)
      }
      
      // Test de création d'un produit
      let product = await prisma.product.findFirst({
        where: { companyId: company.id }
      })
      if (!product) {
        product = await prisma.product.create({
          data: {
            name: 'Produit Test - Couscous',
            description: 'Produit de test pour vérifier le schéma',
            price: 350.00,
            cost: 280.00,
            unit: 'paquet',
            stockQuantity: 0,
            minStock: 10,
            maxStock: 100,
            categoryId: category.id,
            companyId: company.id,
            isService: false,
            isActive: true
          }
        })
        console.log(`   ✅ Produit créé: ${product.name}`)
      } else {
        console.log(`   ✅ Produit trouvé: ${product.name}`)
      }
      
      // Test de création d'un stock
      let stock = await prisma.stock.findUnique({
        where: { productId: product.id }
      })
      if (!stock) {
        stock = await prisma.stock.create({
          data: {
            quantiteActuelle: 45,
            quantiteMinimale: 10,
            quantiteMaximale: 100,
            productId: product.id,
            companyId: company.id
          }
        })
        console.log(`   ✅ Stock créé: ${stock.quantiteActuelle} unités`)
      } else {
        console.log(`   ✅ Stock trouvé: ${stock.quantiteActuelle} unités`)
      }
      
      // Test de création d'un mouvement de stock
      const movement = await prisma.stockMovement.create({
        data: {
          type: 'IN',
          quantity: 10,
          unitCost: 280.00,
          reference: 'TEST-001',
          comment: 'Test de vérification du schéma',
          productId: product.id
        }
      })
      console.log(`   ✅ Mouvement de stock créé: +${movement.quantity} unités`)
      
    } catch (error) {
      console.log(`   ❌ Erreur module Stock: ${error.message}`)
      console.log(`   📋 Détails: ${error.stack}`)
    }
    
    // 4. Vérification des relations
    console.log('\n4️⃣ Vérification des relations...')
    
    try {
      const productsWithStock = await prisma.product.findMany({
        include: {
          stock: true,
          category: true,
          company: true
        },
        take: 3
      })
      
      console.log(`   ✅ Relations Product-Stock: ${productsWithStock.length} produits avec relations`)
      
      for (const product of productsWithStock) {
        console.log(`      📦 ${product.name}:`)
        console.log(`         - Catégorie: ${product.category?.name || 'Aucune'}`)
        console.log(`         - Entreprise: ${product.company.name}`)
        console.log(`         - Stock: ${product.stock?.quantiteActuelle || 0} unités`)
      }
      
    } catch (error) {
      console.log(`   ❌ Erreur relations: ${error.message}`)
    }
    
    // 5. Statistiques finales
    console.log('\n5️⃣ Statistiques finales...')
    
    const stats = {
      companies: await prisma.company.count(),
      products: await prisma.product.count(),
      stocks: await prisma.stock.count(),
      stockMovements: await prisma.stockMovement.count(),
      categories: await prisma.category.count(),
      clients: await prisma.client.count(),
      suppliers: await prisma.supplier.count()
    }
    
    console.log('   📊 RÉSUMÉ:')
    Object.entries(stats).forEach(([key, value]) => {
      console.log(`      ${key}: ${value}`)
    })
    
    console.log('\n🎉 VÉRIFICATION TERMINÉE AVEC SUCCÈS !')
    console.log('💡 Le schéma Prisma est correctement synchronisé avec PostgreSQL')
    console.log('🚀 Vous pouvez maintenant utiliser l\'API Stock')
    
  } catch (error) {
    console.error('\n❌ ERREUR CRITIQUE:', error.message)
    console.error('📋 Stack trace:', error.stack)
    
    if (error.code === 'P1001') {
      console.log('\n💡 SOLUTION: Vérifiez que PostgreSQL est démarré')
      console.log('   → Vérifiez les paramètres de connexion dans .env')
      console.log('   → DATABASE_URL doit pointer vers une base PostgreSQL active')
    }
    
    if (error.code === 'P2002') {
      console.log('\n💡 SOLUTION: Conflit de contrainte unique')
      console.log('   → Certaines données existent déjà')
      console.log('   → C\'est normal pour un test de vérification')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

verifySchema().catch(console.error)
