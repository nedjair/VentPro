import { prisma } from '@gestion/database'
import { StockService } from '../services/stock.service'
import { StockAlertService } from '../services/stock-alert.service'
import { logger } from '../utils/logger'

async function testDashboardAlerts() {
  try {
    console.log('🧪 Test de synchronisation des alertes dans le tableau de bord')
    console.log('================================================================')

    // 1. Récupérer une entreprise de test
    const company = await prisma.company.findFirst()
    if (!company) {
      throw new Error('Aucune entreprise trouvée')
    }
    console.log(`✅ Entreprise: ${company.name}`)

    // 2. État initial du tableau de bord
    console.log('\n📊 État initial du tableau de bord...')
    const initialDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${initialDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${initialDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${initialDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${initialDashboard.alerts.info}`)

    // 3. Créer un produit de test avec stock faible
    const timestamp = Date.now()
    const testProduct = await prisma.product.create({
      data: {
        name: `Produit Test Alerte ${timestamp}`,
        sku: `TEST-ALERT-${timestamp}`,
        description: 'Produit pour tester les alertes',
        price: 100,
        cost: 60,
        stockQuantity: 5, // Stock faible
        minStock: 10,     // Seuil minimum
        maxStock: 50,
        isActive: true,
        isService: false,
        companyId: company.id,
      },
    })
    console.log(`✅ Produit créé avec stock faible: ${testProduct.name}`)
    console.log(`   - Stock actuel: ${testProduct.stockQuantity}`)
    console.log(`   - Seuil minimum: ${testProduct.minStock}`)

    // 4. Vérifier et créer les alertes automatiques
    console.log('\n🚨 Génération d\'alertes automatiques...')
    await StockAlertService.checkAndCreateAlerts(company.id)

    // 5. Vérifier les alertes créées
    const alerts = await StockAlertService.getAlerts(company.id, { isActive: true })
    console.log(`   - Nouvelles alertes créées: ${alerts.data.length}`)
    
    for (const alert of alerts.data) {
      console.log(`   - ${alert.type}: ${alert.title} (${alert.severity})`)
    }

    // 6. État du tableau de bord après création d'alertes
    console.log('\n📊 État du tableau de bord après création d\'alertes...')
    const updatedDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${updatedDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${updatedDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${updatedDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${updatedDashboard.alerts.info}`)

    // 7. Créer une rupture de stock pour tester les alertes critiques
    console.log('\n💥 Création d\'une rupture de stock...')
    await StockService.createStockMovement({
      type: 'OUT',
      quantity: 5, // Vider le stock
      productId: testProduct.id,
      reference: 'TEST-RUPTURE-001',
      comment: 'Test rupture de stock pour alertes',
    }, company.id)

    // 8. Vérifier les nouvelles alertes
    console.log('\n🚨 Vérification des alertes après rupture...')
    await StockAlertService.checkAndCreateAlerts(company.id)

    // 9. État final du tableau de bord
    console.log('\n📊 État final du tableau de bord...')
    const finalDashboard = await StockService.getRealTimeDashboard(company.id)
    console.log(`   - Alertes actives: ${finalDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes critiques: ${finalDashboard.alerts.critical}`)
    console.log(`   - Alertes warning: ${finalDashboard.alerts.warning}`)
    console.log(`   - Alertes info: ${finalDashboard.alerts.info}`)

    // 10. Comparaison des états
    console.log('\n📈 Comparaison des états...')
    console.log(`   - Alertes initiales: ${initialDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes après création produit: ${updatedDashboard.activity.activeAlerts}`)
    console.log(`   - Alertes après rupture: ${finalDashboard.activity.activeAlerts}`)
    console.log(`   - Différence: +${finalDashboard.activity.activeAlerts - initialDashboard.activity.activeAlerts}`)

    // 11. Test de l'API directement
    console.log('\n🔌 Test de l\'API dashboard directement...')
    const apiResponse = await fetch('http://localhost:3003/api/v1/stock/dashboard', {
      headers: {
        'Authorization': 'Bearer test-token', // Token de test
        'Content-Type': 'application/json'
      }
    })
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json()
      console.log(`   - API Response: ${JSON.stringify(apiData.data.activity, null, 2)}`)
    } else {
      console.log(`   - API Error: ${apiResponse.status} ${apiResponse.statusText}`)
    }

    // 12. Vérification directe en base de données
    console.log('\n🗄️ Vérification directe en base de données...')
    const dbAlertCount = await prisma.stockAlert.count({
      where: {
        companyId: company.id,
        isActive: true,
      },
    })
    console.log(`   - Alertes actives en DB: ${dbAlertCount}`)

    // 13. Détail des alertes en base
    const dbAlerts = await prisma.stockAlert.findMany({
      where: {
        companyId: company.id,
        isActive: true,
      },
      include: {
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
      },
    })

    console.log('\n📋 Détail des alertes en base:')
    for (const alert of dbAlerts) {
      console.log(`   - ${alert.type} (${alert.severity}): ${alert.product.name} - ${alert.title}`)
    }

    console.log('\n✅ Test terminé!')
    console.log('\n🧹 Nettoyage des données de test...')
    
    // Nettoyage
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
    console.error('❌ Erreur lors du test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le test si le script est appelé directement
if (require.main === module) {
  testDashboardAlerts()
    .then(() => {
      console.log('\n🎯 Test de synchronisation terminé!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Test échoué:', error)
      process.exit(1)
    })
}

export { testDashboardAlerts }
