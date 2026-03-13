import { StockAlertService } from '../services/stock-alert.service'
import { prisma } from '../lib/prisma'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'

async function diagnoseDashboardSync() {
  try {
    console.log('🔍 DIAGNOSTIC DE SYNCHRONISATION DASHBOARD')
    console.log('==========================================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Analyser l'état réel des produits
    console.log('\n📦 ANALYSE DES PRODUITS EN BASE:')
    const products = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
      },
      orderBy: { name: 'asc' }
    })

    console.log(`Total produits physiques actifs: ${products.length}`)

    let realOutOfStock = 0
    let realLowStock = 0
    let realOverStock = 0
    let realNormalStock = 0

    const productDetails: any[] = []

    for (const product of products) {
      let status = 'NORMAL'
      let alertType = null

      if (product.stockQuantity === 0) {
        status = 'RUPTURE'
        alertType = 'OUT_OF_STOCK'
        realOutOfStock++
      } else if (product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0) {
        status = 'STOCK_FAIBLE'
        alertType = 'LOW_STOCK'
        realLowStock++
      } else if (product.maxStock && product.stockQuantity > product.maxStock) {
        status = 'SURSTOCK'
        alertType = 'OVERSTOCK'
        realOverStock++
      } else {
        realNormalStock++
      }

      productDetails.push({
        name: product.name,
        stock: product.stockQuantity,
        min: product.minStock,
        max: product.maxStock,
        status,
        alertType
      })

      if (status !== 'NORMAL') {
        console.log(`   ${status}: ${product.name}`)
        console.log(`      Stock: ${product.stockQuantity}, Min: ${product.minStock}, Max: ${product.maxStock}`)
      }
    }

    console.log(`\n📊 COMPTAGE RÉEL DES PRODUITS:`)
    console.log(`   - Rupture de stock: ${realOutOfStock}`)
    console.log(`   - Stock faible: ${realLowStock}`)
    console.log(`   - Surstock: ${realOverStock}`)
    console.log(`   - Stock normal: ${realNormalStock}`)

    // 3. Analyser les alertes en base de données
    console.log('\n🚨 ANALYSE DES ALERTES EN BASE:')
    const alerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: {
          select: { name: true, stockQuantity: true, minStock: true, maxStock: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Total alertes actives en base: ${alerts.length}`)

    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('Alertes par type:')
    Object.entries(alertsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`)
    })

    console.log('Alertes par sévérité:')
    Object.entries(alertsBySeverity).forEach(([severity, count]) => {
      console.log(`   - ${severity}: ${count}`)
    })

    console.log('\nDétail des alertes:')
    alerts.forEach(alert => {
      console.log(`   ${alert.type} (${alert.severity}): ${alert.product.name}`)
      console.log(`      Stock alerte: ${alert.currentStock}, Seuil: ${alert.thresholdValue}`)
      console.log(`      Stock produit: ${alert.product.stockQuantity}, Min: ${alert.product.minStock}`)
    })

    // 4. Analyser le dashboard actuel
    console.log('\n📊 ANALYSE DU DASHBOARD ACTUEL:')
    const dashboard = await StockService.getRealTimeDashboard(company.id)
    
    console.log('Dashboard retourné:')
    console.log(`   - Total alertes actives: ${dashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${dashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${dashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${dashboard.alerts.info}`)

    // 5. Comparer les données
    console.log('\n⚖️ COMPARAISON DÉTAILLÉE:')
    
    console.log('PRODUITS vs ALERTES EN BASE:')
    console.log(`   Rupture - Produits: ${realOutOfStock}, Alertes OUT_OF_STOCK: ${alertsByType.OUT_OF_STOCK || 0}`)
    console.log(`   Stock faible - Produits: ${realLowStock}, Alertes LOW_STOCK: ${alertsByType.LOW_STOCK || 0}`)
    console.log(`   Surstock - Produits: ${realOverStock}, Alertes OVERSTOCK: ${alertsByType.OVERSTOCK || 0}`)

    console.log('\nPRODUITS vs DASHBOARD:')
    console.log(`   Rupture - Produits: ${realOutOfStock}, Dashboard critiques: ${dashboard.alerts.critical}`)
    console.log(`   Stock faible - Produits: ${realLowStock}, Dashboard warning: ${dashboard.alerts.warning}`)
    console.log(`   Surstock - Produits: ${realOverStock}, Dashboard info: ${dashboard.alerts.info}`)

    console.log('\nALERTES BASE vs DASHBOARD:')
    console.log(`   Total - Base: ${alerts.length}, Dashboard: ${dashboard.activity.activeAlerts}`)
    console.log(`   HIGH - Base: ${alertsBySeverity.HIGH || 0}, Dashboard critiques: ${dashboard.alerts.critical}`)
    console.log(`   MEDIUM - Base: ${alertsBySeverity.MEDIUM || 0}, Dashboard warning: ${dashboard.alerts.warning}`)
    console.log(`   LOW - Base: ${alertsBySeverity.LOW || 0}, Dashboard info: ${dashboard.alerts.info}`)

    // 6. Identifier les incohérences
    console.log('\n🚩 INCOHÉRENCES DÉTECTÉES:')
    
    const inconsistencies: string[] = []

    // Vérifier cohérence produits vs alertes
    if (realOutOfStock !== (alertsByType.OUT_OF_STOCK || 0)) {
      inconsistencies.push(`Rupture: ${realOutOfStock} produits vs ${alertsByType.OUT_OF_STOCK || 0} alertes`)
    }
    if (realLowStock !== (alertsByType.LOW_STOCK || 0)) {
      inconsistencies.push(`Stock faible: ${realLowStock} produits vs ${alertsByType.LOW_STOCK || 0} alertes`)
    }
    if (realOverStock !== (alertsByType.OVERSTOCK || 0)) {
      inconsistencies.push(`Surstock: ${realOverStock} produits vs ${alertsByType.OVERSTOCK || 0} alertes`)
    }

    // Vérifier cohérence alertes vs dashboard
    if (alerts.length !== dashboard.activity.activeAlerts) {
      inconsistencies.push(`Total alertes: ${alerts.length} base vs ${dashboard.activity.activeAlerts} dashboard`)
    }
    if ((alertsBySeverity.HIGH || 0) !== dashboard.alerts.critical) {
      inconsistencies.push(`Critiques: ${alertsBySeverity.HIGH || 0} base vs ${dashboard.alerts.critical} dashboard`)
    }
    if ((alertsBySeverity.MEDIUM || 0) !== dashboard.alerts.warning) {
      inconsistencies.push(`Warning: ${alertsBySeverity.MEDIUM || 0} base vs ${dashboard.alerts.warning} dashboard`)
    }
    if ((alertsBySeverity.LOW || 0) !== dashboard.alerts.info) {
      inconsistencies.push(`Info: ${alertsBySeverity.LOW || 0} base vs ${dashboard.alerts.info} dashboard`)
    }

    if (inconsistencies.length === 0) {
      console.log('✅ Aucune incohérence détectée - Le système est synchronisé!')
    } else {
      console.log('❌ Incohérences trouvées:')
      inconsistencies.forEach(inc => console.log(`   - ${inc}`))
    }

    // 7. Analyser les alertes orphelines ou manquantes
    console.log('\n🔍 ANALYSE DES ALERTES ORPHELINES/MANQUANTES:')
    
    let orphanedAlerts = 0
    let missingAlerts = 0

    // Vérifier les alertes orphelines
    for (const alert of alerts) {
      const product = alert.product
      let shouldHaveAlert = false

      switch (alert.type) {
        case 'OUT_OF_STOCK':
          shouldHaveAlert = product.stockQuantity === 0
          break
        case 'LOW_STOCK':
          shouldHaveAlert = product.stockQuantity > 0 && 
                           product.stockQuantity <= (product.minStock || 0) && 
                           (product.minStock || 0) > 0
          break
        case 'OVERSTOCK':
          shouldHaveAlert = product.maxStock !== null && 
                           product.stockQuantity > product.maxStock
          break
      }

      if (!shouldHaveAlert) {
        orphanedAlerts++
        console.log(`❌ Alerte orpheline: ${alert.type} pour ${product.name}`)
        console.log(`   Stock: ${product.stockQuantity}, Min: ${product.minStock}, Max: ${product.maxStock}`)
      }
    }

    // Vérifier les alertes manquantes
    for (const detail of productDetails) {
      if (detail.alertType) {
        const hasAlert = alerts.some(a => 
          a.product.name === detail.name && a.type === detail.alertType
        )
        if (!hasAlert) {
          missingAlerts++
          console.log(`❌ Alerte manquante: ${detail.alertType} pour ${detail.name}`)
          console.log(`   Stock: ${detail.stock}, Min: ${detail.min}, Max: ${detail.max}`)
        }
      }
    }

    console.log(`\nRésumé des problèmes:`)
    console.log(`   - Alertes orphelines: ${orphanedAlerts}`)
    console.log(`   - Alertes manquantes: ${missingAlerts}`)
    console.log(`   - Incohérences dashboard: ${inconsistencies.length}`)

    // 8. Recommandations
    console.log('\n💡 RECOMMANDATIONS:')
    if (orphanedAlerts > 0) {
      console.log('   1. Nettoyer les alertes orphelines')
    }
    if (missingAlerts > 0) {
      console.log('   2. Créer les alertes manquantes')
    }
    if (inconsistencies.length > 0) {
      console.log('   3. Corriger la logique de calcul du dashboard')
    }
    if (orphanedAlerts === 0 && missingAlerts === 0 && inconsistencies.length === 0) {
      console.log('   ✅ Le système est cohérent - Aucune action requise')
    }

    console.log('\n✅ Diagnostic terminé!')

    return {
      realCounts: { realOutOfStock, realLowStock, realOverStock, realNormalStock },
      alertCounts: alertsByType,
      dashboardCounts: dashboard.alerts,
      inconsistencies,
      orphanedAlerts,
      missingAlerts
    }

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseDashboardSync()
  .then((result) => {
    console.log('\n🎯 Diagnostic terminé!')
    if (result.inconsistencies.length > 0 || result.orphanedAlerts > 0 || result.missingAlerts > 0) {
      console.log('⚠️ Des problèmes ont été détectés - Correction nécessaire')
      process.exit(1)
    } else {
      console.log('✅ Système synchronisé - Aucun problème détecté')
      process.exit(0)
    }
  })
  .catch((error) => {
    console.error('\n💥 Diagnostic échoué:', error)
    process.exit(1)
  })

export { diagnoseDashboardSync }
