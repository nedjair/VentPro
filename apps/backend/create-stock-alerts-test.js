const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createStockAlertsTestData() {
  console.log('🧪 Création de données de test pour les alertes de stock...')

  try {
    // Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }

    console.log(`✅ Entreprise trouvée: ${company.name} (${company.id})`)

    // Récupérer ou créer une catégorie
    let category = await prisma.category.findFirst({
      where: { companyId: company.id }
    })

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Produits de test',
          description: 'Catégorie pour les tests d\'alertes',
          companyId: company.id
        }
      })
    }

    // Produits de test avec différents niveaux de stock
    const testProducts = [
      {
        name: 'Produit Test Rupture',
        sku: 'TEST-RUPTURE-001',
        description: 'Produit en rupture de stock pour test',
        price: 100.00,
        cost: 80.00,
        stockQuantity: 0, // Rupture de stock
        minStock: 5,
        maxStock: 50,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: category.id,
        companyId: company.id
      },
      {
        name: 'Produit Test Stock Faible',
        sku: 'TEST-FAIBLE-001',
        description: 'Produit avec stock faible pour test',
        price: 150.00,
        cost: 120.00,
        stockQuantity: 3, // Stock faible (< minStock)
        minStock: 10,
        maxStock: 100,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: category.id,
        companyId: company.id
      },
      {
        name: 'Produit Test Stock Critique',
        sku: 'TEST-CRITIQUE-001',
        description: 'Produit avec stock critique pour test',
        price: 200.00,
        cost: 160.00,
        stockQuantity: 2, // Stock très faible
        minStock: 15,
        maxStock: 80,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: category.id,
        companyId: company.id
      },
      {
        name: 'Produit Test Stock Normal',
        sku: 'TEST-NORMAL-001',
        description: 'Produit avec stock normal pour test',
        price: 75.00,
        cost: 60.00,
        stockQuantity: 25, // Stock normal
        minStock: 10,
        maxStock: 100,
        unit: 'pièce',
        isActive: true,
        isService: false,
        categoryId: category.id,
        companyId: company.id
      }
    ]

    console.log('\n📦 Création des produits de test...')
    
    for (const productData of testProducts) {
      try {
        // Vérifier si le produit existe déjà
        const existingProduct = await prisma.product.findFirst({
          where: {
            sku: productData.sku,
            companyId: company.id
          }
        })

        if (existingProduct) {
          // Mettre à jour le produit existant
          await prisma.product.update({
            where: { id: existingProduct.id },
            data: {
              stockQuantity: productData.stockQuantity,
              minStock: productData.minStock,
              maxStock: productData.maxStock
            }
          })
          console.log(`   🔄 Mis à jour: ${productData.name} (Stock: ${productData.stockQuantity}/${productData.minStock})`)
        } else {
          // Créer un nouveau produit
          await prisma.product.create({
            data: productData
          })
          console.log(`   ✅ Créé: ${productData.name} (Stock: ${productData.stockQuantity}/${productData.minStock})`)
        }
      } catch (error) {
        console.log(`   ❌ Erreur pour ${productData.name}:`, error.message)
      }
    }

    // Vérifier les alertes créées
    console.log('\n🚨 Vérification des alertes...')
    
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

    console.log('\n🎯 Données de test créées avec succès!')
    console.log('   Vous pouvez maintenant tester les alertes dans le tableau de bord.')

  } catch (error) {
    console.error('❌ Erreur lors de la création des données de test:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createStockAlertsTestData()
