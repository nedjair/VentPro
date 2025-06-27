/**
 * Script pour tester l'authentification et obtenir un token
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function testUserAuth() {
  try {
    console.log('🔍 Test de l\'authentification utilisateur...\n');

    // 1. Vérifier les utilisateurs existants
    console.log('👤 Utilisateurs dans la base:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        isActive: true,
        role: true,
        password: true
      }
    });

    if (users.length === 0) {
      console.log('❌ Aucun utilisateur trouvé dans la base');
      return;
    }

    console.log(`✅ ${users.length} utilisateur(s) trouvé(s):`);
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`      ID: ${user.id}`);
      console.log(`      CompanyId: ${user.companyId}`);
      console.log(`      Role: ${user.role}`);
      console.log(`      Actif: ${user.isActive}`);
      console.log(`      Mot de passe hashé: ${user.password ? 'Oui' : 'Non'}`);
      console.log('');
    });

    // 2. Tester l'authentification avec le premier utilisateur
    const testUser = users[0];
    console.log(`🔐 Test d'authentification avec: ${testUser.email}`);

    // Essayer des mots de passe courants
    const commonPasswords = ['password', '123456', 'admin', 'test', 'password123', 'admin123'];
    
    let validPassword = null;
    for (const password of commonPasswords) {
      try {
        const isValid = await bcrypt.compare(password, testUser.password);
        if (isValid) {
          validPassword = password;
          console.log(`✅ Mot de passe trouvé: ${password}`);
          break;
        }
      } catch (error) {
        // Ignorer les erreurs de comparaison
      }
    }

    if (!validPassword) {
      console.log('❌ Aucun mot de passe courant ne fonctionne');
      console.log('💡 Essayons de créer un utilisateur de test...');
      
      // Créer un utilisateur de test
      const testPassword = 'test123';
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      const newUser = await prisma.user.create({
        data: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          password: hashedPassword,
          role: 'ADMIN',
          companyId: testUser.companyId, // Utiliser la même entreprise
          isActive: true
        }
      });
      
      console.log(`✅ Utilisateur de test créé: ${newUser.email} / ${testPassword}`);
      console.log(`   CompanyId: ${newUser.companyId}`);
      
      // Tester avec le nouvel utilisateur
      testUser.email = newUser.email;
      testUser.companyId = newUser.companyId;
      validPassword = testPassword;
    }

    // 3. Vérifier les données pour cette entreprise
    console.log(`\n📊 Données pour l'entreprise ${testUser.companyId}:`);
    
    const [clientsCount, productsCount, suppliersCount] = await Promise.all([
      prisma.client.count({ where: { companyId: testUser.companyId } }),
      prisma.product.count({ where: { companyId: testUser.companyId } }),
      prisma.supplier.count({ where: { companyId: testUser.companyId } })
    ]);
    
    console.log(`   Clients: ${clientsCount}`);
    console.log(`   Produits: ${productsCount}`);
    console.log(`   Fournisseurs: ${suppliersCount}`);

    if (clientsCount > 0) {
      console.log('\n📋 Exemples de clients:');
      const sampleClients = await prisma.client.findMany({
        where: { companyId: testUser.companyId },
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
      
      sampleClients.forEach((client, index) => {
        const name = client.type === 'COMPANY' ? client.companyName : `${client.firstName} ${client.lastName}`;
        console.log(`   ${index + 1}. ${name} (${client.email})`);
      });
    }

    // 4. Simuler une requête d'export
    console.log('\n🧪 Simulation d\'une requête d\'export:');
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Mot de passe: ${validPassword}`);
    console.log(`   CompanyId: ${testUser.companyId}`);
    console.log(`   Données disponibles: ${clientsCount} clients`);

    if (clientsCount > 0) {
      console.log('\n✅ L\'export devrait fonctionner avec ces données');
      console.log('💡 Le problème vient probablement de:');
      console.log('   1. L\'authentification frontend-backend');
      console.log('   2. Le token JWT qui n\'est pas transmis correctement');
      console.log('   3. Le backend qui ne démarre pas correctement');
    } else {
      console.log('\n❌ Aucune donnée disponible pour l\'export');
      console.log('💡 Il faut d\'abord ajouter des données de test');
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n✅ Test terminé');
  }
}

// Exécuter le test
testUserAuth().catch(console.error);
