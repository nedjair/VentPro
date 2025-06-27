// Test simple du frontend Express.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

// Configuration EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend-express-production', 'views'));

// Fichiers statiques
app.use(express.static(path.join(__dirname, 'frontend-express-production', 'public')));

// Variables globales pour les templates
app.locals.appName = 'Gestion Commerciale TPE';
app.locals.version = '1.0.0';
app.locals.apiBaseUrl = 'http://localhost:3001';
app.locals.nodeEnv = 'development';

// Route de test
app.get('/', (req, res) => {
  res.render('dashboard', {
    title: 'Dashboard',
    page: 'dashboard',
    user: null
  });
});

// Route health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Frontend Express.js test'
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Test Frontend Express.js démarré sur http://localhost:${PORT}`);
});
