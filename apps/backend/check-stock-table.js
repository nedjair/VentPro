const { PrismaClient } = require('@prisma/client')

async function checkStockTable() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Vérification de la table stocks...')
    
    // Essayer de faire une requête simple sur la table stocks
    try {
      const count = await prisma.stock.count()
      console.log('✅ Table stocks existe et accessible')
      console.log(`📊 Nombre de stocks: ${count}`)
      
      // Vérifier la structure
      const firstStock = await prisma.stock.findFirst({
        include: {
          product: true
        }
      })
      
      if (firstStock) {
        console.log('📋 Premier stock trouvé:', {
          id: firstStock.id,
          productName: firstStock.product?.name,
          quantite: firstStock.quantiteActuelle
        })
      } else {
        console.log('📋 Aucun stock trouvé (table vide)')
      }
      
    } catch (error) {
      if (error.code === 'P2021') {
        console.log('❌ Table stocks n\'existe pas dans la base de données')
        console.log('💡 Solution: Appliquer la migration')
        console.log('   npx prisma migrate deploy')
      } else {
        console.log('❌ Erreur lors de l\'accès à la table stocks:', error.message)
      }
    }
    
    // Vérifier les migrations
    console.log('\n🔍 Vérification des migrations...')
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        WHERE migration_name LIKE '%stock%'
        ORDER BY finished_at DESC
      `
      
      if (migrations.length > 0) {
        console.log('✅ Migrations de stock trouvées:')
        migrations.forEach(m => {
          console.log(`   - ${m.migration_name} (${m.finished_at})`)
        })
      } else {
        console.log('⚠️ Aucune migration de stock trouvée')
      }
    } catch (error) {
      console.log('⚠️ Impossible de vérifier les migrations:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkStockTable().catch(console.error)
