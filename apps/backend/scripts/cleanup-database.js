const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function cleanupDatabase(options = {}) {
  const {
    dryRun = false,
    createBackup = true,
    verbose = true,
    companyId = null
  } = options

  console.log('🧹 NETTOYAGE SÉCURISÉ DE LA BASE DE DONNÉES')
  console.log('=' .repeat(60))
  
  if (dryRun) {
    console.log('🔍 MODE SIMULATION - Aucune modification ne sera effectuée')
  }

  try {
    // 1. Créer une sauvegarde avant nettoyage
    let backupData = null
    if (createBackup && !dryRun) {
      console.log('\n1️⃣ CRÉATION DE LA SAUVEGARDE')
      console.log('-'.repeat(35))
      
      backupData = await createBackup()
      console.log(`✅ Sauvegarde créée: ${backupData.filename}`)
    }

    // 2. Analyser l'état actuel
    console.log('\n2️⃣ ANALYSE DE L\'ÉTAT ACTUEL')
    console.log('-'.repeat(35))

    const analysis = await analyzeCurrentState(companyId)
    
    console.log(`🔴 Stocks orphelins: ${analysis.orphanedStocks.length}`)
    console.log(`🟠 Produits sans stock: ${analysis.productsWithoutStock.length}`)
    console.log(`⚠️ Incohérences: ${analysis.inconsistentData.length}`)

    if (analysis.totalIssues === 0) {
      console.log(`✅ Aucun problème détecté. Base de données déjà cohérente.`)
      return { success: true, message: 'Aucun nettoyage nécessaire' }
    }

    // 3. Supprimer les stocks orphelins
    let deletedOrphans = 0
    if (analysis.orphanedStocks.length > 0) {
      console.log('\n3️⃣ SUPPRESSION DES STOCKS ORPHELINS')
      console.log('-'.repeat(45))

      if (verbose) {
        console.log('📋 Stocks orphelins à supprimer:')
        analysis.orphanedStocks.slice(0, 10).forEach((stock, index) => {
          console.log(`   ${index + 1}. ID: ${stock.id.slice(0, 8)}... | Product ID: ${stock.productId?.slice(0, 8) || 'NULL'}...`)
        })
        if (analysis.orphanedStocks.length > 10) {
          console.log(`   ... et ${analysis.orphanedStocks.length - 10} autres`)
        }
      }

      if (!dryRun) {
        // Suppression sécurisée avec vérification
        const orphanIds = analysis.orphanedStocks.map(s => s.id)
        
        const deleteResult = await prisma.stock.deleteMany({
          where: {
            id: { in: orphanIds },
            // Double vérification: s'assurer qu'il n'y a pas de produit correspondant
            product: null
          }
        })

        deletedOrphans = deleteResult.count
        console.log(`✅ ${deletedOrphans} stock(s) orphelin(s) supprimé(s)`)
      } else {
        console.log(`🔍 ${analysis.orphanedStocks.length} stock(s) orphelin(s) seraient supprimé(s)`)
      }
    }

    // 4. Créer les stocks manquants
    let createdStocks = 0
    if (analysis.productsWithoutStock.length > 0) {
      console.log('\n4️⃣ CRÉATION DES STOCKS MANQUANTS')
      console.log('-'.repeat(40))

      if (verbose) {
        console.log('📋 Produits nécessitant un stock:')
        analysis.productsWithoutStock.slice(0, 10).forEach((product, index) => {
          console.log(`   ${index + 1}. ${product.name} | Stock: ${product.stockQuantity} | Min: ${product.minStock}`)
        })
        if (analysis.productsWithoutStock.length > 10) {
          console.log(`   ... et ${analysis.productsWithoutStock.length - 10} autres`)
        }
      }

      if (!dryRun) {
        for (const product of analysis.productsWithoutStock) {
          try {
            await prisma.stock.create({
              data: {
                productId: product.id,
                companyId: product.companyId,
                quantiteActuelle: product.stockQuantity || 0,
                quantiteMinimale: product.minStock || 0,
                quantiteMaximale: product.maxStock,
                dateLastUpdate: new Date()
              }
            })
            createdStocks++
          } catch (error) {
            console.log(`⚠️ Erreur création stock pour ${product.name}: ${error.message}`)
          }
        }
        console.log(`✅ ${createdStocks} enregistrement(s) stock créé(s)`)
      } else {
        console.log(`🔍 ${analysis.productsWithoutStock.length} enregistrement(s) stock seraient créé(s)`)
      }
    }

    // 5. Synchroniser les données incohérentes
    let synchronizedRecords = 0
    if (analysis.inconsistentData.length > 0) {
      console.log('\n5️⃣ SYNCHRONISATION DES DONNÉES INCOHÉRENTES')
      console.log('-'.repeat(50))

      if (verbose) {
        console.log('📋 Enregistrements à synchroniser:')
        analysis.inconsistentData.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.product_name}`)
          console.log(`      Produit: ${item.product_stock}/${item.product_min}/${item.product_max}`)
          console.log(`      Stock:   ${item.stock_quantity}/${item.stock_min}/${item.stock_max}`)
        })
        if (analysis.inconsistentData.length > 5) {
          console.log(`   ... et ${analysis.inconsistentData.length - 5} autres`)
        }
      }

      if (!dryRun) {
        for (const item of analysis.inconsistentData) {
          try {
            // Synchroniser en utilisant les données du produit comme référence
            await prisma.stock.update({
              where: { productId: item.product_id },
              data: {
                quantiteActuelle: item.product_stock,
                quantiteMinimale: item.product_min,
                quantiteMaximale: item.product_max,
                dateLastUpdate: new Date()
              }
            })
            synchronizedRecords++
          } catch (error) {
            console.log(`⚠️ Erreur synchronisation ${item.product_name}: ${error.message}`)
          }
        }
        console.log(`✅ ${synchronizedRecords} enregistrement(s) synchronisé(s)`)
      } else {
        console.log(`🔍 ${analysis.inconsistentData.length} enregistrement(s) seraient synchronisé(s)`)
      }
    }

    // 6. Vérification post-nettoyage
    console.log('\n6️⃣ VÉRIFICATION POST-NETTOYAGE')
    console.log('-'.repeat(40))

    if (!dryRun) {
      const postAnalysis = await analyzeCurrentState(companyId)
      
      console.log(`📊 RÉSULTATS APRÈS NETTOYAGE:`)
      console.log(`   🔴 Stocks orphelins restants: ${postAnalysis.orphanedStocks.length}`)
      console.log(`   🟠 Produits sans stock restants: ${postAnalysis.productsWithoutStock.length}`)
      console.log(`   ⚠️ Incohérences restantes: ${postAnalysis.inconsistentData.length}`)
      console.log(`   📈 Total des problèmes restants: ${postAnalysis.totalIssues}`)

      if (postAnalysis.totalIssues === 0) {
        console.log(`\n🎉 NETTOYAGE RÉUSSI! Base de données parfaitement cohérente.`)
      } else {
        console.log(`\n⚠️ Certains problèmes persistent. Vérification manuelle recommandée.`)
      }
    }

    // 7. Résumé des actions
    console.log('\n7️⃣ RÉSUMÉ DES ACTIONS')
    console.log('-'.repeat(30))

    const summary = {
      deletedOrphans,
      createdStocks,
      synchronizedRecords,
      totalActions: deletedOrphans + createdStocks + synchronizedRecords,
      dryRun,
      backupCreated: !!backupData
    }

    console.log(`📊 ACTIONS EFFECTUÉES:`)
    console.log(`   🗑️ Stocks orphelins supprimés: ${deletedOrphans}`)
    console.log(`   ➕ Stocks créés: ${createdStocks}`)
    console.log(`   🔄 Enregistrements synchronisés: ${synchronizedRecords}`)
    console.log(`   📈 Total des actions: ${summary.totalActions}`)

    if (backupData) {
      console.log(`   💾 Sauvegarde: ${backupData.filename}`)
    }

    if (dryRun) {
      console.log(`\n💡 Pour effectuer le nettoyage réel, exécutez sans --dry-run`)
    }

    return {
      success: true,
      summary,
      backupData
    }

  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction d'analyse de l'état actuel
async function analyzeCurrentState(companyId = null) {
  const whereClause = companyId ? { companyId } : {}

  const [orphanedStocks, productsWithoutStock, inconsistentData] = await Promise.all([
    // Stocks orphelins
    prisma.$queryRaw`
      SELECT s.id, s."productId", s."quantiteActuelle", s."companyId"
      FROM stocks s
      LEFT JOIN products p ON s."productId" = p.id
      WHERE p.id IS NULL
      ${companyId ? prisma.$queryRaw`AND s."companyId" = ${companyId}` : prisma.$queryRaw``}
    `,
    
    // Produits sans stock
    prisma.$queryRaw`
      SELECT p.id, p.name, p."stockQuantity", p."minStock", p."maxStock", p."companyId"
      FROM products p
      LEFT JOIN stocks s ON p.id = s."productId"
      WHERE s."productId" IS NULL 
      AND p."isService" = false 
      AND p."isActive" = true
      ${companyId ? prisma.$queryRaw`AND p."companyId" = ${companyId}` : prisma.$queryRaw``}
    `,
    
    // Données incohérentes
    prisma.$queryRaw`
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
        (p."stockQuantity" != s."quantiteActuelle" OR
         p."minStock" != s."quantiteMinimale" OR
         p."maxStock" IS DISTINCT FROM s."quantiteMaximale")
      ${companyId ? prisma.$queryRaw`AND p."companyId" = ${companyId}` : prisma.$queryRaw``}
    `
  ])

  return {
    orphanedStocks,
    productsWithoutStock,
    inconsistentData,
    totalIssues: orphanedStocks.length + productsWithoutStock.length + inconsistentData.length
  }
}

// Fonction de création de sauvegarde
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `database-backup-${timestamp}.json`
  const backupPath = path.join(__dirname, 'backups', filename)

  // Créer le dossier backups s'il n'existe pas
  const backupsDir = path.dirname(backupPath)
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true })
  }

  // Sauvegarder les données critiques
  const [products, stocks, companies] = await Promise.all([
    prisma.product.findMany(),
    prisma.stock.findMany(),
    prisma.company.findMany()
  ])

  const backupData = {
    timestamp: new Date().toISOString(),
    version: '1.0',
    data: {
      products,
      stocks,
      companies
    },
    metadata: {
      productsCount: products.length,
      stocksCount: stocks.length,
      companiesCount: companies.length
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2))

  return {
    filename,
    path: backupPath,
    size: fs.statSync(backupPath).size,
    recordsCount: products.length + stocks.length + companies.length
  }
}

// Fonction de restauration (en cas de problème)
async function restoreFromBackup(backupPath) {
  console.log('🔄 RESTAURATION DEPUIS LA SAUVEGARDE')
  console.log('=' .repeat(45))

  try {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Fichier de sauvegarde non trouvé: ${backupPath}`)
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'))
    console.log(`📅 Sauvegarde du: ${backupData.timestamp}`)
    console.log(`📊 Enregistrements: ${backupData.metadata.recordsCount}`)

    // Attention: Cette opération est destructive!
    console.log('⚠️ ATTENTION: Cette opération va remplacer toutes les données!')
    
    // Ici, vous pourriez implémenter la logique de restauration
    // Pour la sécurité, nous ne l'implémentons pas automatiquement
    
    console.log('💡 Restauration manuelle recommandée via les outils PostgreSQL')
    
  } catch (error) {
    console.error('❌ Erreur lors de la restauration:', error)
    throw error
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2)

async function main() {
  const options = {
    dryRun: args.includes('--dry-run') || args.includes('-d'),
    createBackup: !args.includes('--no-backup'),
    verbose: !args.includes('--quiet'),
    companyId: null
  }

  // Récupérer l'ID de l'entreprise si spécifié
  const companyIndex = args.findIndex(arg => arg === '--company')
  if (companyIndex !== -1 && args[companyIndex + 1]) {
    options.companyId = args[companyIndex + 1]
  }

  if (args.includes('--help') || args.includes('-h')) {
    console.log('🧹 Script de nettoyage sécurisé de la base de données')
    console.log('')
    console.log('Usage:')
    console.log('  node cleanup-database.js                    # Nettoyage complet')
    console.log('  node cleanup-database.js --dry-run          # Simulation sans modifications')
    console.log('  node cleanup-database.js --no-backup        # Sans sauvegarde')
    console.log('  node cleanup-database.js --quiet            # Mode silencieux')
    console.log('  node cleanup-database.js --company <id>     # Entreprise spécifique')
    console.log('  node cleanup-database.js --help             # Afficher cette aide')
    console.log('')
    return
  }

  if (args.includes('--restore')) {
    const backupPath = args[args.findIndex(arg => arg === '--restore') + 1]
    if (!backupPath) {
      console.log('❌ Chemin de sauvegarde requis pour --restore')
      return
    }
    await restoreFromBackup(backupPath)
    return
  }

  await cleanupDatabase(options)
}

main().catch(console.error)
