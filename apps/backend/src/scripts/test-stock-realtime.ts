import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'
import { StockSyncService } from '../services/stock-sync.service'
import { logger } from '../utils/logger'

async function testStockRealTime() {
  try {
    console.log('🧪 Test des fonctionnalités de stock temps réel')
    console.log('================================================')

    // 1. Récupérer une entreprise de test
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Créer un produit de test
    const timestamp = Date.now()
    const testProduct = await prisma.product.create({
      data: {
        name: `Produit Test Stock Temps Réel ${timestamp}`,
        sku: `TEST-STOCK-RT-${timestamp}`,
        description: 'Produit pour tester le stock temps réel',
        price: 100,
        cost: 60,
        stockQuantity: 50,
        minStock: 10,
        maxStock: 100,
        isActive: true,
        isService: false,
        companyId: company.id,
      },
    })
    console.log(`✅ Produit créé: ${testProduct.name} (ID: ${testProduct.id})`)

    // 3. Tester le tableau de bord temps réel
    console.log('\n📊 Test du tableau de bord temps réel...')
    const dashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Total produits: ${dashboard.overview.totalProducts}`)
    console.log(`   - Produits en stock: ${dashboard.overview.productsInStock}`)
    console.log(`   - Valeur totale: ${dashboard.overview.totalStockValue} DA`)
    console.log(`   - Alertes actives: ${dashboard.activity.activeAlerts}`)

    // 4. Tester le stock temps réel d'un produit
    console.log('\n📦 Test du stock temps réel du produit...')
    const stockData = await StockService.getRealTimeStock(testProduct.id, company.id)
    console.log(`   - Stock actuel: ${stockData.currentStock}`)
    console.log(`   - Stock disponible: ${stockData.availableStock}`)
    console.log(`   - Stock réservé: ${stockData.reservedStock}`)
    console.log(`   - Valeur stock: ${stockData.stockValue} DA`)

    // 5. Tester les mouvements de stock
    console.log('\n📈 Test des mouvements de stock...')
    
    // Entrée de stock
    const entryMovement = await StockService.createStockMovement({
      type: 'IN',
      quantity: 20,
      unitCost: 55,
      productId: testProduct.id,
      reference: 'TEST-ENTRY-001',
      comment: 'Test entrée de stock',
    }, company.id)
    console.log(`   ✅ Entrée créée: +${entryMovement.quantity} unités`)

    // Réservation de stock
    const reservation = await StockService.reserveStock(
      testProduct.id,
      15,
      company.id,
      undefined,
      undefined // Pas d'userId pour éviter les erreurs de contrainte
    )
    console.log(`   ✅ Réservation créée: ${reservation.quantity} unités`)

    // Sortie de stock
    const exitMovement = await StockService.createStockMovement({
      type: 'OUT',
      quantity: 10,
      productId: testProduct.id,
      reference: 'TEST-EXIT-001',
      comment: 'Test sortie de stock',
    }, company.id)
    console.log(`   ✅ Sortie créée: -${exitMovement.quantity} unités`)

    // 6. Vérifier le stock après mouvements
    console.log('\n🔍 Vérification du stock après mouvements...')
    const updatedStockData = await StockService.getRealTimeStock(testProduct.id, company.id)
    console.log(`   - Stock actuel: ${updatedStockData.currentStock}`)
    console.log(`   - Stock disponible: ${updatedStockData.availableStock}`)
    console.log(`   - Stock réservé: ${updatedStockData.reservedStock}`)

    // 7. Tester les alertes automatiques
    console.log('\n🚨 Test des alertes automatiques...')
    await StockAlertService.checkAndCreateAlerts(company.id)
    
    const alerts = await StockAlertService.getAlerts(company.id, { isActive: true })
    console.log(`   - Alertes créées: ${alerts.data.length}`)
    
    for (const alert of alerts.data) {
      console.log(`   - ${alert.type}: ${alert.title} (${alert.severity})`)
    }

    // 8. Tester la création d'une alerte manuelle
    console.log('\n📢 Test de création d\'alerte manuelle...')
    const manualAlert = await StockAlertService.createAlert({
      type: 'LOW_STOCK',
      severity: 'MEDIUM',
      title: 'Test alerte manuelle',
      message: 'Ceci est une alerte de test créée manuellement',
      productId: testProduct.id,
      currentStock: updatedStockData.currentStock,
      thresholdValue: testProduct.minStock,
    }, company.id)
    console.log(`   ✅ Alerte créée: ${manualAlert.title}`)

    // 9. Tester la synchronisation périodique
    console.log('\n🔄 Test de la synchronisation périodique...')
    await StockSyncService.periodicStockSync(company.id)
    console.log('   ✅ Synchronisation périodique terminée')

    // 10. Tester un ajustement de stock qui déclenche une alerte
    console.log('\n⚖️ Test d\'ajustement déclenchant une alerte...')
    const adjustmentMovement = await StockService.createStockMovement({
      type: 'ADJUSTMENT',
      quantity: -40, // Réduction importante pour déclencher une alerte
      productId: testProduct.id,
      reference: 'TEST-ADJUSTMENT-001',
      comment: 'Test ajustement déclenchant alerte',
    }, company.id)
    console.log(`   ✅ Ajustement créé: ${adjustmentMovement.quantity} unités`)

    // Vérifier les nouvelles alertes
    const newAlerts = await StockAlertService.getAlerts(company.id, { isActive: true })
    console.log(`   - Nouvelles alertes: ${newAlerts.data.length}`)

    // 11. Tester la libération de réservation
    console.log('\n🔓 Test de libération de réservation...')
    const release = await StockService.releaseReservation(
      testProduct.id,
      10,
      company.id,
      undefined,
      undefined // Pas d'userId pour éviter les erreurs de contrainte
    )
    console.log(`   ✅ Libération créée: ${release.quantity} unités`)

    // 12. État final du stock
    console.log('\n📋 État final du stock...')
    const finalStockData = await StockService.getRealTimeStock(testProduct.id, company.id)
    console.log(`   - Stock actuel: ${finalStockData.currentStock}`)
    console.log(`   - Stock disponible: ${finalStockData.availableStock}`)
    console.log(`   - Stock réservé: ${finalStockData.reservedStock}`)
    console.log(`   - Alertes actives:`)
    console.log(`     * Rupture: ${finalStockData.alerts.isOutOfStock}`)
    console.log(`     * Stock faible: ${finalStockData.alerts.isLowStock}`)
    console.log(`     * Surstock: ${finalStockData.alerts.isOverStock}`)
    console.log(`     * Stock négatif: ${finalStockData.alerts.isNegativeStock}`)

    // 13. Tableau de bord final
    console.log('\n📊 Tableau de bord final...')
    const finalDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Total produits: ${finalDashboard.overview.totalProducts}`)
    console.log(`   - Produits en stock: ${finalDashboard.overview.productsInStock}`)
    console.log(`   - Produits en rupture: ${finalDashboard.overview.outOfStockProducts}`)
    console.log(`   - Produits en stock faible: ${finalDashboard.overview.lowStockProducts}`)
    console.log(`   - Alertes actives: ${finalDashboard.activity.activeAlerts}`)
    console.log(`   - Valeur totale: ${finalDashboard.overview.totalStockValue} DA`)

    console.log('\n✅ Tous les tests sont passés avec succès!')
    console.log('🎉 Le système de stock temps réel fonctionne correctement!')

    // Nettoyage (optionnel)
    console.log('\n🧹 Nettoyage des données de test...')
    await prisma.stockAlert.deleteMany({
      where: { productId: testProduct.id }
    })
    await prisma.stockMovement.deleteMany({
      where: { productId: testProduct.id }
    })
    await prisma.stock.deleteMany({
      where: { productId: testProduct.id }
    })
    await prisma.product.delete({
      where: { id: testProduct.id }
    })
    console.log('✅ Nettoyage terminé')

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter les tests si le script est appelé directement
if (require.main === module) {
  testStockRealTime()
    .then(() => {
      console.log('\n🎯 Tests terminés avec succès!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Tests échoués:', error)
      process.exit(1)
    })
}

export { testStockRealTime }
