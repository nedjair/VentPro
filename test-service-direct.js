// Test direct du service ClientService
const path = require('path');

// Simuler l'environnement du backend
process.env.DATABASE_URL = 'postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale';

// Importer le service
const { ClientService } = require('./apps/backend/src/services/client.service.ts');

async function testClientService() {
  try {
    console.log('🔍 Test direct du ClientService...');
    
    const companyId = 'cmc5ai3bz00006s97c92d77ps';
    
    // Simuler les paramètres comme dans l'endpoint
    const filters = {
      search: undefined,
      type: undefined,
      city: undefined,
      isActive: undefined,
    };
    
    const pagination = {
      page: parseInt('1'),
      limit: parseInt('10'),
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    
    console.log('📋 Paramètres:');
    console.log('- CompanyId:', companyId);
    console.log('- Filters:', filters);
    console.log('- Pagination:', pagination);
    
    console.log('\n🚀 Appel du service...');
    const result = await ClientService.getClients(companyId, filters, pagination);
    
    console.log('✅ Succès! Résultat:');
    console.log('- Nombre de clients:', result.data.length);
    console.log('- Total:', result.pagination.total);
    console.log('- Page:', result.pagination.page);
    console.log('- Limit:', result.pagination.limit);
    
    if (result.data.length > 0) {
      console.log('\n👤 Premier client:');
      const client = result.data[0];
      console.log('- ID:', client.id);
      console.log('- Type:', client.type);
      console.log('- Nom:', client.firstName || client.companyName);
    }
    
  } catch (error) {
    console.error('❌ Erreur dans le service:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

testClientService();
