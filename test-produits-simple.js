#!/usr/bin/env node

const axios = require('axios');

async function testSimple() {
  console.log('🧪 TEST SIMPLE PRODUITS\n');
  
  try {
    // 1. Test backend health
    console.log('1️⃣ Test backend...');
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Backend accessible:', healthResponse.status);
    
    // 2. Test authentification
    console.log('\n2️⃣ Test authentification...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@demo-tpe.fr',
      password: 'demo123'
    });
    console.log('✅ Connexion réussie');
    
    const token = loginResponse.data.data.token;
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    // 3. Test liste produits
    console.log('\n3️⃣ Test liste produits...');
    const listResponse = await axios.get('http://localhost:3001/api/v1/products', { headers });
    console.log('✅ Liste produits récupérée:', listResponse.data.data.length, 'produits');
    
    // 4. Test frontend
    console.log('\n4️⃣ Test frontend...');
    const frontendResponse = await axios.get('http://localhost:3003/products');
    console.log('✅ Page produits accessible:', frontendResponse.status);
    
    console.log('\n🎉 TOUS LES TESTS RÉUSSIS !');
    console.log('🔗 Module Produits fonctionnel');
    console.log('\n📋 TESTEZ MAINTENANT:');
    console.log('1. http://localhost:3003/products - Liste des produits');
    console.log('2. http://localhost:3003/products/new - Nouveau produit');
    
  } catch (error) {
    console.log('\n❌ ERREUR:', error.message);
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📊 Data:', error.response.data);
    }
  }
}

testSimple();
