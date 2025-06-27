/**
 * Script de test pour vérifier les données dans PostgreSQL
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabaseData() {
  try {
    console.log('🔍 Test des données dans PostgreSQL...\n');

    // Test de connexion
    console.log('📡 Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Compter les données dans chaque table
    console.log('📊 Comptage des données par table:');
    
    const clientsCount = await prisma.client.count();
    console.log(`   Clients: ${clientsCount}`);
    
    const productsCount = await prisma.product.count();
    console.log(`   Produits: ${productsCount}`);
    
    const suppliersCount = await prisma.supplier.count();
    console.log(`   Fournisseurs: ${suppliersCount}`);
    
    const ordersCount = await prisma.order.count();
    console.log(`   Commandes: ${ordersCount}`);
    
    const invoicesCount = await prisma.invoice.count();
    console.log(`   Factures: ${invoicesCount}`);

    const companiesCount = await prisma.company.count();
    console.log(`   Entreprises: ${companiesCount}\n`);

    // Afficher quelques exemples de données
    if (clientsCount > 0) {
      console.log('👥 Exemples de clients:');
      const clients = await prisma.client.findMany({
        take: 3,
        select: {
          id: true,
          type: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
          city: true,
          companyId: true
        }
      });
      clients.forEach((client, index) => {
        console.log(`   ${index + 1}. ${client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`} (${client.email}) - Company: ${client.companyId}`);
      });
      console.log('');
    }

    if (productsCount > 0) {
      console.log('📦 Exemples de produits:');
      const products = await prisma.product.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          companyId: true
        }
      });
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} - ${product.price} DA (Stock: ${product.stock}) - Company: ${product.companyId}`);
      });
      console.log('');
    }

    if (companiesCount > 0) {
      console.log('🏢 Exemples d\'entreprises:');
      const companies = await prisma.company.findMany({
        take: 3,
        select: {
          id: true,
          name: true,
          email: true
        }
      });
      companies.forEach((company, index) => {
        console.log(`   ${index + 1}. ${company.name} (${company.email}) - ID: ${company.id}`);
      });
      console.log('');
    }

    // Test d'une requête similaire à celle utilisée dans l'export
    if (companiesCount > 0 && clientsCount > 0) {
      console.log('🔍 Test de requête d\'export (similaire au backend):');
      const companies = await prisma.company.findMany({ take: 1 });
      const testCompanyId = companies[0].id;
      
      console.log(`   Test avec companyId: ${testCompanyId}`);
      
      const clientsForExport = await prisma.client.findMany({
        where: { companyId: testCompanyId },
        take: 10000
      });
      
      console.log(`   Clients trouvés pour cette entreprise: ${clientsForExport.length}`);
      
      if (clientsForExport.length > 0) {
        console.log(`   Premier client:`, {
          id: clientsForExport[0].id,
          type: clientsForExport[0].type,
          name: clientsForExport[0].type === 'COMPANY' ? clientsForExport[0].companyName : `${clientsForExport[0].firstName} ${clientsForExport[0].lastName}`,
          email: clientsForExport[0].email
        });
      }
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
  }
}

// Exécuter le test
testDatabaseData().catch(console.error);
