#!/usr/bin/env node

const http = require('http');

console.log('🔍 TEST IDENTIFIANTS CORRIGÉS');
console.log('=============================\n');

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ 
            statusCode: res.statusCode, 
            data: parsed, 
            headers: res.headers,
            rawData: data
          });
        } catch (e) {
          resolve({ 
            statusCode: res.statusCode, 
            data: data, 
            headers: res.headers,
            rawData: data
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function testLogin(email, password, description) {
  console.log(`\n🔐 Test: ${description}`);
  console.log(`   📧 Email: ${email}`);
  console.log(`   🔑 Mot de passe: ${password}`);
  
  const postData = JSON.stringify({
    email: email,
    password: password
  });

  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Origin': 'http://localhost:3000'
      }
    }, postData);
    
    if (response.statusCode === 200 && response.data.success) {
      console.log(`   ✅ SUCCÈS !`);
      console.log(`   👤 Utilisateur: ${response.data.data.user.firstName} ${response.data.data.user.lastName}`);
      console.log(`   👑 Rôle: ${response.data.data.user.role}`);
      console.log(`   🏢 Entreprise: ${response.data.data.user.companyId}`);
      return true;
    } else {
      console.log(`   ❌ ÉCHEC - Status: ${response.statusCode}`);
      console.log(`   💬 Message: ${response.data.message || 'Erreur inconnue'}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERREUR: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('🚀 DÉBUT DES TESTS D\'IDENTIFIANTS');
  console.log('==================================');

  // Test 1: Identifiants PostgreSQL corrects
  const test1 = await testLogin(
    'admin@gestion-dz.com', 
    'admin123', 
    'Identifiants PostgreSQL Corrects'
  );

  // Test 2: Anciens identifiants (doivent échouer)
  const test2 = await testLogin(
    'admin@gctpe.dz', 
    'admin123', 
    'Anciens Identifiants (doit échouer)'
  );

  // Test 3: Autres anciens identifiants
  const test3 = await testLogin(
    'admin@demo-tpe.fr', 
    'demo123', 
    'Identifiants Demo (doit échouer)'
  );

  // Test 4: Identifiants algériens
  const test4 = await testLogin(
    'admin@technocommerce.dz', 
    'demo123', 
    'Identifiants Algériens (doit échouer)'
  );

  console.log('\n🎯 RÉSUMÉ DES TESTS');
  console.log('==================');
  
  if (test1) {
    console.log('✅ CORRECTION RÉUSSIE !');
    console.log('========================');
    console.log('🎉 Les identifiants PostgreSQL fonctionnent parfaitement');
    console.log('📧 Email correct: admin@gestion-dz.com');
    console.log('🔑 Mot de passe correct: admin123');
    
    console.log('\n🛠️ ACTIONS POUR LE FRONTEND:');
    console.log('============================');
    console.log('1. 🔄 Redémarrez le frontend (Ctrl+C puis npm run dev)');
    console.log('2. 🧹 Videz le cache du navigateur (Ctrl+F5)');
    console.log('3. 🌐 Accédez à http://localhost:3000');
    console.log('4. 🔐 Connectez-vous avec:');
    console.log('   📧 Email: admin@gestion-dz.com');
    console.log('   🔑 Mot de passe: admin123');
    
    if (!test2 && !test3 && !test4) {
      console.log('\n✅ SÉCURITÉ CONFIRMÉE');
      console.log('Les anciens identifiants ne fonctionnent plus (normal)');
    }
    
  } else {
    console.log('❌ PROBLÈME PERSISTANT');
    console.log('======================');
    console.log('⚠️ Les identifiants PostgreSQL ne fonctionnent pas');
    console.log('💡 Vérifiez que le backend est démarré');
    console.log('💡 Vérifiez la base de données PostgreSQL');
  }

  console.log('\n🌟 PROCHAINES ÉTAPES');
  console.log('====================');
  console.log('1. 🔄 Redémarrer le frontend');
  console.log('2. 🧪 Tester la connexion dans le navigateur');
  console.log('3. 🎯 Vérifier que toutes les pages fonctionnent');
}

runTests().catch(console.error);
