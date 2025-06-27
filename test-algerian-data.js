#!/usr/bin/env node

/**
 * Test simple pour vérifier les données algériennes dans la base
 */

// Charger les variables d'environnement depuis la racine
require('dotenv').config({ path: './.env' });

const { PrismaClient } = require('./packages/database/generated/client');

const prisma = new PrismaClient();

async function testAlgerianData() {
  console.log('🇩🇿 TEST DES DONNÉES ALGÉRIENNES');
  console.log('================================');
  
  try {
    await prisma.$connect();
    console.log('✅ Connexion PostgreSQL établie');
    
    // Test des entreprises
    const companies = await prisma.company.findMany();
    console.log(`\n📊 ENTREPRISES: ${companies.length}`);
    companies.forEach(company => {
      console.log(`   - ${company.name} (${company.city}, ${company.country})`);
    });
    
    // Test des utilisateurs
    const users = await prisma.user.findMany({
      include: { company: true }
    });
    console.log(`\n👥 UTILISATEURS: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
    });
    
    // Test des catégories
    const categories = await prisma.category.findMany();
    console.log(`\n📂 CATÉGORIES: ${categories.length}`);
    categories.forEach(category => {
      console.log(`   - ${category.name}`);
    });
    
    // Test des produits
    const products = await prisma.product.findMany({
      include: { category: true, supplier: true }
    });
    console.log(`\n📦 PRODUITS: ${products.length}`);
    products.slice(0, 5).forEach(product => {
      console.log(`   - ${product.name} (${product.price} DA) - ${product.category?.name || 'Sans catégorie'}`);
    });
    if (products.length > 5) {
      console.log(`   ... et ${products.length - 5} autres produits`);
    }
    
    // Test des clients
    const clients = await prisma.client.findMany();
    console.log(`\n👥 CLIENTS: ${clients.length}`);
    const individualClients = clients.filter(c => c.type === 'INDIVIDUAL');
    const companyClients = clients.filter(c => c.type === 'COMPANY');
    console.log(`   - Particuliers: ${individualClients.length}`);
    console.log(`   - Entreprises: ${companyClients.length}`);
    
    // Test des fournisseurs
    const suppliers = await prisma.supplier.findMany();
    console.log(`\n🏭 FOURNISSEURS: ${suppliers.length}`);
    suppliers.slice(0, 3).forEach(supplier => {
      console.log(`   - ${supplier.name} (${supplier.city})`);
    });
    
    // Test des stocks
    const stocks = await prisma.stock.findMany({
      include: { product: true }
    });
    console.log(`\n📊 STOCKS: ${stocks.length}`);
    
    // Statistiques des stocks
    const lowStocks = stocks.filter(s => s.quantiteActuelle <= s.quantiteMinimale);
    const outOfStock = stocks.filter(s => s.quantiteActuelle === 0);
    
    console.log(`   - Stock bas: ${lowStocks.length}`);
    console.log(`   - Rupture de stock: ${outOfStock.length}`);
    
    // Test des mouvements de stock
    const stockMovements = await prisma.stockMovement.findMany({
      include: { product: true }
    });
    console.log(`\n📈 MOUVEMENTS DE STOCK: ${stockMovements.length}`);
    
    // Résumé final
    console.log('\n🎉 RÉSUMÉ DES DONNÉES ALGÉRIENNES');
    console.log('=================================');
    console.log(`✅ Entreprises: ${companies.length}`);
    console.log(`✅ Utilisateurs: ${users.length}`);
    console.log(`✅ Catégories: ${categories.length}`);
    console.log(`✅ Produits: ${products.length}`);
    console.log(`✅ Clients: ${clients.length}`);
    console.log(`✅ Fournisseurs: ${suppliers.length}`);
    console.log(`✅ Stocks: ${stocks.length}`);
    console.log(`✅ Mouvements: ${stockMovements.length}`);
    
    const total = companies.length + users.length + categories.length + 
                  products.length + clients.length + suppliers.length + 
                  stocks.length + stockMovements.length;
    
    console.log(`\n📊 TOTAL: ${total} enregistrements`);
    
    if (total > 50) {
      console.log('🎯 Objectif de 50+ enregistrements atteint !');
    } else {
      console.log('⚠️  Moins de 50 enregistrements trouvés');
    }
    
    // Vérification des données algériennes
    const algerianCompanies = companies.filter(c => c.country === 'Algérie');
    const algerianClients = clients.filter(c => c.country === 'Algérie');
    const algerianSuppliers = suppliers.filter(c => c.country === 'Algérie');
    
    console.log('\n🇩🇿 VÉRIFICATION DONNÉES ALGÉRIENNES:');
    console.log(`   - Entreprises algériennes: ${algerianCompanies.length}/${companies.length}`);
    console.log(`   - Clients algériens: ${algerianClients.length}/${clients.length}`);
    console.log(`   - Fournisseurs algériens: ${algerianSuppliers.length}/${suppliers.length}`);
    
    // Vérification de la devise
    const daCompanies = companies.filter(c => c.currency === 'DA');
    console.log(`   - Entreprises en DA: ${daCompanies.length}/${companies.length}`);
    
    if (algerianCompanies.length > 0 && algerianClients.length > 0 && daCompanies.length > 0) {
      console.log('✅ Données algériennes correctement configurées !');
    } else {
      console.log('⚠️  Problème avec la configuration algérienne');
    }
    
    console.log('\n🔗 INFORMATIONS DE CONNEXION:');
    console.log('   Email: admin@gestion-dz.com');
    console.log('   Mot de passe: admin123');
    console.log('   URL: http://localhost:3000');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
  
  return true;
}

// Exécution
testAlgerianData().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
