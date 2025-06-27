// Test de l'API pour insérer des données algériennes
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('🔍 Test de l\'API backend...');
    
    // Test de santé
    const healthResponse = await fetch('http://localhost:3001/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend santé:', healthData);
    
    // Test des métriques
    const metricsResponse = await fetch('http://localhost:3001/metrics');
    const metricsData = await metricsResponse.json();
    console.log('📊 Métriques actuelles:', metricsData);
    
    // Test d'insertion d'un client algérien
    const clientData = {
      type: 'COMPANY',
      companyName: 'SONATRACH SPA',
      email: 'contact@sonatrach.dz',
      phone: '+213 21 54 70 00',
      address: 'Avenue du 1er Novembre',
      postalCode: '16000',
      city: 'Alger',
      country: 'Algérie',
      notes: 'Compagnie nationale des hydrocarbures'
    };
    
    console.log('👤 Test d\'insertion client...');
    const clientResponse = await fetch('http://localhost:3001/api/v1/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(clientData)
    });
    
    if (clientResponse.ok) {
      const clientResult = await clientResponse.json();
      console.log('✅ Client inséré:', clientResult);
    } else {
      const error = await clientResponse.text();
      console.log('❌ Erreur insertion client:', error);
    }
    
    // Test d'insertion d'un produit algérien
    const productData = {
      name: 'Téléviseur LED 55"',
      reference: 'TV-LED-55-001',
      description: 'Téléviseur LED 55 pouces Full HD CONDOR',
      category: 'Électronique',
      price: 89000.00,
      costPrice: 65000.00,
      stock: 25,
      minStock: 5,
      unit: 'pièce',
      isActive: true,
      trackStock: true,
      allowBackorder: false
    };
    
    console.log('📦 Test d\'insertion produit...');
    const productResponse = await fetch('http://localhost:3001/api/v1/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData)
    });
    
    if (productResponse.ok) {
      const productResult = await productResponse.json();
      console.log('✅ Produit inséré:', productResult);
    } else {
      const error = await productResponse.text();
      console.log('❌ Erreur insertion produit:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur test API:', error);
  }
}

testAPI();
