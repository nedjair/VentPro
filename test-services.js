// Script de test pour vérifier l'état des services
const http = require('http');

console.log('🔍 Test des services de l\'application...\n');

// Test du backend
function testBackend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3001/health', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('✅ Backend (port 3001): ACTIF');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data.substring(0, 100)}...\n`);
        resolve(true);
      });
    });
    
    req.on('error', (err) => {
      console.log('❌ Backend (port 3001): NON ACCESSIBLE');
      console.log(`   Erreur: ${err.message}\n`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏱️ Backend (port 3001): TIMEOUT\n');
      req.destroy();
      resolve(false);
    });
  });
}

// Test du frontend
function testFrontend() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3003', (res) => {
      console.log('✅ Frontend (port 3003): ACTIF');
      console.log(`   Status: ${res.statusCode}\n`);
      resolve(true);
    });
    
    req.on('error', (err) => {
      console.log('❌ Frontend (port 3003): NON ACCESSIBLE');
      console.log(`   Erreur: ${err.message}\n`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      console.log('⏱️ Frontend (port 3003): TIMEOUT\n');
      req.destroy();
      resolve(false);
    });
  });
}

// Test des services Docker
function testDocker() {
  return new Promise((resolve) => {
    const { exec } = require('child_process');
    exec('docker ps --format "table {{.Names}}\\t{{.Status}}" | findstr gestion-', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Services Docker: NON ACCESSIBLES');
        console.log(`   Erreur: ${error.message}\n`);
        resolve(false);
      } else {
        console.log('✅ Services Docker: ACTIFS');
        console.log(`   Services:\n${stdout}\n`);
        resolve(true);
      }
    });
  });
}

// Exécution des tests
async function runTests() {
  console.log('📊 RAPPORT D\'ÉTAT DES SERVICES');
  console.log('================================\n');
  
  const dockerOk = await testDocker();
  const backendOk = await testBackend();
  const frontendOk = await testFrontend();
  
  console.log('📋 RÉSUMÉ:');
  console.log(`   Docker Services: ${dockerOk ? '✅' : '❌'}`);
  console.log(`   Backend API: ${backendOk ? '✅' : '❌'}`);
  console.log(`   Frontend: ${frontendOk ? '✅' : '❌'}`);
  
  if (dockerOk && backendOk && frontendOk) {
    console.log('\n🎉 APPLICATION COMPLÈTEMENT OPÉRATIONNELLE!');
    console.log('   Frontend: http://localhost:3003');
    console.log('   Backend API: http://localhost:3001');
    console.log('   Analytics: http://localhost:3003/analytics');
  } else {
    console.log('\n⚠️ CERTAINS SERVICES NE SONT PAS OPÉRATIONNELS');
    if (!dockerOk) console.log('   → Démarrer Docker: docker-compose up -d');
    if (!backendOk) console.log('   → Démarrer Backend: node production-backend.js');
    if (!frontendOk) console.log('   → Démarrer Frontend: cd frontend-nextjs-production && npm run dev');
  }
}

runTests().catch(console.error);
