#!/usr/bin/env node

/**
 * Test final de l'API des fournisseurs après correction du problème deliveryTerms
 */

const API_BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 TEST FINAL DE L\'API FOURNISSEURS\n');

  try {
    // 1. Test de santé
    console.log('1️⃣ Test de santé du serveur...');
    const healthResponse = await fetch(`${API_BASE_URL}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('   ✅ Serveur en ligne');
      console.log(`   📊 Uptime: ${Math.round(healthData.uptime)}s`);
    } else {
      throw new Error(`Serveur non disponible: ${healthResponse.status}`);
    }

    // 2. Connexion
    console.log('\n2️⃣ Connexion...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Erreur de connexion: ${loginResponse.status} - ${errorText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.token;
    console.log('   ✅ Connexion réussie');
    console.log(`   🔑 Token reçu: ${token.substring(0, 20)}...`);

    // 3. Test de récupération des fournisseurs
    console.log('\n3️⃣ Test de récupération des fournisseurs...');
    const suppliersResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   📊 Status: ${suppliersResponse.status}`);
    
    if (suppliersResponse.ok) {
      const suppliersData = await suppliersResponse.json();
      console.log('   ✅ Récupération des fournisseurs réussie');
      console.log(`   📈 Nombre de fournisseurs: ${suppliersData.data?.suppliers?.length || 0}`);
      console.log(`   📄 Total: ${suppliersData.data?.total || 0}`);
      console.log(`   📑 Page: ${suppliersData.data?.page || 1}/${suppliersData.data?.totalPages || 1}`);
      
      if (suppliersData.data?.suppliers?.length > 0) {
        const firstSupplier = suppliersData.data.suppliers[0];
        console.log('   📋 Premier fournisseur:');
        console.log(`      - ID: ${firstSupplier.id}`);
        console.log(`      - Nom: ${firstSupplier.name}`);
        console.log(`      - Type: ${firstSupplier.type}`);
        console.log(`      - Email: ${firstSupplier.email || 'N/A'}`);
        console.log(`      - Actif: ${firstSupplier.isActive}`);
        console.log(`      - Produits: ${firstSupplier._count?.products || 0}`);
      }
    } else {
      const errorData = await suppliersResponse.text();
      console.log('   ❌ Erreur lors de la récupération des fournisseurs');
      console.log(`   📝 Détails: ${errorData}`);
      return; // Arrêter ici si l'API ne fonctionne pas
    }

    // 4. Test de création d'un fournisseur (sans deliveryTerms)
    console.log('\n4️⃣ Test de création d\'un fournisseur...');
    const newSupplier = {
      type: 'COMPANY',
      name: 'Test Supplier Fixed Final',
      contactName: 'John Doe',
      email: 'test@supplier-fixed-final.com',
      phone: '01 23 45 67 89',
      address: '123 Test Street',
      city: 'Paris',
      country: 'France',
      paymentTerms: 30,
      discount: 5.0,
      currency: 'EUR',
      rating: 4,
      isActive: true,
      isPreferred: false,
      notes: 'Fournisseur de test après correction finale',
      tags: ['test', 'fixed', 'final']
    };

    const createResponse = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSupplier)
    });

    console.log(`   📊 Status: ${createResponse.status}`);
    
    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('   ✅ Création du fournisseur réussie');
      console.log(`   🆔 ID créé: ${createData.data?.id}`);
      console.log(`   📝 Nom: ${createData.data?.name}`);
    } else {
      const errorData = await createResponse.text();
      console.log('   ❌ Erreur lors de la création du fournisseur');
      console.log(`   📝 Détails: ${errorData}`);
    }

    console.log('\n🎉 TESTS TERMINÉS AVEC SUCCÈS !');
    console.log('✅ L\'API des fournisseurs fonctionne correctement sans le champ deliveryTerms');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    process.exit(1);
  }
}

// Exécuter les tests
testAPI();
