import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'

async function testRealtimeSync() {
  try {
    console.log('🧪 TEST DE SYNCHRONISATION EN TEMPS RÉEL')
    console.log('========================================')

    // 1. Récupérer l'entreprise et un produit de test
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }

    const testProduct = await prisma.product.findFirst({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
        name: { contains: 'Stock Faible' }
      }
    })

    if (!testProduct) {
      throw new Error('Produit de test non trouvé')
    }

    console.log(`✅ Entreprise: ${company.name}`)
    console.log(`✅ Produit de test: ${testProduct.name}`)
    console.log(`   Stock initial: ${testProduct.stockQuantity}, Min: ${testProduct.minStock}, Max: ${testProduct.maxStock}`)

    // 2. État initial du dashboard
    console.log('\n📊 ÉTAT INITIAL DU DASHBOARD:')
    const initialDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${initialDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${initialDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${initialDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${initialDashboard.alerts.info}`)

    // 3. Test 1: Augmenter le stock pour sortir de l'alerte stock faible
    console.log('\n🔄 TEST 1: Augmentation du stock (sortir de l\'alerte)')
    const newStock1 = (testProduct.minStock || 10) + 5 // Au-dessus du seuil minimum
    
    await StockService.adjustStock({
      productId: testProduct.id,
      newQuantity: newStock1,
      comment: 'Test synchronisation temps réel',
    }, company.id)

    console.log(`   Stock mis à jour: ${testProduct.stockQuantity} → ${newStock1}`)

    // Vérifier le dashboard après mise à jour
    const dashboard1 = await StockService.getRealTimeDashboard(company.id)
    console.log('   Dashboard après augmentation:')
    console.log(`     - Alertes actives: ${dashboard1.activity.activeAlerts}`)
    console.log(`     - Alertes critiques: ${dashboard1.alerts.critical}`)
    console.log(`     - Alertes warning: ${dashboard1.alerts.warning}`)
    console.log(`     - Alertes info: ${dashboard1.alerts.info}`)

    // 4. Test 2: Réduire le stock à 0 (créer une alerte rupture)
    console.log('\n🔄 TEST 2: Réduction du stock à 0 (créer alerte rupture)')
    
    await StockService.adjustStock({
      productId: testProduct.id,
      newQuantity: 0,
      comment: 'Test création alerte rupture',
    }, company.id)

    console.log(`   Stock mis à jour: ${newStock1} → 0`)

    // Vérifier le dashboard après mise à jour
    const dashboard2 = await StockService.getRealTimeDashboard(company.id)
    console.log('   Dashboard après réduction à 0:')
    console.log(`     - Alertes actives: ${dashboard2.activity.activeAlerts}`)
    console.log(`     - Alertes critiques: ${dashboard2.alerts.critical}`)
    console.log(`     - Alertes warning: ${dashboard2.alerts.warning}`)
    console.log(`     - Alertes info: ${dashboard2.alerts.info}`)

    // 5. Test 3: Remettre le stock à un niveau normal
    console.log('\n🔄 TEST 3: Remise du stock à niveau normal')
    const normalStock = Math.floor(((testProduct.minStock || 10) + (testProduct.maxStock || 100)) / 2)
    
    await StockService.adjustStock({
      productId: testProduct.id,
      newQuantity: normalStock,
      comment: 'Remise à niveau normal',
    }, company.id)

    console.log(`   Stock mis à jour: 0 → ${normalStock}`)

    // Vérifier le dashboard final
    const dashboardFinal = await StockService.getRealTimeDashboard(company.id)
    console.log('   Dashboard final:')
    console.log(`     - Alertes actives: ${dashboardFinal.activity.activeAlerts}`)
    console.log(`     - Alertes critiques: ${dashboardFinal.alerts.critical}`)
    console.log(`     - Alertes warning: ${dashboardFinal.alerts.warning}`)
    console.log(`     - Alertes info: ${dashboardFinal.alerts.info}`)

    // 6. Vérification des alertes en base
    console.log('\n🔍 VÉRIFICATION DES ALERTES EN BASE:')
    const finalAlerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: { select: { name: true, stockQuantity: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Total alertes actives: ${finalAlerts.length}`)
    finalAlerts.forEach(alert => {
      console.log(`   - ${alert.type} (${alert.severity}): ${alert.product.name} (Stock: ${alert.product.stockQuantity})`)
    })

    // 7. Test des temps de réponse
    console.log('\n⏱️ TEST DES TEMPS DE RÉPONSE:')
    const startTime = Date.now()
    
    for (let i = 0; i < 5; i++) {
      const testStart = Date.now()
      await StockService.getRealTimeDashboard(company.id)
      const testEnd = Date.now()
      console.log(`   Appel ${i + 1}: ${testEnd - testStart}ms`)
    }
    
    const totalTime = Date.now() - startTime
    const avgTime = totalTime / 5
    console.log(`   Temps moyen: ${avgTime.toFixed(2)}ms`)
    
    if (avgTime < 2000) {
      console.log('   ✅ Objectif <2s respecté!')
    } else {
      console.log('   ⚠️ Temps de réponse supérieur à 2s')
    }

    // 8. Remettre le produit dans son état initial
    console.log('\n🔄 REMISE À L\'ÉTAT INITIAL:')
    await StockService.adjustStock({
      productId: testProduct.id,
      newQuantity: testProduct.stockQuantity,
      comment: 'Remise à l\'état initial après test',
    }, company.id)

    console.log(`   Stock remis à: ${testProduct.stockQuantity}`)

    console.log('\n✅ Test de synchronisation temps réel terminé!')

  } catch (error) {
    console.error('❌ Erreur lors du test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

testRealtimeSync()
  .then(() => {
    console.log('\n🎯 Test terminé avec succès!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Test échoué:', error)
    process.exit(1)
  })

export { testRealtimeSync }
