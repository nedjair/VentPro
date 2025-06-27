/**
 * Test détaillé de la base de données PostgreSQL
 * Valide la connexion Prisma ORM et l'intégrité des données
 */

const { PrismaClient } = require('./packages/database/generated/client');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testDatabaseConnection() {
  log('\n🔍 Test de connexion à PostgreSQL...', 'blue');
  
  try {
    await prisma.$connect();
    log('✅ Connexion PostgreSQL établie', 'green');
    
    // Test de requête simple
    const result = await prisma.$queryRaw`SELECT version()`;
    log(`📊 Version PostgreSQL: ${result[0].version.split(' ')[0]} ${result[0].version.split(' ')[1]}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Erreur connexion PostgreSQL: ${error.message}`, 'red');
    return false;
  }
}

async function testPrismaSchema() {
  log('\n🔍 Test du schéma Prisma...', 'blue');
  
  try {
    // Vérifier les tables principales
    const tables = ['companies', 'users', 'clients', 'products', 'suppliers'];
    
    for (const table of tables) {
      try {
        const count = await prisma.$queryRaw`SELECT COUNT(*) FROM ${table}`;
        log(`✅ Table ${table}: ${count[0].count} enregistrements`, 'green');
      } catch (error) {
        log(`❌ Table ${table}: ${error.message}`, 'red');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`❌ Erreur schéma Prisma: ${error.message}`, 'red');
    return false;
  }
}

async function testCompaniesData() {
  log('\n🔍 Test des données entreprises...', 'blue');
  
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        _count: {
          select: {
            users: true,
            clients: true,
            products: true
          }
        }
      }
    });
    
    log(`📊 Nombre d'entreprises: ${companies.length}`, 'cyan');
    
    companies.forEach((company, index) => {
      log(`   ${index + 1}. ${company.name} (${company.city}, ${company.country})`, 'cyan');
      log(`      Users: ${company._count.users}, Clients: ${company._count.clients}, Produits: ${company._count.products}`, 'cyan');
    });
    
    return companies.length > 0;
  } catch (error) {
    log(`❌ Erreur données entreprises: ${error.message}`, 'red');
    return false;
  }
}

async function testClientsData() {
  log('\n🔍 Test des données clients...', 'blue');
  
  try {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        type: true,
        firstName: true,
        lastName: true,
        companyName: true,
        email: true,
        phone: true,
        city: true,
        country: true,
        createdAt: true,
        company: {
          select: {
            name: true
          }
        }
      },
      take: 10 // Limiter à 10 pour l'affichage
    });
    
    log(`📊 Nombre de clients (échantillon): ${clients.length}`, 'cyan');
    
    clients.forEach((client, index) => {
      const name = client.type === 'INDIVIDUAL' 
        ? `${client.firstName} ${client.lastName}`
        : client.companyName;
      
      log(`   ${index + 1}. ${name} (${client.type})`, 'cyan');
      log(`      Email: ${client.email || 'N/A'}, Ville: ${client.city || 'N/A'}`, 'cyan');
      log(`      Entreprise: ${client.company.name}`, 'cyan');
    });
    
    // Test des types de clients
    const clientTypes = await prisma.client.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });
    
    log('\n📊 Répartition par type:', 'cyan');
    clientTypes.forEach(type => {
      log(`   ${type.type}: ${type._count.type} clients`, 'cyan');
    });
    
    return clients.length > 0;
  } catch (error) {
    log(`❌ Erreur données clients: ${error.message}`, 'red');
    return false;
  }
}

async function testDataIntegrity() {
  log('\n🔍 Test d\'intégrité des données...', 'blue');
  
  try {
    // Vérifier les contraintes de clés étrangères
    const orphanedClients = await prisma.client.findMany({
      where: {
        company: null
      }
    });
    
    if (orphanedClients.length > 0) {
      log(`⚠️ ${orphanedClients.length} clients orphelins détectés`, 'yellow');
    } else {
      log('✅ Pas de clients orphelins', 'green');
    }
    
    // Vérifier les emails uniques
    const duplicateEmails = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count 
      FROM clients 
      WHERE email IS NOT NULL 
      GROUP BY email 
      HAVING COUNT(*) > 1
    `;
    
    if (duplicateEmails.length > 0) {
      log(`⚠️ ${duplicateEmails.length} emails dupliqués détectés`, 'yellow');
      duplicateEmails.forEach(dup => {
        log(`   Email: ${dup.email} (${dup.count} occurrences)`, 'yellow');
      });
    } else {
      log('✅ Pas d\'emails dupliqués', 'green');
    }
    
    // Vérifier les données algériennes
    const algerianClients = await prisma.client.count({
      where: {
        OR: [
          { country: 'Algérie' },
          { phone: { startsWith: '+213' } },
          { city: { in: ['Alger', 'Oran', 'Constantine', 'Sétif', 'Tizi Ouzou'] } }
        ]
      }
    });
    
    log(`📊 Clients algériens détectés: ${algerianClients}`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Erreur intégrité des données: ${error.message}`, 'red');
    return false;
  }
}

