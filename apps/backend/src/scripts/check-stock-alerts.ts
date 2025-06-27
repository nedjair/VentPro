import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStockAlerts() {
  try {
    console.log('🔍 Vérification de l\'état des alertes de stock...\n')
    
    // 1. Vérifier les incohérences entre products et stocks
    const inconsistencies = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p."stockQuantity" as product_stock,
        s."quantiteActuelle" as stock_table_quantity,
        p."minStock",
        p."maxStock",
        CASE 
          WHEN p."stockQuantity" != COALESCE(s."quantiteActuelle", 0) THEN 'QUANTITY_MISMATCH'
          WHEN p."stockQuantity" < 0 THEN 'NEGATIVE_STOCK'
          WHEN p."stockQuantity" = 0 THEN 'OUT_OF_STOCK'
          WHEN p."stockQuantity" <= p."minStock" AND p."minStock" > 0 THEN 'LOW_STOCK'
          ELSE 'OK'
        END as issue_type
      FROM products p
      LEFT JOIN stocks s ON p.id = s."productId"
      WHERE p."isActive" = true 
        AND p."isService" = false
        AND (
          p."stockQuantity" != COALESCE(s."quantiteActuelle", 0)
          OR p."stockQuantity" < 0
          OR p."stockQuantity" = 0
          OR (p."stockQuantity" <= p."minStock" AND p."minStock" > 0)
        )
      ORDER BY 
        CASE 
          WHEN p."stockQuantity" < 0 THEN 1
          WHEN p."stockQuantity" = 0 THEN 2
          WHEN p."stockQuantity" != COALESCE(s."quantiteActuelle", 0) THEN 3
          ELSE 4
        END,
        p.name
    ` as any[]
    
    console.log(`📊 Incohérences trouvées: ${inconsistencies.length}`)
    
    if (inconsistencies.length > 0) {
      console.log('\n🚨 Détails des incohérences:')
      inconsistencies.forEach((item, index) => {
        console.log(`${index + 1}. ${item.name}`)
        console.log(`   - Stock produit: ${item.product_stock}`)
        console.log(`   - Stock table: ${item.stock_table_quantity || 'NULL'}`)
        console.log(`   - Seuil min: ${item.minStock || 'Non défini'}`)
        console.log(`   - Type: ${item.issue_type}`)
        console.log('')
      })
    } else {
      console.log('✅ Aucune incohérence détectée !')
    }
    
    // 2. Vérifier les alertes actives en base
    const activeAlerts = await prisma.stockAlert.findMany({
      where: {
        isActive: true
      },
      include: {
        product: {
          select: {
            name: true,
            stockQuantity: true,
            minStock: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log(`\n📢 Alertes actives en base: ${activeAlerts.length}`)
    
    if (activeAlerts.length > 0) {
      console.log('\n🔔 Détails des alertes actives:')
      activeAlerts.forEach((alert, index) => {
        console.log(`${index + 1}. ${alert.title}`)
        console.log(`   - Produit: ${alert.product?.name}`)
        console.log(`   - Stock actuel: ${alert.currentStock}`)
        console.log(`   - Stock produit: ${alert.product?.stockQuantity}`)
        console.log(`   - Seuil: ${alert.thresholdValue}`)
        console.log(`   - Type: ${alert.type}`)
        console.log(`   - Sévérité: ${alert.severity}`)
        console.log(`   - Créée: ${alert.createdAt.toLocaleString('fr-FR')}`)
        console.log('')
      })
    }
    
    // 3. Vérifier les produits qui devraient déclencher des alertes
    const shouldHaveAlerts = await prisma.$queryRaw`
      SELECT
        id,
        name,
        "stockQuantity",
        "minStock",
        "maxStock"
      FROM products
      WHERE "isActive" = true
        AND "isService" = false
        AND (
          "stockQuantity" = 0
          OR "stockQuantity" < 0
          OR ("minStock" > 0 AND "stockQuantity" <= "minStock")
        )
      ORDER BY "stockQuantity", name
    ` as any[]
    
    console.log(`\n⚠️ Produits qui devraient avoir des alertes: ${shouldHaveAlerts.length}`)
    
    if (shouldHaveAlerts.length > 0) {
      shouldHaveAlerts.forEach((product, index) => {
        console.log(`${index + 1}. ${product.name}`)
        console.log(`   - Stock: ${product.stockQuantity}`)
        console.log(`   - Seuil min: ${product.minStock || 'Non défini'}`)
        console.log('')
      })
    }
    
    // 4. Résumé
    console.log('\n📋 RÉSUMÉ:')
    console.log(`   - Incohérences détectées: ${inconsistencies.length}`)
    console.log(`   - Alertes actives en base: ${activeAlerts.length}`)
    console.log(`   - Produits nécessitant des alertes: ${shouldHaveAlerts.length}`)
    
    if (inconsistencies.length > 0 || activeAlerts.length > 0) {
      console.log('\n💡 RECOMMANDATIONS:')
      if (inconsistencies.length > 0) {
        console.log('   - Exécuter la correction automatique pour résoudre les incohérences')
      }
      if (activeAlerts.length > 0) {
        console.log('   - Désactiver temporairement les notifications ou corriger les stocks')
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkStockAlerts()
