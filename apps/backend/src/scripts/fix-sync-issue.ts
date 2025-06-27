import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'

async function fixSyncIssue() {
  try {
    console.log('🔧 CORRECTION DU PROBLÈME DE SYNCHRONISATION')
    console.log('============================================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. État avant correction
    console.log('\n📊 ÉTAT AVANT CORRECTION:')
    const beforeDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${beforeDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${beforeDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${beforeDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${beforeDashboard.alerts.info}`)

    const beforeAlerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: { select: { name: true } }
      }
    })

    console.log('\nAlertes actives avant:')
    beforeAlerts.forEach(alert => {
      console.log(`   - ${alert.type} (${alert.severity}): ${alert.product.name}`)
    })

    // 3. Forcer le nettoyage des alertes orphelines
    console.log('\n🧹 NETTOYAGE DES ALERTES ORPHELINES:')
    const cleanedCount = await StockAlertService.cleanupOrphanedAlerts(company.id)
    console.log(`✅ ${cleanedCount} alertes orphelines nettoyées`)

    // 4. Forcer la re-vérification des alertes
    console.log('\n🔄 RE-VÉRIFICATION DES ALERTES:')
    await StockAlertService.checkAndCreateAlerts(company.id)
    console.log('✅ Vérification terminée')

    // 5. État après correction
    console.log('\n📊 ÉTAT APRÈS CORRECTION:')
    const afterDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${afterDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${afterDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${afterDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${afterDashboard.alerts.info}`)

    const afterAlerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: { select: { name: true } }
      }
    })

    console.log('\nAlertes actives après:')
    afterAlerts.forEach(alert => {
      console.log(`   - ${alert.type} (${alert.severity}): ${alert.product.name}`)
    })

    // 6. Vérification finale
    console.log('\n✅ VÉRIFICATION FINALE:')
    
    // Compter les produits réellement en problème
    const products = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
      }
    })

    let outOfStockCount = 0
    let lowStockCount = 0
    let overStockCount = 0

    for (const product of products) {
      if (product.stockQuantity === 0) {
        outOfStockCount++
      } else if (product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0) {
        lowStockCount++
      } else if (product.maxStock && product.stockQuantity > product.maxStock) {
        overStockCount++
      }
    }

    console.log('Comparaison finale:')
    console.log(`   Rupture - Produits: ${outOfStockCount}, Dashboard: ${afterDashboard.alerts.critical}`)
    console.log(`   Stock faible - Produits: ${lowStockCount}, Dashboard: ${afterDashboard.alerts.warning}`)
    console.log(`   Surstock - Produits: ${overStockCount}, Dashboard: ${afterDashboard.alerts.info}`)

    const isFixed = 
      outOfStockCount === afterDashboard.alerts.critical &&
      lowStockCount === afterDashboard.alerts.warning &&
      overStockCount === afterDashboard.alerts.info

    if (isFixed) {
      console.log('\n🎉 PROBLÈME RÉSOLU ! La synchronisation est maintenant correcte.')
    } else {
      console.log('\n⚠️ Il reste des incohérences à corriger.')
    }

    // 7. Forcer la synchronisation complète des stocks
    console.log('\n🔄 SYNCHRONISATION COMPLÈTE DES STOCKS:')
    await StockService.unifyStockData(company.id)
    console.log('✅ Synchronisation des stocks terminée')

    // 8. Dashboard final
    console.log('\n📊 DASHBOARD FINAL:')
    const finalDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${finalDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${finalDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${finalDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${finalDashboard.alerts.info}`)

    console.log('\n✅ Correction terminée!')

  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixSyncIssue()
  .then(() => {
    console.log('\n🎯 Correction terminée avec succès!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Correction échouée:', error)
    process.exit(1)
  })

export { fixSyncIssue }
