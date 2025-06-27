const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function syncProductsStocks() {
  console.log('🔄 SYNCHRONISATION COMPLÈTE DES DONNÉES PRODUCTS ↔ STOCKS')
  console.log('=' .repeat(60))

  try {
    // 1. Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }

    console.log(`✅ Entreprise: ${company.name} (ID: ${company.id})`)

    // 2. Analyser l'état actuel
    console.log('\n📊 ANALYSE DE L\'ÉTAT ACTUEL')
    console.log('-'.repeat(40))
    
    const stats = await Promise.all([
      prisma.product.count({ where: { companyId: company.id } }),
      prisma.product.count({ where: { companyId: company.id, isActive: true, isService: false } }),
      prisma.stock.count({ where: { companyId: company.id } }),
      prisma.product.count({ where: { companyId: company.id, stock: null } })
    ])

    const [totalProducts, activeProducts, totalStocks, productsWithoutStock] = stats

    console.log(`📦 Total produits: ${totalProducts}`)
    console.log(`✅ Produits actifs (non-services): ${activeProducts}`)
    console.log(`📋 Enregistrements stocks: ${totalStocks}`)
    console.log(`⚠️  Produits sans stock: ${productsWithoutStock}`)

    // 3. Créer les enregistrements stock manquants
    if (productsWithoutStock > 0) {
      console.log('\n🔧 CRÉATION DES ENREGISTREMENTS STOCK MANQUANTS')
      console.log('-'.repeat(50))

      const productsNeedingStock = await prisma.product.findMany({
        where: {
          companyId: company.id,
          stock: null
        },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          minStock: true,
          maxStock: true
        }
      })

      let createdCount = 0
      for (const product of productsNeedingStock) {
        try {
          await prisma.stock.create({
            data: {
              quantiteActuelle: product.stockQuantity || 0,
              quantiteMinimale: product.minStock || 0,
              quantiteMaximale: product.maxStock || 100,
              productId: product.id,
              companyId: company.id,
              dateLastUpdate: new Date()
            }
          })
          createdCount++
          console.log(`   ✅ Stock créé: ${product.name} (${product.stockQuantity}/${product.minStock})`)
        } catch (error) {
          console.log(`   ❌ Erreur: ${product.name} - ${error.message}`)
        }
      }
      console.log(`📊 ${createdCount} enregistrements stock créés`)
    }

    // 4. Synchroniser les données existantes (products → stocks)
    console.log('\n🔄 SYNCHRONISATION PRODUCTS → STOCKS')
    console.log('-'.repeat(40))

    const productsWithStock = await prisma.product.findMany({
      where: {
        companyId: company.id,
        stock: { isNot: null }
      },
      include: {
        stock: true
      }
    })

    let syncedCount = 0
    for (const product of productsWithStock) {
      const needsUpdate = 
        product.stock.quantiteActuelle !== product.stockQuantity ||
        product.stock.quantiteMinimale !== product.minStock ||
        product.stock.quantiteMaximale !== product.maxStock

      if (needsUpdate) {
        await prisma.stock.update({
          where: { id: product.stock.id },
          data: {
            quantiteActuelle: product.stockQuantity,
            quantiteMinimale: product.minStock,
            quantiteMaximale: product.maxStock,
            dateLastUpdate: new Date()
          }
        })
        syncedCount++
        console.log(`   🔄 Synchronisé: ${product.name}`)
        console.log(`      Stock: ${product.stock.quantiteActuelle} → ${product.stockQuantity}`)
        console.log(`      Min: ${product.stock.quantiteMinimale} → ${product.minStock}`)
      }
    }
    console.log(`📊 ${syncedCount} enregistrements synchronisés`)

    // 5. Créer des données de test GARANTIES pour les alertes
    console.log('\n🧪 CRÉATION DE DONNÉES DE TEST POUR ALERTES')
    console.log('-'.repeat(45))

    const testProducts = [
      {
        name: 'ALERTE TEST - Rupture Stock',
        sku: 'ALERT-RUPTURE-001',
        description: 'Produit de test en rupture de stock',
        price: 100.00,
        cost: 80.00,
        stockQuantity: 0,        // RUPTURE
        minStock: 5,
        maxStock: 50,
        unit: 'pièce'
      },
      {
        name: 'ALERTE TEST - Stock Faible',
        sku: 'ALERT-FAIBLE-001',
        description: 'Produit de test avec stock faible',
        price: 150.00,
        cost: 120.00,
        stockQuantity: 2,        // FAIBLE (< minStock)
        minStock: 10,
        maxStock: 100,
        unit: 'pièce'
      },
      {
        name: 'ALERTE TEST - Stock Critique',
        sku: 'ALERT-CRITIQUE-001',
        description: 'Produit de test avec stock critique',
        price: 200.00,
        cost: 160.00,
        stockQuantity: 1,        // CRITIQUE (< minStock)
        minStock: 8,
        maxStock: 80,
        unit: 'pièce'
      }
    ]

    for (const testData of testProducts) {
      try {
        // Vérifier si le produit existe
        let product = await prisma.product.findFirst({
          where: {
            sku: testData.sku,
            companyId: company.id
          },
          include: { stock: true }
        })

        if (!product) {
          // Créer le produit
          product = await prisma.product.create({
            data: {
              ...testData,
              isActive: true,
              isService: false,
              companyId: company.id
            },
            include: { stock: true }
          })
        } else {
          // Mettre à jour le produit existant
          product = await prisma.product.update({
            where: { id: product.id },
            data: {
              stockQuantity: testData.stockQuantity,
              minStock: testData.minStock,
              maxStock: testData.maxStock
            },
            include: { stock: true }
          })
        }

        // Créer ou mettre à jour l'enregistrement stock
        if (!product.stock) {
          await prisma.stock.create({
            data: {
              quantiteActuelle: testData.stockQuantity,
              quantiteMinimale: testData.minStock,
              quantiteMaximale: testData.maxStock,
              productId: product.id,
              companyId: company.id,
              dateLastUpdate: new Date()
            }
          })
        } else {
          await prisma.stock.update({
            where: { id: product.stock.id },
            data: {
              quantiteActuelle: testData.stockQuantity,
              quantiteMinimale: testData.minStock,
              quantiteMaximale: testData.maxStock,
              dateLastUpdate: new Date()
            }
          })
        }

        const status = testData.stockQuantity === 0 ? '🔴 RUPTURE' : 
                      testData.stockQuantity <= testData.minStock ? '🟠 FAIBLE' : '🟢 NORMAL'
        console.log(`   ✅ ${testData.name}: ${testData.stockQuantity}/${testData.minStock} ${status}`)

      } catch (error) {
        console.log(`   ❌ Erreur: ${testData.name} - ${error.message}`)
      }
    }

    // 6. VÉRIFICATION FINALE DES ALERTES
    console.log('\n🚨 VÉRIFICATION FINALE DES ALERTES')
    console.log('-'.repeat(35))

    // Test de la requête SQL utilisée par l'API
    const lowStockRaw = await prisma.$queryRaw`
      SELECT p.id, p.name, p."stockQuantity", p."minStock"
      FROM products p
      WHERE p."companyId" = ${company.id}
        AND p."isActive" = true
        AND p."isService" = false
        AND p."stockQuantity" > 0
        AND p."stockQuantity" <= p."minStock"
      ORDER BY p."stockQuantity" ASC
    `

    const outOfStockProducts = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
        stockQuantity: 0
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true
      }
    })

    console.log(`🔴 Produits en rupture: ${outOfStockProducts.length}`)
    outOfStockProducts.forEach(p => {
      console.log(`   - ${p.name}: ${p.stockQuantity}/${p.minStock}`)
    })

    console.log(`🟠 Produits stock faible: ${lowStockRaw.length}`)
    lowStockRaw.forEach(p => {
      console.log(`   - ${p.name}: ${p.stockQuantity}/${p.minStock}`)
    })

    const totalAlerts = outOfStockProducts.length + lowStockRaw.length
    console.log(`📊 TOTAL ALERTES: ${totalAlerts}`)

    // 7. RÉSUMÉ FINAL
    console.log('\n🎯 SYNCHRONISATION TERMINÉE')
    console.log('=' .repeat(30))
    console.log('✅ Tables products et stocks synchronisées')
    console.log('✅ Données de test créées avec alertes garanties')
    console.log(`✅ ${totalAlerts} alertes disponibles pour le tableau de bord`)
    console.log('\n🔗 Prochaines étapes:')
    console.log('   1. Rafraîchir le tableau de bord: http://localhost:3002/dashboard')
    console.log('   2. Vérifier les logs dans la console du navigateur')
    console.log('   3. Les alertes devraient maintenant s\'afficher!')

  } catch (error) {
    console.error('❌ ERREUR LORS DE LA SYNCHRONISATION:', error)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter la synchronisation
syncProductsStocks()
