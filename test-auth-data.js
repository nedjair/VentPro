/**
 * Script de test pour vérifier l'authentification et les données utilisateur
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testAuthData() {
  try {
    console.log('🔍 Test de l\'authentification et des données utilisateur...\n');

    // Test de connexion
    console.log('📡 Test de connexion à la base de données...');
    await prisma.$connect();
    console.log('✅ Connexion réussie\n');

    // Vérifier les utilisateurs
    console.log('👤 Utilisateurs dans la base:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        role: true
      }
    });
    
    console.log(`   Total utilisateurs: ${users.length}`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`      CompanyId: ${user.companyId}, Role: ${user.role}, Actif: ${user.isActive}`);
    });
    console.log('');

    // Vérifier les entreprises
    console.log('🏢 Entreprises dans la base:');
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true
      }
    });
    
    console.log(`   Total entreprises: ${companies.length}`);
    companies.forEach((company, index) => {
      console.log(`   ${index + 1}. ${company.name} (${company.email})`);
      console.log(`      ID: ${company.id}, Actif: ${company.isActive}`);
    });
    console.log('');

    // Tester la correspondance utilisateur-entreprise-données
    if (users.length > 0 && companies.length > 0) {
      console.log('🔗 Test de correspondance utilisateur-entreprise-données:');
      
      for (const user of users) {
        console.log(`\n   👤 Utilisateur: ${user.firstName} ${user.lastName} (${user.email})`);
        console.log(`      CompanyId: ${user.companyId}`);
        
        // Vérifier si l'entreprise existe
        const company = companies.find(c => c.id === user.companyId);
        if (company) {
          console.log(`      ✅ Entreprise trouvée: ${company.name}`);
          
          // Compter les données pour cette entreprise
          const [clientsCount, productsCount, suppliersCount, ordersCount, invoicesCount] = await Promise.all([
            prisma.client.count({ where: { companyId: user.companyId } }),
            prisma.product.count({ where: { companyId: user.companyId } }),
            prisma.supplier.count({ where: { companyId: user.companyId } }),
            prisma.order.count({ where: { companyId: user.companyId } }),
            prisma.invoice.count({ where: { companyId: user.companyId } })
          ]);
          
          console.log(`      📊 Données pour cette entreprise:`);
          console.log(`         Clients: ${clientsCount}`);
          console.log(`         Produits: ${productsCount}`);
          console.log(`         Fournisseurs: ${suppliersCount}`);
          console.log(`         Commandes: ${ordersCount}`);
          console.log(`         Factures: ${invoicesCount}`);
          
          // Si c'est le premier utilisateur avec des données, tester une requête d'export
          if (clientsCount > 0) {
            console.log(`      🧪 Test de requête d'export pour cet utilisateur:`);
            const testClients = await prisma.client.findMany({
              where: { companyId: user.companyId },
              take: 3,
              select: {
                id: true,
                type: true,
                firstName: true,
                lastName: true,
                companyName: true,
                email: true,
                city: true
              }
            });
            
            console.log(`         Clients récupérés: ${testClients.length}`);
            testClients.forEach((client, idx) => {
              const name = client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`;
              console.log(`         ${idx + 1}. ${name} (${client.email})`);
            });
          }
        } else {
          console.log(`      ❌ Entreprise non trouvée pour l'ID: ${user.companyId}`);
        }
      }
    }

    // Vérifier les tokens de session (si la table existe)
    try {
      console.log('\n🔑 Vérification des sessions:');
      const sessions = await prisma.session.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          expiresAt: true,
          createdAt: true
        }
      });
      
      console.log(`   Sessions récentes: ${sessions.length}`);
      sessions.forEach((session, index) => {
        const isExpired = new Date() > new Date(session.expiresAt);
        console.log(`   ${index + 1}. Session ${session.id.substring(0, 8)}... - User: ${session.userId}`);
        console.log(`      Créée: ${session.createdAt.toLocaleString()}, Expire: ${session.expiresAt.toLocaleString()}`);
        console.log(`      Statut: ${isExpired ? '❌ Expirée' : '✅ Active'}`);
      });
    } catch (error) {
      console.log('   ⚠️ Table session non trouvée ou erreur:', error.message);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
  }
}

// Exécuter le test
testAuthData().catch(console.error);
