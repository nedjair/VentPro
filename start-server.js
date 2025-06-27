// Script de démarrage simple du serveur
require('dotenv').config();

const { createServer } = require('./apps/backend/src/server');

async function startServer() {
  try {
    console.log('🚀 Démarrage du serveur...');
    
    const server = await createServer();
    
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '3001', 10);

    await server.listen({ host, port });
    
    console.log(`✅ Serveur démarré sur http://${host}:${port}`);
    console.log(`📚 Documentation API: http://${host}:${port}/docs`);
    console.log(`🏥 Health check: http://${host}:${port}/health`);
    
  } catch (error) {
    console.error('❌ Erreur lors du démarrage:', error.message);
    process.exit(1);
  }
}

startServer();
