// Test direct de la récupération des clients via Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale'
    }
  }
});

async function testClientsDirectly() {
  try {
    console.log('🔍 Test direct de récupération des clients...');
    
    // Test avec le companyId du token
    const companyId = 'cmc5ai3bz00006s97c92d77ps';
    console.log('🏢 CompanyId utilisé:', companyId);
    
    // Test simple de count
    console.log('\n📊 Test de count...');
    const totalClients = await prisma.client.count({
      where: { companyId }
    });
    console.log('✅ Total clients pour cette entreprise:', totalClients);
    
    // Test de récupération avec pagination
    console.log('\n📋 Test de récupération avec pagination...');
    const clients = await prisma.client.findMany({
      where: { companyId },
      take: 10,
      skip: 0,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('✅ Clients récupérés:', clients.length);
    
    if (clients.length > 0) {
      console.log('\n👤 Premier client:');
      const firstClient = clients[0];
      console.log('- ID:', firstClient.id);
      console.log('- Type:', firstClient.type);
      console.log('- Nom:', firstClient.firstName || firstClient.companyName);
      console.log('- Email:', firstClient.email);
      console.log('- Ville:', firstClient.city);
    }
    
    // Test avec l'autre companyId
    console.log('\n🔍 Test avec l\'autre entreprise...');
    const otherCompanyId = 'company-gctpe';
    const otherClients = await prisma.client.count({
      where: { companyId: otherCompanyId }
    });
    console.log('✅ Clients pour GC TPE SARL:', otherClients);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error('📋 Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testClientsDirectly();
