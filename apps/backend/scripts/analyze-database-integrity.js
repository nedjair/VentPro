const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function analyzeDatabaseIntegrity() {
  console.log('🔍 ANALYSE DE L\'INTÉGRITÉ DE LA BASE DE DONNÉES')
  console.log('=' .repeat(60))

  try {
    // 1. Analyser l'état général des tables
    console.log('\n1️⃣ ÉTAT GÉNÉRAL DES TABLES')
    console.log('-'.repeat(35))

    const [totalCompanies, totalProducts, totalStocks] = await Promise.all([
      prisma.company.count(),
      prisma.product.count(),
      prisma.stock.count()
    ])

    console.log(`📊 Entreprises: ${totalCompanies}`)
    console.log(`📦 Produits: ${totalProducts}`)
    console.log(`📋 Stocks: ${totalStocks}`)

    // 2. Identifier les stocks orphelins
    console.log('\n2️⃣ IDENTIFICATION DES STOCKS ORPHELINS')
    console.log('-'.repeat(45))

    // Stocks sans produit correspondant
    const orphanedStocks = await prisma.$queryRaw`
      SELECT s.id, s."productId", s."quantiteActuelle", s."companyId"
      FROM stocks s
      LEFT JOIN products p ON s."productId" = p.id
      WHERE p.id IS NULL
    `

    console.log(`🔴 Stocks orphelins (sans produit): ${orphanedStocks.length}`)
    
    if (orphanedStocks.length > 0) {
      console.log('📋 Détails des stocks orphelins:')
      orphanedStocks.slice(0, 10).forEach((stock, index) => {
        console.log(`   ${index + 1}. Stock ID: ${stock.id.slice(0, 8)}... | Product ID: ${stock.productId?.slice(0, 8) || 'NULL'}... | Quantité: ${stock.quantiteActuelle}`)
      })
      if (orphanedStocks.length > 10) {
        console.log(`   ... et ${orphanedStocks.length - 10} autres`)
      }
    }

    // 3. Identifier les produits sans stock
    console.log('\n3️⃣ IDENTIFICATION DES PRODUITS SANS STOCK')
    console.log('-'.repeat(50))

    const productsWithoutStock = await prisma.$queryRaw`
      SELECT p.id, p.name, p."stockQuantity", p."minStock", p."isService", p."isActive"
      FROM products p
      LEFT JOIN stocks s ON p.id = s."productId"
      WHERE s."productId" IS NULL 
      AND p."isService" = false 
      AND p."isActive" = true
    `

    console.log(`🟠 Produits physiques sans stock: ${productsWithoutStock.length}`)
    
    if (productsWithoutStock.length > 0) {
      console.log('📋 Détails des produits sans stock:')
      productsWithoutStock.slice(0, 10).forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} | Stock: ${product.stockQuantity} | Min: ${product.minStock}`)
      })
      if (productsWithoutStock.length > 10) {
        console.log(`   ... et ${productsWithoutStock.length - 10} autres`)
      }
    }

    // 4. Analyser les incohérences de données
    console.log('\n4️⃣ ANALYSE DES INCOHÉRENCES DE DONNÉES')
    console.log('-'.repeat(45))

    const inconsistentData = await prisma.$queryRaw`
      SELECT 
        p.id as product_id,
        p.name as product_name,
        p."stockQuantity" as product_stock,
        p."minStock" as product_min,
        p."maxStock" as product_max,
        s."quantiteActuelle" as stock_quantity,
        s."quantiteMinimale" as stock_min,
        s."quantiteMaximale" as stock_max
      FROM products p
      INNER JOIN stocks s ON p.id = s."productId"
      WHERE 
        p."stockQuantity" != s."quantiteActuelle" OR
        p."minStock" != s."quantiteMinimale" OR
        p."maxStock" IS DISTINCT FROM s."quantiteMaximale"
    `

    console.log(`⚠️ Enregistrements incohérents: ${inconsistentData.length}`)
    
    if (inconsistentData.length > 0) {
      console.log('📋 Détails des incohérences:')
      inconsistentData.slice(0, 5).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.product_name}`)
        console.log(`      Produit: Stock=${item.product_stock}, Min=${item.product_min}, Max=${item.product_max}`)
        console.log(`      Stock:   Stock=${item.stock_quantity}, Min=${item.stock_min}, Max=${item.stock_max}`)
      })
      if (inconsistentData.length > 5) {
        console.log(`   ... et ${inconsistentData.length - 5} autres`)
      }
    }

    // 5. Analyser par entreprise
    console.log('\n5️⃣ ANALYSE PAR ENTREPRISE')
    console.log('-'.repeat(30))

    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    })

    for (const company of companies) {
      const [companyProducts, companyStocks, companyOrphans, companyMissing] = await Promise.all([
        prisma.product.count({ where: { companyId: company.id } }),
        prisma.stock.count({ where: { companyId: company.id } }),
        prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM stocks s
          LEFT JOIN products p ON s."productId" = p.id
          WHERE s."companyId" = ${company.id} AND p.id IS NULL
        `,
        prisma.$queryRaw`
          SELECT COUNT(*) as count
          FROM products p
          LEFT JOIN stocks s ON p.id = s."productId"
          WHERE p."companyId" = ${company.id} 
          AND s."productId" IS NULL 
          AND p."isService" = false 
          AND p."isActive" = true
        `
      ])

      const orphansCount = Number(companyOrphans[0]?.count || 0)
      const missingCount = Number(companyMissing[0]?.count || 0)

      console.log(`🏢 ${company.name}:`)
      console.log(`   📦 Produits: ${companyProducts}`)
      console.log(`   📋 Stocks: ${companyStocks}`)
      console.log(`   🔴 Orphelins: ${orphansCount}`)
      console.log(`   🟠 Manquants: ${missingCount}`)
    }

    // 6. Vérifier les contraintes de clé étrangère
    console.log('\n6️⃣ VÉRIFICATION DES CONTRAINTES')
    console.log('-'.repeat(40))

    try {
      const constraints = await prisma.$queryRaw`
        SELECT 
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('stocks', 'products')
        ORDER BY tc.table_name, tc.constraint_name
      `

      console.log(`🔗 Contraintes de clé étrangère trouvées: ${constraints.length}`)
      constraints.forEach(constraint => {
        console.log(`   ${constraint.table_name}.${constraint.column_name} → ${constraint.foreign_table_name}.${constraint.foreign_column_name}`)
      })

    } catch (error) {
      console.log(`⚠️ Erreur lors de la vérification des contraintes: ${error.message}`)
    }

    // 7. Résumé et recommandations
    console.log('\n7️⃣ RÉSUMÉ ET RECOMMANDATIONS')
    console.log('-'.repeat(40))

    const totalIssues = orphanedStocks.length + productsWithoutStock.length + inconsistentData.length

    console.log(`📊 STATISTIQUES:`)
    console.log(`   🔴 Stocks orphelins: ${orphanedStocks.length}`)
    console.log(`   🟠 Produits sans stock: ${productsWithoutStock.length}`)
    console.log(`   ⚠️ Incohérences: ${inconsistentData.length}`)
    console.log(`   📈 Total des problèmes: ${totalIssues}`)

    if (totalIssues === 0) {
      console.log(`\n✅ EXCELLENT! La base de données est parfaitement cohérente.`)
    } else {
      console.log(`\n🔧 ACTIONS RECOMMANDÉES:`)
      
      if (orphanedStocks.length > 0) {
        console.log(`   1. Supprimer ${orphanedStocks.length} stock(s) orphelin(s)`)
      }
      
      if (productsWithoutStock.length > 0) {
        console.log(`   2. Créer ${productsWithoutStock.length} enregistrement(s) stock manquant(s)`)
      }
      
      if (inconsistentData.length > 0) {
        console.log(`   3. Synchroniser ${inconsistentData.length} enregistrement(s) incohérent(s)`)
      }

      console.log(`\n💡 COMMANDES SUGGÉRÉES:`)
      console.log(`   • Nettoyage complet: node scripts/cleanup-database.js`)
      console.log(`   • Nettoyage via API: POST /api/v1/auto-sync/cleanup`)
      console.log(`   • Synchronisation: POST /api/v1/auto-sync/sync-company`)
      console.log(`   • Interface web: http://localhost:3001/auto-sync`)
    }

    // 8. Sauvegarde des résultats pour le script de nettoyage
    const analysisResults = {
      timestamp: new Date().toISOString(),
      orphanedStocks: orphanedStocks.map(s => s.id),
      productsWithoutStock: productsWithoutStock.map(p => p.id),
      inconsistentData: inconsistentData.map(i => i.product_id),
      totalIssues,
      companies: companies.map(c => c.id)
    }

    // Optionnel: sauvegarder dans un fichier JSON pour référence
    const fs = require('fs')
    const path = require('path')
    
    const resultsPath = path.join(__dirname, 'database-analysis-results.json')
    fs.writeFileSync(resultsPath, JSON.stringify(analysisResults, null, 2))
    console.log(`\n💾 Résultats sauvegardés dans: ${resultsPath}`)

    return analysisResults

  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour afficher un rapport rapide
async function quickReport() {
  console.log('⚡ RAPPORT RAPIDE DE L\'INTÉGRITÉ')
  console.log('=' .repeat(40))

  try {
    const [orphans, missing, inconsistent] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM stocks s
        LEFT JOIN products p ON s."productId" = p.id
        WHERE p.id IS NULL
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM products p
        LEFT JOIN stocks s ON p.id = s."productId"
        WHERE s."productId" IS NULL 
        AND p."isService" = false 
        AND p."isActive" = true
      `,
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM products p
        INNER JOIN stocks s ON p.id = s."productId"
        WHERE 
          p."stockQuantity" != s."quantiteActuelle" OR
          p."minStock" != s."quantiteMinimale" OR
          p."maxStock" IS DISTINCT FROM s."quantiteMaximale"
      `
    ])

    const orphansCount = Number(orphans[0]?.count || 0)
    const missingCount = Number(missing[0]?.count || 0)
    const inconsistentCount = Number(inconsistent[0]?.count || 0)
    const totalIssues = orphansCount + missingCount + inconsistentCount

    console.log(`🔴 Stocks orphelins: ${orphansCount}`)
    console.log(`🟠 Stocks manquants: ${missingCount}`)
    console.log(`⚠️ Incohérences: ${inconsistentCount}`)
    console.log(`📊 Total: ${totalIssues}`)

    if (totalIssues === 0) {
      console.log(`✅ Base de données cohérente!`)
    } else {
      console.log(`🔧 Nettoyage recommandé`)
    }

  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2)

if (args.includes('--quick') || args.includes('-q')) {
  quickReport()
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🔍 Script d\'analyse de l\'intégrité de la base de données')
  console.log('')
  console.log('Usage:')
  console.log('  node analyze-database-integrity.js        # Analyse complète')
  console.log('  node analyze-database-integrity.js --quick # Rapport rapide')
  console.log('  node analyze-database-integrity.js --help  # Afficher cette aide')
  console.log('')
} else {
  analyzeDatabaseIntegrity()
}
