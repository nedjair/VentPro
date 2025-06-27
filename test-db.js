// Test de la base de données pour vérifier les companyId
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale'
    }
  }
});

async function testDatabase() {
  try {
    console.log('🔍 Vérification des entreprises dans la base de données...');
    
    const companies = await prisma.company.findMany();
    console.log('🏢 Entreprises trouvées:', companies.length);
    
    companies.forEach((company, index) => {
      console.log(`${index + 1}. ID: ${company.id}, Nom: ${company.name}`);
    });
    
    console.log('\n🔍 Vérification des clients...');
    const clients = await prisma.client.findMany({
      take: 5,
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    console.log('👥 Clients trouvés:', clients.length);
    clients.forEach((client, index) => {
      console.log(`${index + 1}. ${client.firstName || client.companyName} (Company: ${client.company?.name || 'N/A'})`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();
