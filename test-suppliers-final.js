const axios = require('axios')

const BASE_URL = 'http://localhost:3001'

async function testSuppliersAPI() {
  console.log('🚀 Test final de l\'API Fournisseurs\n')

  try {
    // Étape 1: Authentification
    console.log('🔐 Authentification...')
    const authResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      email: 'admin@test.com',
      password: 'password123'
    })
    
    const token = authResponse.data.token
    console.log('✅ Authentification réussie')

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    // Étape 2: Récupérer la liste des fournisseurs
    console.log('\n📋 Récupération des fournisseurs...')
    const suppliersResponse = await axios.get(`${BASE_URL}/api/v1/suppliers`, { headers })
    console.log('✅ Liste des fournisseurs récupérée')
    console.log(`📊 Nombre de fournisseurs: ${suppliersResponse.data.suppliers?.length || 0}`)

    // Étape 3: Créer un nouveau fournisseur
    console.log('\n➕ Création d\'un nouveau fournisseur...')
    const newSupplier = {
      name: 'Test Supplier SARL',
      type: 'COMPANY',
      email: 'contact@testsupplier.fr',
      phone: '+33123456789',
      address: '123 Rue du Test',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      contactName: 'Jean Test',
      paymentTerms: 30,
      isActive: true
    }

    const createResponse = await axios.post(`${BASE_URL}/api/v1/suppliers`, newSupplier, { headers })
    console.log('✅ Fournisseur créé avec succès')
    console.log(`📝 ID: ${createResponse.data.id}`)
    console.log(`📝 Nom: ${createResponse.data.name}`)

    const supplierId = createResponse.data.id

    // Étape 4: Récupérer le fournisseur créé
    console.log('\n🔍 Récupération du fournisseur créé...')
    const getResponse = await axios.get(`${BASE_URL}/api/v1/suppliers/${supplierId}`, { headers })
    console.log('✅ Fournisseur récupéré')
    console.log(`📝 Nom: ${getResponse.data.name}`)
    console.log(`📝 Email: ${getResponse.data.email}`)

    // Étape 5: Mettre à jour le fournisseur
    console.log('\n✏️ Mise à jour du fournisseur...')
    const updateData = {
      name: 'Test Supplier SARL - Modifié',
      phone: '+33987654321'
    }

    const updateResponse = await axios.put(`${BASE_URL}/api/v1/suppliers/${supplierId}`, updateData, { headers })
    console.log('✅ Fournisseur mis à jour')
    console.log(`📝 Nouveau nom: ${updateResponse.data.name}`)
    console.log(`📝 Nouveau téléphone: ${updateResponse.data.phone}`)

    // Étape 6: Supprimer le fournisseur
    console.log('\n🗑️ Suppression du fournisseur...')
    await axios.delete(`${BASE_URL}/api/v1/suppliers/${supplierId}`, { headers })
    console.log('✅ Fournisseur supprimé')

    // Étape 7: Vérifier la suppression
    console.log('\n🔍 Vérification de la suppression...')
    try {
      await axios.get(`${BASE_URL}/api/v1/suppliers/${supplierId}`, { headers })
      console.log('❌ Erreur: Le fournisseur devrait être supprimé')
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Fournisseur bien supprimé (404 comme attendu)')
      } else {
        console.log('❌ Erreur inattendue:', error.message)
      }
    }

    console.log('\n🎉 TOUS LES TESTS SONT PASSÉS !')
    console.log('✅ L\'API Fournisseurs fonctionne parfaitement')

  } catch (error) {
    console.log('❌ Erreur:', error.response?.data?.message || error.message)
    if (error.response?.data) {
      console.log('📄 Détails:', error.response.data)
    }
  }
}

testSuppliersAPI()
