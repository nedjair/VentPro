const axios = require('axios')

const BASE_URL = 'http://localhost:3001/api/v1'

async function testSuppliersAPI() {
  try {
    console.log('🚀 Test de l\'API Fournisseurs\n')

    // 1. Authentification
    console.log('🔐 Authentification...')
    const authResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    })

    if (!authResponse.data.token) {
      throw new Error('Token non reçu')
    }

    const token = authResponse.data.token
    console.log('✅ Authentification réussie')

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // 2. Lister les fournisseurs
    console.log('\n📋 Liste des fournisseurs...')
    const listResponse = await axios.get(`${BASE_URL}/suppliers`, { headers })
    console.log(`✅ ${listResponse.data.data.length} fournisseurs trouvés`)

    // 3. Créer un nouveau fournisseur
    console.log('\n➕ Création d\'un nouveau fournisseur...')
    const newSupplier = {
      type: 'COMPANY',
      name: 'Test Supplier API',
      email: 'test@supplier-api.com',
      phone: '0123456789',
      address: '123 Rue de Test',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      contactName: 'Jean Test',
      paymentTerms: 30,
      isActive: true
    }

    const createResponse = await axios.post(`${BASE_URL}/suppliers`, newSupplier, { headers })
    console.log('✅ Fournisseur créé:', createResponse.data.data.name)
    const supplierId = createResponse.data.data.id

    // 4. Récupérer le fournisseur créé
    console.log('\n🔍 Récupération du fournisseur...')
    const getResponse = await axios.get(`${BASE_URL}/suppliers/${supplierId}`, { headers })
    console.log('✅ Fournisseur récupéré:', getResponse.data.data.name)

    // 5. Mettre à jour le fournisseur
    console.log('\n✏️ Mise à jour du fournisseur...')
    const updateData = {
      name: 'Test Supplier API - Modifié',
      phone: '0987654321'
    }
    const updateResponse = await axios.put(`${BASE_URL}/suppliers/${supplierId}`, updateData, { headers })
    console.log('✅ Fournisseur mis à jour:', updateResponse.data.data.name)

    // 6. Supprimer le fournisseur
    console.log('\n🗑️ Suppression du fournisseur...')
    await axios.delete(`${BASE_URL}/suppliers/${supplierId}`, { headers })
    console.log('✅ Fournisseur supprimé')

    console.log('\n🎉 Tous les tests ont réussi !')

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message)
    if (error.response?.status) {
      console.error(`Status: ${error.response.status}`)
    }
  }
}

testSuppliersAPI()
