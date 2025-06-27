const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStockData() {
  console.log('🔍 Vérification des données de stock...')

  try {
    // Récupérer la première entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      console.log('❌ Aucune entreprise trouvée')
      return
    }

    console.log(`✅ Entreprise: ${company.name} (${company.id})`)

    // Compter tous les produits
    const totalProducts = await prisma.product.count({
      where: { companyId: company.id }
    })
    console.log(`📦 Total produits: ${totalProducts}`)

    // Compter les produits actifs non-services
    const activeProducts = await prisma.product.count({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false
      }
    })
    console.log(`✅ Produits actifs (non-services): ${activeProducts}`)

    // Récupérer quelques produits avec leurs stocks
    const sampleProducts = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true,
        isActive: true,
        isService: true
      },
      take: 10
    })

    console.log('\n📊 Échantillon de produits:')
    sampleProducts.forEach(p => {
      const status = p.stockQuantity === 0 ? '🔴 RUPTURE' : 
                    p.stockQuantity <= p.minStock ? '🟠 FAIBLE' : '🟢 NORMAL'
      console.log(`   ${p.name}: ${p.stockQuantity}/${p.minStock} ${status}`)
    })

    // Test de la requête SQL pour stock faible
    console.log('\n🔍 Test requête SQL stock faible...')
    const lowStockRaw = await prisma.$queryRaw`
      SELECT p.id, p.name, p."stockQuantity", p."minStock"
      FROM products p
      WHERE p."companyId" = ${company.id}
        AND p."isActive" = true
        AND p."isService" = false
        AND p."stockQuantity" > 0
        AND p."stockQuantity" <= p."minStock"
      LIMIT 5
    `
    
    console.log(`📊 Produits stock faible trouvés: ${lowStockRaw.length}`)
    lowStockRaw.forEach(p => {
      console.log(`   ${p.name}: ${p.stockQuantity}/${p.minStock}`)
    })

    // Test de la requête pour rupture de stock
    const outOfStockProducts = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isService: false,
        isActive: true,
        stockQuantity: 0
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        minStock: true
      },
      take: 5
    })

    console.log(`\n🔴 Produits en rupture trouvés: ${outOfStockProducts.length}`)
    outOfStockProducts.forEach(p => {
      console.log(`   ${p.name}: ${p.stockQuantity}/${p.minStock}`)
    })

    // Résumé final
    const totalAlerts = lowStockRaw.length + outOfStockProducts.length
    console.log(`\n🚨 RÉSUMÉ DES ALERTES:`)
    console.log(`   🟠 Stock faible: ${lowStockRaw.length}`)
    console.log(`   🔴 Rupture: ${outOfStockProducts.length}`)
    console.log(`   📊 Total alertes: ${totalAlerts}`)

    if (totalAlerts === 0) {
      console.log('\n💡 SUGGESTION: Créer des produits de test avec stock faible')
      console.log('   Exécutez: node create-stock-alerts-test.js')
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStockData()
