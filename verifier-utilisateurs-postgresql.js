#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

console.log('🔍 VÉRIFICATION UTILISATEURS POSTGRESQL');
console.log('=====================================\n');

async function verifyUsers() {
  const prisma = new PrismaClient();

  try {
    console.log('📊 Connexion à PostgreSQL...');
    
    // Récupérer tous les utilisateurs
    const users = await prisma.user.findMany({
      include: {
        company: true
      }
    });

    console.log(`\n👥 Nombre d'utilisateurs trouvés: ${users.length}`);
    console.log('=====================================');

    for (const user of users) {
      console.log(`\n👤 Utilisateur ${user.id}:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Nom: ${user.firstName} ${user.lastName}`);
      console.log(`   👑 Rôle: ${user.role}`);
      console.log(`   ✅ Actif: ${user.isActive ? 'OUI' : 'NON'}`);
      console.log(`   🏢 Entreprise: ${user.company?.name || 'Non définie'}`);
      console.log(`   🔑 Hash mot de passe: ${user.password.substring(0, 20)}...`);
      
      // Tester les mots de passe courants
      const commonPasswords = ['admin123', 'password123', 'test123'];
      
      for (const password of commonPasswords) {
        try {
          const isValid = await bcrypt.compare(password, user.password);
          if (isValid) {
            console.log(`   🎯 MOT DE PASSE TROUVÉ: "${password}"`);
            break;
          }
        } catch (error) {
          console.log(`   ❌ Erreur test mot de passe: ${error.message}`);
        }
      }
    }

    // Tester spécifiquement l'utilisateur admin@gestion-dz.com
    console.log('\n🎯 TEST SPÉCIFIQUE admin@gestion-dz.com');
    console.log('==========================================');
    
    const adminUser = await prisma.user.findFirst({
      where: {
        email: 'admin@gestion-dz.com',
        isActive: true
      },
      include: {
        company: true
      }
    });

    if (adminUser) {
      console.log('✅ Utilisateur admin@gestion-dz.com trouvé !');
      console.log(`   👤 Nom: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   👑 Rôle: ${adminUser.role}`);
      console.log(`   🏢 Entreprise: ${adminUser.company?.name}`);
      
      // Tester le mot de passe admin123
      const isValidPassword = await bcrypt.compare('admin123', adminUser.password);
      console.log(`   🔑 Mot de passe "admin123": ${isValidPassword ? '✅ VALIDE' : '❌ INVALIDE'}`);
      
      if (!isValidPassword) {
        console.log('\n🔧 CORRECTION DU MOT DE PASSE');
        console.log('============================');
        
        // Hasher le nouveau mot de passe
        const newHashedPassword = await bcrypt.hash('admin123', 10);
        
        // Mettre à jour l'utilisateur
        await prisma.user.update({
          where: { id: adminUser.id },
          data: { password: newHashedPassword }
        });
        
        console.log('✅ Mot de passe mis à jour avec "admin123"');
        
        // Vérifier à nouveau
        const updatedUser = await prisma.user.findUnique({
          where: { id: adminUser.id }
        });
        
        const isNowValid = await bcrypt.compare('admin123', updatedUser.password);
        console.log(`   🔑 Vérification: ${isNowValid ? '✅ SUCCÈS' : '❌ ÉCHEC'}`);
      }
    } else {
      console.log('❌ Utilisateur admin@gestion-dz.com NON TROUVÉ !');
      
      console.log('\n🔧 CRÉATION DE L\'UTILISATEUR ADMIN');
      console.log('==================================');
      
      // Récupérer la première entreprise
      const company = await prisma.company.findFirst();
      
      if (company) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        const newAdmin = await prisma.user.create({
          data: {
            email: 'admin@gestion-dz.com',
            password: hashedPassword,
            firstName: 'Admin',
            lastName: 'Gestion DZ',
            role: 'ADMIN',
            isActive: true,
            companyId: company.id
          }
        });
        
        console.log('✅ Utilisateur admin créé avec succès !');
        console.log(`   📧 Email: ${newAdmin.email}`);
        console.log(`   🔑 Mot de passe: admin123`);
        console.log(`   👤 Nom: ${newAdmin.firstName} ${newAdmin.lastName}`);
      } else {
        console.log('❌ Aucune entreprise trouvée pour créer l\'utilisateur');
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function testLogin() {
  console.log('\n🔐 TEST DE CONNEXION DIRECT');
  console.log('===========================');
  
  const http = require('http');
  
  const postData = JSON.stringify({
    email: 'admin@gestion-dz.com',
    password: 'admin123'
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`📊 Status: ${res.statusCode}`);
          
          if (res.statusCode === 200 && parsed.success) {
            console.log('✅ CONNEXION RÉUSSIE !');
            console.log(`   👤 Utilisateur: ${parsed.data.user.firstName} ${parsed.data.user.lastName}`);
            console.log(`   📧 Email: ${parsed.data.user.email}`);
            console.log(`   👑 Rôle: ${parsed.data.user.role}`);
            resolve(true);
          } else {
            console.log('❌ CONNEXION ÉCHOUÉE');
            console.log(`   Message: ${parsed.message}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ Erreur parsing: ${e.message}`);
          console.log(`   Réponse brute: ${data}`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Erreur requête: ${error.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

async function main() {
  await verifyUsers();
  await testLogin();
  
  console.log('\n🎯 RÉSUMÉ');
  console.log('=========');
  console.log('✅ Vérification des utilisateurs PostgreSQL terminée');
  console.log('✅ Test de connexion effectué');
  console.log('\n💡 Si la connexion fonctionne maintenant:');
  console.log('   📧 Email: admin@gestion-dz.com');
  console.log('   🔑 Mot de passe: admin123');
  console.log('\n🌐 Testez maintenant sur le frontend !');
}

main().catch(console.error);
