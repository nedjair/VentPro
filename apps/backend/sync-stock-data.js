const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function syncStockData() {
  console.log('🔄 Synchronisation des données de stock...')
  console.log('   Problème identifié: Duplication des données entre tables products et stocks')

  try {
    // Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }

    console.log(`✅ Entreprise: ${company.name} (${company.id})`)

    // 1. Analyser l'état actuel
    console.log('\n📊 Analyse de l\'état actuel...')
    
    const totalProducts = await prisma.product.count({
      where: { companyId: company.id }
    })
    
    const totalStocks = await prisma.stock.count({
      where: { companyId: company.id }
    })
    
    console.log(`   📦 Produits dans products: ${totalProducts}`)
    console.log(`   📋 Enregistrements dans stocks: ${totalStocks}`)

    // 2. Identifier les produits sans enregistrement stock
    const productsWithoutStock = await prisma.product.findMany({
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

    console.log(`   🔍 Produits sans enregistrement stock: ${productsWithoutStock.length}`)

    // 3. Créer les enregistrements stock manquants
    if (productsWithoutStock.length > 0) {
      console.log('\n🔧 Création des enregistrements stock manquants...')
      
      for (const product of productsWithoutStock) {
        try {
          await prisma.stock.create({
            data: {
              quantiteActuelle: product.stockQuantity || 0,
              quantiteMinimale: product.minStock || 0,
              quantiteMaximale: product.maxStock,
              productId: product.id,
              companyId: company.id
            }
          })
          console.log(`   ✅ Stock créé pour: ${product.name}`)
        } catch (error) {
          console.log(`   ❌ Erreur pour ${product.name}: ${error.message}`)
        }
      }
    }

    // 4. Synchroniser les données existantes (products -> stocks)
    console.log('\n🔄 Synchronisation products -> stocks...')
    
    const productsWithStock = await prisma.product.findMany({
      where: {
        companyId: company.id,
        stock: { isNot: null }
      },
      include: {
        stock: true
      }
    })

    let syncCount = 0
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
        syncCount++
        console.log(`   🔄 Synchronisé: ${product.name} (${product.stockQuantity}/${product.minStock})`)
      }
    }

    console.log(`   ✅ ${syncCount} enregistrements synchronisés`)

    // 5. Créer des données de test avec alertes
    console.log('\n🧪 Création de données de test pour alertes...')
    
    const testProducts = [
      {
        name: 'Test Produit Rupture',
        sku: 'TEST-RUPTURE-SYNC',
        price: 100.00,
        stockQuantity: 0,
        minStock: 5,
        maxStock: 50
      },
      {
        name: 'Test Produit Stock Faible',
        sku: 'TEST-FAIBLE-SYNC',
        price: 150.00,
        stockQuantity: 3,
        minStock: 10,
        maxStock: 100
      },
      {
        name: 'Test Produit Stock Critique',
        sku: 'TEST-CRITIQUE-SYNC',
        price: 200.00,
        stockQuantity: 1,
        minStock: 8,
        maxStock: 80
      }
    ]

    for (const testData of testProducts) {
      try {
        // Vérifier si le produit existe déjà
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: testData.sku,
            companyId: company.id
          }
        })

        if (!existingProduct) {
          // Créer le produit
          const newProduct = await prisma.product.create({
            data: {
              ...testData,
              description: `Produit de test pour alertes - ${testData.name}`,
              unit: 'pièce',
              isActive: true,
              isService: false,
              companyId: company.id
            }
          })

          // Créer l'enregistrement stock correspondant
          await prisma.stock.create({
            data: {
              quantiteActuelle: testData.stockQuantity,
              quantiteMinimale: testData.minStock,
              quantiteMaximale: testData.maxStock,
              productId: newProduct.id,
              companyId: company.id
            }
          })

          const status = testData.stockQuantity === 0 ? '🔴 RUPTURE' : 
                        testData.stockQuantity <= testData.minStock ? '🟠 FAIBLE' : '🟢 NORMAL'
          console.log(`   ✅ Créé: ${testData.name} (${testData.stockQuantity}/${testData.minStock}) ${status}`)
        } else {
          // Mettre à jour le produit existant
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              stockQuantity: testData.stockQuantity,
              minStock: testData.minStock,
              maxStock: testData.maxStock
            }
          })

          // Mettre à jour le stock correspondant
          await prisma.stock.updateMany({
            where: { productId: existingProduct.id },
            data: {
              quantiteActuelle: testData.stockQuantity,
              quantiteMinimale: testData.minStock,
              quantiteMaximale: testData.maxStock,
              dateLastUpdate: new Date()
            }
          })

          console.log(`   🔄 Mis à jour: ${testData.name}`)
        }
      } catch (error) {
        console.log(`   ❌ Erreur pour ${testData.name}: ${error.message}`)
      }
    }

    // 6. Vérifier les alertes après synchronisation
    console.log('\n🚨 Vérification des alertes après synchronisation...')
    
    // Compter via la table products (utilisée par les alertes)
    const outOfStockCount = await prisma.product.count({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
        stockQuantity: 0
      }
    })

    const lowStockRaw = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      WHERE p."companyId" = ${company.id}
        AND p."isActive" = true
        AND p."isService" = false
        AND p."stockQuantity" > 0
        AND p."stockQuantity" <= p."minStock"
    `
    const lowStockCount = Number(lowStockRaw[0]?.count || 0)

    console.log(`   🔴 Produits en rupture: ${outOfStockCount}`)
    console.log(`   🟠 Produits stock faible: ${lowStockCount}`)
    console.log(`   📊 Total alertes: ${outOfStockCount + lowStockCount}`)

    // 7. Afficher quelques exemples
    if (lowStockCount > 0 || outOfStockCount > 0) {
      console.log('\n📋 Exemples de produits avec alertes:')
      
      // Utiliser une requête SQL brute pour éviter le problème avec prisma.product.fields.minStock
      const alertProductsRaw = await prisma.$queryRaw`
        SELECT p.name, p."stockQuantity", p."minStock"
        FROM products p
        WHERE p."companyId" = ${company.id}
          AND p."isActive" = true
          AND p."isService" = false
          AND (p."stockQuantity" = 0 OR p."stockQuantity" <= p."minStock")
        LIMIT 5
      `
      const alertProducts = alertProductsRaw as any[]

      alertProducts.forEach(p => {
        const status = p.stockQuantity === 0 ? '🔴 RUPTURE' : '🟠 FAIBLE'
        console.log(`   ${status} ${p.name}: ${p.stockQuantity}/${p.minStock}`)
      })
    }

    console.log('\n🎯 Synchronisation terminée avec succès!')
    console.log('   Les données entre products et stocks sont maintenant cohérentes.')
    console.log('   Vous pouvez tester les alertes dans le tableau de bord.')

  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error)
  } finally {
    await prisma.$disconnect()
  }
}

syncStockData()
