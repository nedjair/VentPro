/**
 * Tests automatisés pour l'API des fournisseurs
 */

const { test, expect } = require('@jest/globals');

const API_BASE_URL = 'http://localhost:3001';

describe('API Fournisseurs', () => {
  let authToken = null;

  beforeAll(async () => {
    // Connexion pour obtenir un token
    const loginResponse = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.data.tokens.accessToken;
    }
  });

  test('Serveur backend accessible', async () => {
    const response = await fetch(`${API_BASE_URL}/health`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('ok');
  });

  test('Authentification requise pour l\'API fournisseurs', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/suppliers`);
    expect(response.status).toBe(401);
  });

  test('Connexion avec utilisateur valide', async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'password123'
      })
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.tokens.accessToken).toBeDefined();
  });

  test('Récupération des fournisseurs avec authentification', async () => {
    if (!authToken) {
      throw new Error('Token d\'authentification non disponible');
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.suppliers)).toBe(true);
  });

  test('Création d\'un nouveau fournisseur', async () => {
    if (!authToken) {
      throw new Error('Token d\'authentification non disponible');
    }

    const newSupplier = {
      type: 'COMPANY',
      name: 'Test Supplier Jest',
      contactName: 'Test Contact',
      email: 'test@jest.com',
      phone: '01 00 00 00 00',
      address: '123 Test Street',
      city: 'Test City',
      country: 'France',
      paymentTerms: 30,
      discount: 0,
      currency: 'EUR',
      rating: 3,
      isActive: true,
      isPreferred: false,
      notes: 'Fournisseur créé par les tests Jest',
      tags: ['test', 'jest']
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/suppliers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newSupplier)
    });

    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(newSupplier.name);
    expect(data.data.id).toBeDefined();
  });
});
