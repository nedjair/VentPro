import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'

async function diagnoseSyncIssue() {
  try {
    console.log('🔍 DIAGNOSTIC DE SYNCHRONISATION DES ALERTES')
    console.log('==============================================')

    // 1. Récupérer l'entreprise
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. Vérifier les produits avec problèmes de stock
    console.log('\n📦 ANALYSE DES PRODUITS:')
    const products = await prisma.product.findMany({
      where: {
        companyId: company.id,
        isActive: true,
        isService: false,
      },
      orderBy: { name: 'asc' }
    })

    console.log(`Total produits actifs: ${products.length}`)

    let outOfStockCount = 0
    let lowStockCount = 0
    let overStockCount = 0
    let normalStockCount = 0

    for (const product of products) {
      const stockStatus = 
        product.stockQuantity === 0 ? 'RUPTURE' :
        product.stockQuantity <= (product.minStock || 0) && product.minStock > 0 ? 'STOCK_FAIBLE' :
        product.maxStock && product.stockQuantity > product.maxStock ? 'SURSTOCK' :
        'NORMAL'

      if (stockStatus === 'RUPTURE') outOfStockCount++
      else if (stockStatus === 'STOCK_FAIBLE') lowStockCount++
      else if (stockStatus === 'SURSTOCK') overStockCount++
      else normalStockCount++

      if (stockStatus !== 'NORMAL') {
        console.log(`   ${stockStatus}: ${product.name}`)
        console.log(`      Stock: ${product.stockQuantity}, Min: ${product.minStock}, Max: ${product.maxStock}`)
      }
    }

    console.log(`\n📊 COMPTAGE PRODUITS:`)
    console.log(`   - Rupture de stock: ${outOfStockCount}`)
    console.log(`   - Stock faible: ${lowStockCount}`)
    console.log(`   - Surstock: ${overStockCount}`)
    console.log(`   - Stock normal: ${normalStockCount}`)

    // 3. Vérifier les alertes en base de données
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

    console.log(`Total alertes actives: ${alerts.length}`)

    const alertsByType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('Par type:')
    Object.entries(alertsByType).forEach(([type, count]) => {
      console.log(`   - ${type}: ${count}`)
    })

    console.log('Par sévérité:')
    Object.entries(alertsBySeverity).forEach(([severity, count]) => {
      console.log(`   - ${severity}: ${count}`)
    })

    console.log('\nDétail des alertes:')
    alerts.forEach(alert => {
      console.log(`   ${alert.type} (${alert.severity}): ${alert.product.name}`)
      console.log(`      Stock actuel: ${alert.currentStock}, Seuil: ${alert.thresholdValue}`)
      console.log(`      Produit - Stock: ${alert.product.stockQuantity}, Min: ${alert.product.minStock}`)
    })

    // 4. Tester le service de dashboard
    console.log('\n📊 ANALYSE DU DASHBOARD SERVICE:')
    const dashboard = await StockService.getRealTimeDashboard(company.id)
    
    console.log('Dashboard retourné:')
    console.log(`   - Alertes actives: ${dashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${dashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${dashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${dashboard.alerts.info}`)

    // 5. Vérifier les requêtes SQL utilisées dans le dashboard
    console.log('\n🔍 VÉRIFICATION DES REQUÊTES SQL:')
    
    // Requête pour stock faible (comme dans le dashboard)
    const lowStockQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      WHERE p."companyId" = ${company.id}
        AND p."isActive" = true
        AND p."isService" = false
        AND p."stockQuantity" > 0
        AND p."stockQuantity" <= p."minStock"
        AND p."minStock" > 0
    `
    
    // Requête pour rupture de stock
    const outOfStockQuery = await prisma.product.count({
      where: {
        companyId: company.id,
        isService: false,
        isActive: true,
        stockQuantity: 0,
      }
    })

    // Requête pour surstock
    const overStockQuery = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM products p
      WHERE p."companyId" = ${company.id}
        AND p."isActive" = true
        AND p."isService" = false
        AND p."maxStock" IS NOT NULL
        AND p."stockQuantity" > p."maxStock"
    `

    console.log(`Requête stock faible: ${(lowStockQuery as any)[0]?.count || 0}`)
    console.log(`Requête rupture: ${outOfStockQuery}`)
    console.log(`Requête surstock: ${(overStockQuery as any)[0]?.count || 0}`)

    // 6. Comparer avec le comptage des alertes
    console.log('\n⚖️ COMPARAISON:')
    console.log('Produits vs Dashboard:')
    console.log(`   Rupture - Produits: ${outOfStockCount}, Dashboard: ${dashboard.alerts.critical}`)
    console.log(`   Stock faible - Produits: ${lowStockCount}, Dashboard: ${dashboard.alerts.warning}`)
    console.log(`   Surstock - Produits: ${overStockCount}, Dashboard: ${dashboard.alerts.info}`)

    console.log('Alertes DB vs Dashboard:')
    console.log(`   Total alertes DB: ${alerts.length}, Dashboard: ${dashboard.activity.activeAlerts}`)
    console.log(`   HIGH DB: ${alertsBySeverity.HIGH || 0}, Dashboard critical: ${dashboard.alerts.critical}`)
    console.log(`   MEDIUM DB: ${alertsBySeverity.MEDIUM || 0}, Dashboard warning: ${dashboard.alerts.warning}`)
    console.log(`   LOW DB: ${alertsBySeverity.LOW || 0}, Dashboard info: ${dashboard.alerts.info}`)

    // 7. Identifier les incohérences
    console.log('\n🚩 INCOHÉRENCES DÉTECTÉES:')
    
    if (outOfStockCount !== dashboard.alerts.critical) {
      console.log(`❌ Rupture: ${outOfStockCount} produits vs ${dashboard.alerts.critical} dashboard`)
    }
    
    if (lowStockCount !== dashboard.alerts.warning) {
      console.log(`❌ Stock faible: ${lowStockCount} produits vs ${dashboard.alerts.warning} dashboard`)
    }
    
    if (overStockCount !== dashboard.alerts.info) {
      console.log(`❌ Surstock: ${overStockCount} produits vs ${dashboard.alerts.info} dashboard`)
    }

    if (alerts.length !== dashboard.activity.activeAlerts) {
      console.log(`❌ Total alertes: ${alerts.length} DB vs ${dashboard.activity.activeAlerts} dashboard`)
    }

    // 8. Vérifier les alertes orphelines ou manquantes
    console.log('\n🔍 VÉRIFICATION DES ALERTES ORPHELINES:')
    
    for (const alert of alerts) {
      const product = alert.product
      const shouldHaveAlert = 
        (alert.type === 'OUT_OF_STOCK' && product.stockQuantity === 0) ||
        (alert.type === 'LOW_STOCK' && product.stockQuantity > 0 && product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0) ||
        (alert.type === 'OVERSTOCK' && product.maxStock && product.stockQuantity > product.maxStock)

      if (!shouldHaveAlert) {
        console.log(`❌ Alerte orpheline: ${alert.type} pour ${product.name}`)
        console.log(`   Stock: ${product.stockQuantity}, Min: ${product.minStock}, Max: ${product.maxStock}`)
      }
    }

    // 9. Vérifier les alertes manquantes
    for (const product of products) {
      const shouldHaveOutOfStock = product.stockQuantity === 0
      const shouldHaveLowStock = product.stockQuantity > 0 && product.stockQuantity <= (product.minStock || 0) && (product.minStock || 0) > 0
      const shouldHaveOverStock = product.maxStock && product.stockQuantity > product.maxStock

      if (shouldHaveOutOfStock) {
        const hasAlert = alerts.some(a => a.productId === product.id && a.type === 'OUT_OF_STOCK')
        if (!hasAlert) {
          console.log(`❌ Alerte manquante OUT_OF_STOCK pour: ${product.name}`)
        }
      }

      if (shouldHaveLowStock) {
        const hasAlert = alerts.some(a => a.productId === product.id && a.type === 'LOW_STOCK')
        if (!hasAlert) {
          console.log(`❌ Alerte manquante LOW_STOCK pour: ${product.name}`)
        }
      }

      if (shouldHaveOverStock) {
        const hasAlert = alerts.some(a => a.productId === product.id && a.type === 'OVERSTOCK')
        if (!hasAlert) {
          console.log(`❌ Alerte manquante OVERSTOCK pour: ${product.name}`)
        }
      }
    }

    console.log('\n✅ Diagnostic terminé!')

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseSyncIssue()
  .then(() => {
    console.log('\n🎯 Diagnostic terminé!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Diagnostic échoué:', error)
    process.exit(1)
  })

export { diagnoseSyncIssue }
