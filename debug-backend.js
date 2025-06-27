console.log('🔍 Debug backend production...');

// Arrêter le backend actuel s'il tourne
console.log('🛑 Arrêt des processus Node.js...');

// Test simple de démarrage
console.log('🚀 Test démarrage simple...');

const fastify = require('fastify')({ logger: true });

// CORS - Standardized on port 3000
fastify.register(require('@fastify/cors'), {
  origin: ['http://localhost:3000'],
  credentials: true
});

// Support JSON
fastify.register(require('@fastify/formbody'));

// Routes essentielles
fastify.get('/health', async () => {
  return { 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Backend production debug OK'
  };
});

fastify.post('/auth/login', async (request) => {
  console.log('🔐 Login attempt:', request.body);
  const { email, password } = request.body;
  
  if (email === 'admin@demo-tpe.fr' && password === 'demo123') {
    return {
      success: true,
      data: {
        user: {
          id: '1',
          email: 'admin@demo-tpe.fr',
          firstName: 'Admin',
          lastName: 'Demo',
          role: 'ADMIN'
        },
        tokens: {
          accessToken: 'debug-token-' + Date.now(),
          refreshToken: 'debug-refresh-' + Date.now()
        }
      },
      message: 'Connexion réussie'
    };
  }
  
  throw new Error('Identifiants incorrects');
});

fastify.get('/dashboard/stats', async () => {
  return {
    success: true,
    data: {
      clients: {
        total: 15,
        individuals: 8,
        companies: 7,
        recentCount: 3,
        growth: 12.5
      },
      products: {
        total: 25,
        inStock: 20,
        lowStock: 3,
        outOfStock: 2,
        totalStockValue: 125000
      },
      sales: {
        currentMonth: 45000,
        previousMonth: 38000,
        growth: 18.4,
        currency: 'DZD'
      },
      orders: {
        total: 12,
        pending: 3,
        accepted: 8,
        rejected: 1,
        averageValue: 3750
      },
      invoices: {
        total: 18,
        paid: 12,
        pending: 4,
        overdue: 2,
        totalAmount: 67500,
        paidAmount: 45000,
        pendingAmount: 22500
      },
      lastUpdated: new Date().toISOString()
    }
  };
});

// Démarrage
async function start() {
  try {
    console.log('🚀 Démarrage backend debug...');
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✅ Backend debug démarré sur port 3001');
    console.log('🔗 Health: http://localhost:3001/health');
    console.log('🔐 Login: POST http://localhost:3001/auth/login');
    console.log('📊 Dashboard: GET http://localhost:3001/dashboard/stats');
    console.log('👤 Test: admin@demo-tpe.fr / demo123');
  } catch (error) {
    console.error('❌ Erreur démarrage:', error);
    process.exit(1);
  }
}

start();
