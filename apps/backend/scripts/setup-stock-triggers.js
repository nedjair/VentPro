const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function setupStockTriggers() {
  console.log('🔧 Configuration des triggers de synchronisation automatique des stocks')
  console.log('=' .repeat(70))

  try {
    // Lire le fichier SQL des triggers
    const triggersPath = path.join(__dirname, '../database/triggers/stock-sync-triggers.sql')
    
    if (!fs.existsSync(triggersPath)) {
      console.log('❌ Fichier triggers non trouvé:', triggersPath)
      return
    }

    const triggersSql = fs.readFileSync(triggersPath, 'utf8')
    console.log('✅ Fichier triggers chargé')

    // Diviser le SQL en commandes individuelles
    const commands = triggersSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))

    console.log(`📝 ${commands.length} commandes SQL à exécuter`)

    // Exécuter chaque commande
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      
      // Ignorer les commentaires et commandes vides
      if (command.startsWith('--') || command.trim().length === 0) {
        continue
      }

      try {
        await prisma.$executeRawUnsafe(command)
        successCount++
        
        // Afficher le type de commande exécutée
        if (command.includes('CREATE OR REPLACE FUNCTION')) {
          const functionName = command.match(/FUNCTION\s+(\w+)/i)?.[1] || 'unknown'
          console.log(`   ✅ Fonction créée: ${functionName}`)
        } else if (command.includes('CREATE TRIGGER')) {
          const triggerName = command.match(/TRIGGER\s+(\w+)/i)?.[1] || 'unknown'
          console.log(`   ✅ Trigger créé: ${triggerName}`)
        } else if (command.includes('DROP TRIGGER')) {
          const triggerName = command.match(/TRIGGER\s+\w+\s+(\w+)/i)?.[1] || 'unknown'
          console.log(`   🗑️ Trigger supprimé: ${triggerName}`)
        } else if (command.includes('COMMENT ON')) {
          console.log(`   📝 Commentaire ajouté`)
        }
        
      } catch (error) {
        errorCount++
        console.log(`   ❌ Erreur commande ${i + 1}:`, error.message.split('\n')[0])
      }
    }

    console.log('\n📊 RÉSUMÉ DE L\'INSTALLATION')
    console.log('-'.repeat(40))
    console.log(`✅ Commandes réussies: ${successCount}`)
    console.log(`❌ Commandes échouées: ${errorCount}`)

    // Tester les triggers
    console.log('\n🧪 TEST DES TRIGGERS')
    console.log('-'.repeat(30))
    
    try {
      const testResult = await prisma.$queryRaw`SELECT test_stock_sync_triggers() as result`
      console.log('📋 Résultat des tests:', testResult[0]?.result || 'Aucun résultat')
    } catch (error) {
      console.log('❌ Erreur lors du test des triggers:', error.message)
    }

    // Vérifier l'état des triggers
    console.log('\n🔍 VÉRIFICATION DES TRIGGERS INSTALLÉS')
    console.log('-'.repeat(45))
    
    try {
      const triggers = await prisma.$queryRaw`
        SELECT 
          trigger_name,
          event_object_table,
          action_timing,
          event_manipulation
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public' 
        AND trigger_name LIKE '%sync%'
        ORDER BY event_object_table, trigger_name
      `
      
      if (triggers.length > 0) {
        console.log('📋 Triggers installés:')
        triggers.forEach(trigger => {
          console.log(`   • ${trigger.trigger_name} sur ${trigger.event_object_table} (${trigger.action_timing} ${trigger.event_manipulation})`)
        })
      } else {
        console.log('⚠️ Aucun trigger de synchronisation trouvé')
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification des triggers:', error.message)
    }

    // Vérifier les fonctions
    console.log('\n🔍 VÉRIFICATION DES FONCTIONS INSTALLÉES')
    console.log('-'.repeat(45))
    
    try {
      const functions = await prisma.$queryRaw`
        SELECT 
          routine_name,
          routine_type
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name LIKE '%sync%'
        ORDER BY routine_name
      `
      
      if (functions.length > 0) {
        console.log('📋 Fonctions installées:')
        functions.forEach(func => {
          console.log(`   • ${func.routine_name} (${func.routine_type})`)
        })
      } else {
        console.log('⚠️ Aucune fonction de synchronisation trouvée')
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification des fonctions:', error.message)
    }

    console.log('\n🎯 INSTALLATION TERMINÉE')
    console.log('=' .repeat(30))
    
    if (errorCount === 0) {
      console.log('✅ Tous les triggers de synchronisation sont installés et fonctionnels!')
      console.log('🔄 La synchronisation automatique est maintenant active au niveau base de données.')
      console.log('\n📝 Pour désactiver temporairement:')
      console.log('   ALTER TABLE products DISABLE TRIGGER trigger_sync_product_to_stock;')
      console.log('   ALTER TABLE stocks DISABLE TRIGGER trigger_sync_stock_to_product;')
      console.log('\n📝 Pour réactiver:')
      console.log('   ALTER TABLE products ENABLE TRIGGER trigger_sync_product_to_stock;')
      console.log('   ALTER TABLE stocks ENABLE TRIGGER trigger_sync_stock_to_product;')
    } else {
      console.log('⚠️ Installation partiellement réussie avec quelques erreurs.')
      console.log('🔍 Vérifiez les logs ci-dessus pour plus de détails.')
    }

  } catch (error) {
    console.error('❌ Erreur générale lors de l\'installation des triggers:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Fonction pour désinstaller les triggers
async function removeTriggers() {
  console.log('🗑️ Suppression des triggers de synchronisation...')
  
  try {
    const removeCommands = [
      'DROP TRIGGER IF EXISTS trigger_sync_product_to_stock ON products',
      'DROP TRIGGER IF EXISTS trigger_sync_stock_to_product ON stocks', 
      'DROP TRIGGER IF EXISTS trigger_log_product_sync ON products',
      'DROP TRIGGER IF EXISTS trigger_log_stock_sync ON stocks',
      'DROP FUNCTION IF EXISTS sync_product_to_stock()',
      'DROP FUNCTION IF EXISTS sync_stock_to_product()',
      'DROP FUNCTION IF EXISTS log_stock_sync()',
      'DROP FUNCTION IF EXISTS test_stock_sync_triggers()'
    ]

    for (const command of removeCommands) {
      try {
        await prisma.$executeRawUnsafe(command)
        console.log(`✅ ${command}`)
      } catch (error) {
        console.log(`⚠️ ${command} - ${error.message}`)
      }
    }

    console.log('✅ Suppression terminée')
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Gestion des arguments de ligne de commande
const args = process.argv.slice(2)

if (args.includes('--remove') || args.includes('-r')) {
  removeTriggers()
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('🔧 Script de gestion des triggers de synchronisation des stocks')
  console.log('')
  console.log('Usage:')
  console.log('  node setup-stock-triggers.js          # Installer les triggers')
  console.log('  node setup-stock-triggers.js --remove # Supprimer les triggers')
  console.log('  node setup-stock-triggers.js --help   # Afficher cette aide')
  console.log('')
} else {
  setupStockTriggers()
}
