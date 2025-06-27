// Test de connectivité avec le client Prisma du backend
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testPrismaConnection() {
  try {
    console.log('🔍 Test de connexion Prisma Backend...');
    
    // Test de connexion
    await prisma.$connect();
    console.log('✅ Connexion Prisma réussie');
    
    // Test de lecture des companies
    const companies = await prisma.company.findMany({
      take: 1
    });
    console.log('📊 Companies trouvées:', companies.length);
    
    if (companies.length > 0) {
      console.log('🏢 Première company:', companies[0].name);
      
      // Test de lecture des clients
      const clients = await prisma.client.findMany({
        where: {
          companyId: companies[0].id
        },
        take: 3
      });
      console.log('👥 Clients trouvés:', clients.length);
      
      // Test de lecture des produits
      const products = await prisma.product.findMany({
        where: {
          companyId: companies[0].id
        },
        take: 3
      });
      console.log('📦 Produits trouvés:', products.length);
    }
    
    console.log('✅ Tous les tests Prisma réussis !');
    
  } catch (error) {
    console.error('❌ Erreur Prisma:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaConnection();
