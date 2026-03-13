const { spawn } = require('child_process');
const http = require('http');

console.log('🧪 Test de démarrage du serveur Next.js');
console.log('=' .repeat(50));

let serverProcess = null;
let testTimeout = null;

function testServerConnection(port = 3002, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkConnection = () => {
      attempts++;
      console.log(`   Tentative ${attempts}/${maxAttempts}...`);
      
      const req = http.request({
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'HEAD',
        timeout: 2000
      }, (res) => {
        console.log(`   ✅ Serveur répond avec le statut: ${res.statusCode}`);
        resolve(true);
      });
      
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          console.log(`   ❌ Serveur non accessible après ${maxAttempts} tentatives`);
          reject(new Error(`Server not accessible: ${err.message}`));
        } else {
          setTimeout(checkConnection, 2000);
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          console.log(`   ❌ Timeout après ${maxAttempts} tentatives`);
          reject(new Error('Connection timeout'));
        } else {
          setTimeout(checkConnection, 2000);
        }
      });
      
      req.end();
    };
    
    checkConnection();
  });
}

async function startAndTestServer() {
  try {
    console.log('\n🚀 Démarrage du serveur Next.js...');
    
    // Démarrer le serveur
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    let serverOutput = '';
    
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      serverOutput += output;
      
      // Afficher les messages importants
      if (output.includes('Ready') || output.includes('started') || output.includes('Local:')) {
        console.log(`   📡 ${output.trim()}`);
      }
      if (output.includes('error') || output.includes('Error')) {
        console.log(`   ❌ ${output.trim()}`);
      }
    });
    
    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.log(`   ⚠️ ${error.trim()}`);
    });
    
    serverProcess.on('close', (code) => {
      console.log(`   🛑 Serveur arrêté avec le code: ${code}`);
    });
    
    // Attendre que le serveur démarre
    console.log('\n⏳ Attente du démarrage du serveur...');
    
    // Test de connexion
    try {
      await testServerConnection();
      console.log('\n✅ SUCCÈS: Le serveur fonctionne correctement !');
      console.log('🌐 Accédez à: http://localhost:3002');
      
      // Garder le serveur en marche
      console.log('\n💡 Le serveur reste en marche. Appuyez sur Ctrl+C pour arrêter.');
      
      // Gérer l'arrêt propre
      process.on('SIGINT', () => {
        console.log('\n🛑 Arrêt du serveur...');
        if (serverProcess) {
          serverProcess.kill('SIGTERM');
        }
        process.exit(0);
      });
      
    } catch (error) {
      console.log(`\n❌ ÉCHEC: ${error.message}`);
      
      // Afficher les logs du serveur pour diagnostic
      console.log('\n📋 Logs du serveur:');
      console.log(serverOutput);
      
      if (serverProcess) {
        serverProcess.kill('SIGTERM');
      }
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error.message);
    process.exit(1);
  }
}

// Timeout global
testTimeout = setTimeout(() => {
  console.log('\n⏰ Timeout global atteint (2 minutes)');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(1);
}, 120000); // 2 minutes

startAndTestServer();
