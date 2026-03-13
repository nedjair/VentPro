import { StockAlertService } from '../services/stock-alert.service'
import { prisma, StockMovement, Product } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'
import { logger } from '../utils/logger'

async function createTestAlerts() {
  try {
    console.log('🧪 Création d\'alertes de test pour le frontend')
    console.log('==============================================')

    // 1. Récupérer une entreprise de test
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Créer plusieurs produits avec différents niveaux de stock
    const timestamp = Date.now()
    
    // Produit en rupture de stock
    const outOfStockProduct = await prisma.product.create({
      data: {
        name: `Produit Rupture ${timestamp}`,
        sku: `OUT-${timestamp}`,
        description: 'Produit en rupture de stock',
        price: 150,
        cost: 90,
        stockQuantity: 0, // Rupture
        minStock: 5,
        maxStock: 50,
        isActive: true,
        isService: false,
        companyId: company.id,
      },
    })

    // Produit en stock faible
    const lowStockProduct = await prisma.product.create({
      data: {
        name: `Produit Stock Faible ${timestamp}`,
        sku: `LOW-${timestamp}`,
        description: 'Produit en stock faible',
        price: 200,
        cost: 120,
        stockQuantity: 3, // Stock faible
        minStock: 10,
        maxStock: 100,
        isActive: true,
        isService: false,
        companyId: company.id,
      },
    })

    // Produit en surstock
    const overStockProduct = await prisma.product.create({
      data: {
        name: `Produit Surstock ${timestamp}`,
        sku: `OVER-${timestamp}`,
        description: 'Produit en surstock',
        price: 100,
        cost: 60,
        stockQuantity: 150, // Surstock
        minStock: 10,
        maxStock: 100,
        isActive: true,
        isService: false,
        companyId: company.id,
      },
    })

    console.log(`✅ Produits créés:`)
    console.log(`   - Rupture: ${outOfStockProduct.name} (Stock: ${outOfStockProduct.stockQuantity})`)
    console.log(`   - Stock faible: ${lowStockProduct.name} (Stock: ${lowStockProduct.stockQuantity})`)
    console.log(`   - Surstock: ${overStockProduct.name} (Stock: ${overStockProduct.stockQuantity})`)

    // 3. Générer les alertes automatiques
    console.log('\n🚨 Génération des alertes automatiques...')
    await StockAlertService.checkAndCreateAlerts(company.id)

    // 4. Vérifier les alertes créées
    const alerts = await StockAlertService.getAlerts(company.id, { isActive: true })
    console.log(`✅ Alertes créées: ${alerts.data.length}`)
    
    for (const alert of alerts.data) {
      console.log(`   - ${alert.type} (${alert.severity}): ${alert.product.name}`)
    }

    // 5. Afficher le tableau de bord
    console.log('\n📊 Tableau de bord mis à jour:')
    const dashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${dashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${dashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${dashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${dashboard.alerts.info}`)

    // 6. Créer une alerte manuelle supplémentaire
    console.log('\n📢 Création d\'une alerte manuelle...')
    const manualAlert = await StockAlertService.createAlert({
      type: 'EXPIRY_WARNING',
      severity: 'HIGH',
      title: 'Produits bientôt expirés',
      message: 'Attention: certains produits arrivent à expiration dans 30 jours',
      productId: lowStockProduct.id,
      currentStock: lowStockProduct.stockQuantity,
      thresholdValue: 30,
    }, company.id)
    console.log(`✅ Alerte manuelle créée: ${manualAlert.title}`)

    // 7. État final
    console.log('\n📊 État final du tableau de bord:')
    const finalDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${finalDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${finalDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${finalDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${finalDashboard.alerts.info}`)

    console.log('\n✅ Alertes de test créées avec succès!')
    console.log('🌐 Vous pouvez maintenant tester le frontend à: http://localhost:3000/stocks-realtime')
    console.log('\n📝 IDs des produits créés pour les tests:')
    console.log(`   - Rupture: ${outOfStockProduct.id}`)
    console.log(`   - Stock faible: ${lowStockProduct.id}`)
    console.log(`   - Surstock: ${overStockProduct.id}`)

    // 8. Attendre 30 secondes pour permettre au frontend de se synchroniser
    console.log('\n⏳ Attente de 30 secondes pour la synchronisation frontend...')
    await new Promise(resolve => setTimeout(resolve, 30000))

    // 9. Créer un nouveau mouvement pour tester la synchronisation temps réel
    console.log('\n🔄 Test de synchronisation temps réel - Création d\'un nouveau mouvement...')
    await StockService.createStockMovement({
      type: 'OUT',
      quantity: 2,
      productId: lowStockProduct.id,
      reference: 'TEST-SYNC-001',
      comment: 'Test synchronisation temps réel',
    }, company.id)

    console.log('✅ Mouvement créé - Le frontend devrait se mettre à jour automatiquement!')

    // 10. Afficher le nouveau tableau de bord
    const syncDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`📊 Nouveau tableau de bord:`)
    console.log(`   - Alertes actives: ${syncDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${syncDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${syncDashboard.alerts.warning}`)

  } catch (error) {
    console.error('❌ Erreur lors de la création des alertes de test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour nettoyer les alertes de test
async function cleanupTestAlerts() {
  try {
    console.log('🧹 Nettoyage des alertes de test...')

    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }

    // Supprimer les produits de test (cela supprimera automatiquement les alertes associées)
    const testProducts = await prisma.product.findMany({
      where: {
        companyId: company.id,
        OR: [
          { name: { contains: 'Produit Rupture' } },
          { name: { contains: 'Produit Stock Faible' } },
          { name: { contains: 'Produit Surstock' } },
        ],
      },
    })

    for (const product of testProducts) {
      // Supprimer les alertes
      await prisma.stockAlert.deleteMany({
        where: { productId: product.id }
      })
      
      // Supprimer les mouvements
      await prisma.stockMovement.deleteMany({
        where: { productId: product.id }
      })
      
      // Supprimer les stocks
      await prisma.stock.deleteMany({
        where: { productId: product.id }
      })
      
      // Supprimer le produit
      await prisma.product.delete({
        where: { id: product.id }
      })
      
      console.log(`✅ Produit supprimé: ${product.name}`)
    }

    console.log('✅ Nettoyage terminé')
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter selon l'argument
const action = process.argv[2]

if (action === 'cleanup') {
  cleanupTestAlerts()
    .then(() => {
      console.log('\n🎯 Nettoyage terminé!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Nettoyage échoué:', error)
      process.exit(1)
    })
} else {
  createTestAlerts()
    .then(() => {
      console.log('\n🎯 Création des alertes de test terminée!')
      console.log('💡 Pour nettoyer: npx tsx src/scripts/create-test-alerts.ts cleanup')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Création échouée:', error)
      process.exit(1)
    })
}

export { createTestAlerts, cleanupTestAlerts }
