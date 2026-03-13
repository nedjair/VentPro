#!/usr/bin/env tsx

/**
 * Test direct du service d'export
 */

import { ExportService } from '../src/services/export.service'
import { ClientService } from '../src/services/client.service'
import { OrderService } from '../src/services/order.service'
import { prisma } from '../src/lib/prisma'
import fs from 'fs'

async function testExportServiceDirect() {
  console.log('🧪 TEST DIRECT DU SERVICE D\'EXPORT')
  console.log('===================================\n')
  
  try {
    // 1. Récupérer des clients de test
    console.log('1. 📋 Récupération des clients...')
    const companyId = 'company-test'
    const { data: clients } = await ClientService.getClients(companyId, {})
    console.log(`✅ ${clients.length} clients récupérés`)
    
    if (clients.length === 0) {
      console.log('⚠️  Aucun client trouvé, impossible de tester l\'export')
      return false
    }
    
    // 2. Test export Excel clients
    console.log('\n2. 📊 Test export Excel clients...')
    try {
      const excelBuffer = await ExportService.generateClientsExcel(clients)
      console.log(`✅ Export Excel clients réussi (${excelBuffer.length} bytes)`)
      
      // Sauvegarder pour vérification
      fs.writeFileSync('test-exports/clients-direct.xlsx', excelBuffer)
      console.log('   Fichier sauvegardé: test-exports/clients-direct.xlsx')
    } catch (error: any) {
      console.log('❌ Export Excel clients échoué:', error.message)
      console.log('   Stack:', error.stack)
    }
    
    // 3. Test export PDF clients
    console.log('\n3. 📄 Test export PDF clients...')
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      if (!company) {
        console.log('❌ Entreprise non trouvée')
        return false
      }
      
      const pdfBuffer = await ExportService.generateClientsPdf(clients, company)
      console.log(`✅ Export PDF clients réussi (${pdfBuffer.length} bytes)`)
      
      fs.writeFileSync('test-exports/clients-direct.pdf', pdfBuffer)
      console.log('   Fichier sauvegardé: test-exports/clients-direct.pdf')
    } catch (error: any) {
      console.log('❌ Export PDF clients échoué:', error.message)
      console.log('   Stack:', error.stack)
    }
    
    // 4. Récupérer des commandes de test
    console.log('\n4. 🛒 Récupération des commandes...')
    const { data: orders } = await OrderService.getOrders(companyId, {})
    console.log(`✅ ${orders.length} commandes récupérées`)
    
    if (orders.length === 0) {
      console.log('⚠️  Aucune commande trouvée, impossible de tester l\'export')
      return true // On continue car les clients ont fonctionné
    }
    
    // 5. Test export Excel commandes
    console.log('\n5. 📊 Test export Excel commandes...')
    try {
      const excelBuffer = await ExportService.generateOrdersExcel(orders as any)
      console.log(`✅ Export Excel commandes réussi (${excelBuffer.length} bytes)`)
      
      fs.writeFileSync('test-exports/orders-direct.xlsx', excelBuffer)
      console.log('   Fichier sauvegardé: test-exports/orders-direct.xlsx')
    } catch (error: any) {
      console.log('❌ Export Excel commandes échoué:', error.message)
      console.log('   Stack:', error.stack)
    }
    
    // 6. Test export PDF commandes
    console.log('\n6. 📄 Test export PDF commandes...')
    try {
      const company = await prisma.company.findUnique({ where: { id: companyId } })
      const pdfBuffer = await ExportService.generateOrdersPdf(orders as any, company!)
      console.log(`✅ Export PDF commandes réussi (${pdfBuffer.length} bytes)`)
      
      fs.writeFileSync('test-exports/orders-direct.pdf', pdfBuffer)
      console.log('   Fichier sauvegardé: test-exports/orders-direct.pdf')
    } catch (error: any) {
      console.log('❌ Export PDF commandes échoué:', error.message)
      console.log('   Stack:', error.stack)
    }
    
    console.log('\n' + '='.repeat(50))
    console.log('🎯 RÉSUMÉ DU TEST DIRECT')
    console.log('✅ Test du service d\'export terminé')
    console.log('📁 Fichiers générés dans test-exports/')
    
    return true
    
  } catch (error: any) {
    console.error('❌ Erreur lors du test direct:', error.message)
    console.error('Stack:', error.stack)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  const success = await testExportServiceDirect()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
