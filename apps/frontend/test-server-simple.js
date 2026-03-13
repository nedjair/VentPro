#!/usr/bin/env node

/**
 * Test simple du serveur frontend
 */

const { spawn } = require('child_process')
const axios = require('axios')

async function testFrontendServer() {
  console.log('🧪 TEST SIMPLE DU SERVEUR FRONTEND')
  console.log('==================================\n')
  
  try {
    // 1. Démarrer le serveur
    console.log('1. 🚀 Démarrage du serveur...')
    const server = spawn('npm', ['run', 'dev'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    })
    
    let serverReady = false
    let serverOutput = ''
    
    server.stdout.on('data', (data) => {
      const output = data.toString()
      serverOutput += output
      console.log('STDOUT:', output)
      
      if (output.includes('Ready') || output.includes('started server') || output.includes('Local:')) {
        serverReady = true
      }
    })
    
    server.stderr.on('data', (data) => {
      const output = data.toString()
      serverOutput += output
      console.log('STDERR:', output)
    })
    
    // 2. Attendre que le serveur démarre
    console.log('2. ⏳ Attente du démarrage...')
    let attempts = 0
    const maxAttempts = 30
    
    while (!serverReady && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      attempts++
      console.log(`   Tentative ${attempts}/${maxAttempts}...`)
    }
    
    if (!serverReady) {
      console.log('❌ Le serveur n\'a pas démarré dans les temps')
      console.log('Output complet:')
      console.log(serverOutput)
      server.kill()
      return false
    }
    
    // 3. Tester la connexion
    console.log('\n3. 🔍 Test de connexion...')
    try {
      const response = await axios.get('http://localhost:3005', { timeout: 5000 })
      console.log('✅ Serveur accessible:', response.status)
    } catch (error) {
      console.log('❌ Serveur non accessible:', error.message)
    }
    
    // 4. Arrêter le serveur
    console.log('\n4. 🛑 Arrêt du serveur...')
    server.kill()
    
    return true
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message)
    return false
  }
}

async function main() {
  const success = await testFrontendServer()
  process.exit(success ? 0 : 1)
}

if (require.main === module) {
  main()
}
