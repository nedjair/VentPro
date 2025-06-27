const http = require('http')
const https = require('https')

function testUrl(url, name) {
  return new Promise((resolve) => {
    const urlObj = new URL(url)
    const client = urlObj.protocol === 'https:' ? https : http
    
    const req = client.get(url, { timeout: 5000 }, (res) => {
      console.log(`✅ ${name}: ${res.statusCode} ${res.statusMessage}`)
      resolve({ success: true, status: res.statusCode })
    })
    
    req.on('error', (error) => {
      console.log(`❌ ${name}: ${error.message}`)
      resolve({ success: false, error: error.message })
    })
    
    req.on('timeout', () => {
      console.log(`⏱️ ${name}: Timeout`)
      req.destroy()
      resolve({ success: false, error: 'Timeout' })
    })
  })
}

async function quickTest() {
  console.log('🔍 TEST RAPIDE DE CONNECTIVITÉ')
  console.log('=' .repeat(40))
  
  const tests = [
    { name: 'Frontend (Next.js)', url: 'http://localhost:3000' },
    { name: 'Backend (Fastify)', url: 'http://localhost:3001/api' },
    { name: 'API Health', url: 'http://localhost:3001/health' },
    { name: 'API Products', url: 'http://localhost:3001/api/v1/products' },
    { name: 'API Stock', url: 'http://localhost:3001/api/v1/stock' }
  ]
  
  let successCount = 0
  
  for (const test of tests) {
    const result = await testUrl(test.url, test.name)
    if (result.success || (result.status >= 200 && result.status < 500)) {
      successCount++
    }
  }
  
  console.log('\n📊 RÉSUMÉ:')
  console.log(`${successCount}/${tests.length} services accessibles`)
  
  if (successCount >= 2) {
    console.log('🎉 Application fonctionnelle !')
  } else {
    console.log('⚠️ Problèmes de connectivité détectés')
  }
}

quickTest().catch(console.error)