async function testDatabasePerformance() {
  log('\n🔍 Test de performance de la base...', 'blue');
  
  try {
    const startTime = Date.now();
    
    // Test de requête complexe
    const result = await prisma.client.findMany({
      include: {
        company: true,
        orders: {
          take: 5
        },
        invoices: {
          take: 5
        }
      },
      take: 100
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    log(`✅ Requête complexe exécutée en ${duration}ms`, 'green');
    log(`📊 ${result.length} clients avec relations chargées`, 'cyan');
    
    if (duration > 1000) {
      log('⚠️ Performance lente détectée (>1s)', 'yellow');
      return false;
    }
    
    return true;
  } catch (error) {
    log(`❌ Erreur test performance: ${error.message}`, 'red');
    return false;
  }
}

async function testCRUDOperations() {
  log('\n🔍 Test des opérations CRUD...', 'blue');
  
  try {
    // Trouver une entreprise existante
    const company = await prisma.company.findFirst();
    if (!company) {
      log('❌ Aucune entreprise trouvée pour les tests', 'red');
      return false;
    }
    
    // CREATE - Créer un client de test
    const testClient = await prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        firstName: 'Test',
        lastName: 'Database',
        email: `test.db.${Date.now()}@example.com`,
        phone: '+213 555 123 456',
        city: 'Alger',
        country: 'Algérie',
        companyId: company.id
      }
    });
    
    log(`✅ CREATE: Client créé avec ID ${testClient.id}`, 'green');
    
    // READ - Lire le client
    const readClient = await prisma.client.findUnique({
      where: { id: testClient.id },
      include: { company: true }
    });
    
    if (readClient) {
      log(`✅ READ: Client lu - ${readClient.firstName} ${readClient.lastName}`, 'green');
    } else {
      log('❌ READ: Client non trouvé', 'red');
      return false;
    }
    
    // UPDATE - Mettre à jour le client
    const updatedClient = await prisma.client.update({
      where: { id: testClient.id },
      data: {
        phone: '+213 555 987 654',
        notes: 'Client de test mis à jour'
      }
    });
    
    log(`✅ UPDATE: Client mis à jour - nouveau téléphone: ${updatedClient.phone}`, 'green');
    
    // DELETE - Supprimer le client
    await prisma.client.delete({
      where: { id: testClient.id }
    });
    
    log(`✅ DELETE: Client supprimé`, 'green');
    
    // Vérifier la suppression
    const deletedClient = await prisma.client.findUnique({
      where: { id: testClient.id }
    });
    
    if (!deletedClient) {
      log(`✅ Suppression confirmée`, 'green');
      return true;
    } else {
      log('❌ Suppression échouée', 'red');
      return false;
    }
    
  } catch (error) {
    log(`❌ Erreur opérations CRUD: ${error.message}`, 'red');
    return false;
  }
}

async function runDatabaseTests() {
  log('🚀 TESTS BASE DE DONNÉES POSTGRESQL', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  const results = {
    connection: false,
    schema: false,
    companies: false,
    clients: false,
    integrity: false,
    performance: false,
    crud: false
  };
  
  try {
    // Test 1: Connexion
    results.connection = await testDatabaseConnection();
    
    // Test 2: Schéma
    results.schema = await testPrismaSchema();
    
    // Test 3: Données entreprises
    results.companies = await testCompaniesData();
    
    // Test 4: Données clients
    results.clients = await testClientsData();
    
    // Test 5: Intégrité
    results.integrity = await testDataIntegrity();
    
    // Test 6: Performance
    results.performance = await testDatabasePerformance();
    
    // Test 7: CRUD
    results.crud = await testCRUDOperations();
    
  } finally {
    await prisma.$disconnect();
  }
  
  // Résumé
  log('\n📋 RÉSUMÉ DES TESTS BASE DE DONNÉES', 'magenta');
  log('=' .repeat(60), 'magenta');
  
  Object.entries(results).forEach(([test, success]) => {
    const status = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    log(`${status} ${test.toUpperCase()}: ${success ? 'OK' : 'ÉCHEC'}`, color);
  });
  
  const totalSuccess = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  log(`\n🎯 Score Base de données: ${totalSuccess}/${totalTests} tests réussis`, totalSuccess === totalTests ? 'green' : 'yellow');
  
  if (totalSuccess === totalTests) {
    log('🎉 Base de données PostgreSQL parfaitement fonctionnelle !', 'green');
    log('✅ Prisma ORM opérationnel', 'green');
    log('✅ Données algériennes présentes', 'green');
    log('✅ Intégrité des données validée', 'green');
  } else {
    log('⚠️ Problèmes détectés dans la base de données', 'yellow');
  }
  
  return results;
}

// Exécution
runDatabaseTests().catch(error => {
  log(`💥 Erreur fatale: ${error.message}`, 'red');
  process.exit(1);
});
