const axios = require('axios')

const API_BASE = 'http://localhost:3001/api/v1'

// Données de test algériennes
const stocksData = [
  {
    productName: 'Couscous Ferrero 1kg',
    productDescription: 'Couscous grain moyen de qualité supérieure',
    productPrice: 350.00,
    productUnit: 'paquet',
    quantiteActuelle: 45,
    quantiteMinimale: 10,
    quantiteMaximale: 100
  },
  {
    productName: 'Huile Elio 1L',
    productDescription: 'Huile de table raffinée',
    productPrice: 280.00,
    productUnit: 'bouteille',
    quantiteActuelle: 8,
    quantiteMinimale: 15,
    quantiteMaximale: 50
  },
  {
    productName: 'Harissa Traditionnelle 200g',
    productDescription: 'Harissa artisanale piquante',
    productPrice: 180.00,
    productUnit: 'pot',
    quantiteActuelle: 3,
    quantiteMinimale: 10,
    quantiteMaximale: 30
  },
  {
    productName: 'Thé Vert Palais des Thés',
    productDescription: 'Thé vert de qualité premium',
    productPrice: 450.00,
    productUnit: 'boîte',
    quantiteActuelle: 0,
    quantiteMinimale: 5,
    quantiteMaximale: 25
  },
  {
    productName: 'Savon Doux Alger 100g',
    productDescription: 'Savon traditionnel à l\'huile d\'olive',
    productPrice: 120.00,
    productUnit: 'pièce',
    quantiteActuelle: 120,
    quantiteMinimale: 20,
    quantiteMaximale: 200
  }
]

async function testStockAPI() {
  console.log('🧪 Test de l\'API Stock - Insertion une par une\n')
  
  try {
    // 1. Tester la connexion à l'API
    console.log('1️⃣ Test de connexion à l\'API...')
    const healthCheck = await axios.get(`${API_BASE}/health`)
    console.log(`✅ API accessible: ${healthCheck.status}\n`)
    
    // 2. Vérifier les stocks existants
    console.log('2️⃣ Vérification des stocks existants...')
    try {
      const existingStocks = await axios.get(`${API_BASE}/stock`)
      console.log(`📋 Stocks existants: ${existingStocks.data.data?.length || 0}\n`)
    } catch (error) {
      console.log('⚠️ Erreur lors de la récupération des stocks existants\n')
    }
    
    // 3. Insérer chaque stock individuellement
    console.log('3️⃣ Insertion des stocks un par un...')
    
    for (let i = 0; i < stocksData.length; i++) {
      const stockData = stocksData[i]
      console.log(`\n📦 Stock ${i + 1}/${stocksData.length}: ${stockData.productName}`)
      
      try {
        const response = await axios.post(`${API_BASE}/stock`, stockData, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.data.success) {
          const status = stockData.quantiteActuelle === 0 ? '🔴 RUPTURE' : 
                        stockData.quantiteActuelle <= stockData.quantiteMinimale ? '🟠 FAIBLE' : '🟢 NORMAL'
          
          console.log(`   ✅ Créé: ${stockData.quantiteActuelle}/${stockData.quantiteMaximale} ${stockData.productUnit} - ${status}`)
        } else {
          console.log(`   ❌ Erreur: ${response.data.message}`)
        }
      } catch (error) {
        if (error.response?.status === 409) {
          console.log(`   ⚠️ Existe déjà: ${stockData.productName}`)
        } else {
          console.log(`   ❌ Erreur API: ${error.response?.data?.message || error.message}`)
        }
      }
      
      // Petite pause entre les insertions
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    // 4. Vérification finale
    console.log('\n4️⃣ Vérification finale...')
    try {
      const finalStocks = await axios.get(`${API_BASE}/stock`)
      const stocks = finalStocks.data.data || []
      
      const rupture = stocks.filter(s => s.quantiteActuelle === 0).length
      const faible = stocks.filter(s => s.quantiteActuelle > 0 && s.quantiteActuelle <= s.quantiteMinimale).length
      const normal = stocks.length - rupture - faible
      
      console.log('\n📊 RÉSUMÉ FINAL:')
      console.log(`   📋 Total stocks: ${stocks.length}`)
      console.log(`   🔴 En rupture: ${rupture}`)
      console.log(`   🟠 Stock faible: ${faible}`)
      console.log(`   🟢 Stock normal: ${normal}`)
      
      console.log('\n🎉 INSERTION TERMINÉE !')
      console.log('💡 Testez maintenant:')
      console.log('   → http://localhost:3000/stocks')
      console.log('   → http://localhost:3000/dashboard')
      
    } catch (error) {
      console.log('❌ Erreur lors de la vérification finale')
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Assurez-vous que le backend est démarré sur le port 3001')
      console.log('   → cd apps/backend && npm run dev')
    }
  }
}

testStockAPI().catch(console.error)
