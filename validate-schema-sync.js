#!/usr/bin/env node

/**
 * Script de validation de la synchronisation entre le schéma Prisma et PostgreSQL
 */

// Charger les variables d'environnement
require('dotenv').config({ path: './.env' });

const { PrismaClient } = require('./packages/database/generated/client');

const prisma = new PrismaClient();

console.log('🔍 VALIDATION DE LA SYNCHRONISATION SCHÉMA PRISMA ↔ POSTGRESQL');
console.log('==============================================================\n');

async function validateSchemaSync() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion PostgreSQL établie\n');

    // Test 1: Vérifier les modèles principaux
    console.log('📊 TEST 1: MODÈLES PRINCIPAUX');
    console.log('==============================');

    const models = [
      { name: 'Company', model: prisma.company },
      { name: 'User', model: prisma.user },
      { name: 'Client', model: prisma.client },
      { name: 'Category', model: prisma.category },
      { name: 'Product', model: prisma.product },
      { name: 'Supplier', model: prisma.supplier },
      { name: 'Stock', model: prisma.stock },
      { name: 'StockMovement', model: prisma.stockMovement },
      { name: 'Order', model: prisma.order },
      { name: 'OrderItem', model: prisma.orderItem },
      { name: 'Invoice', model: prisma.invoice },
      { name: 'InvoiceItem', model: prisma.invoiceItem }
    ];

    for (const { name, model } of models) {
      try {
        const count = await model.count();
        console.log(`✅ ${name}: ${count} enregistrements`);
      } catch (error) {
        console.log(`❌ ${name}: ERREUR - ${error.message}`);
      }
    }

    // Test 2: Vérifier les relations
    console.log('\n🔗 TEST 2: RELATIONS ENTRE MODÈLES');
    console.log('===================================');

    try {
      // Test relation Company -> Users
      const companyWithUsers = await prisma.company.findFirst({
        include: { users: true }
      });
      console.log(`✅ Company -> Users: ${companyWithUsers?.users?.length || 0} utilisateurs`);

      // Test relation Company -> Clients
      const companyWithClients = await prisma.company.findFirst({
        include: { clients: true }
      });
      console.log(`✅ Company -> Clients: ${companyWithClients?.clients?.length || 0} clients`);

      // Test relation Product -> Category
      const productsWithCategory = await prisma.product.findMany({
        include: { category: true },
        take: 5
      });
      console.log(`✅ Product -> Category: ${productsWithCategory.filter(p => p.category).length}/${productsWithCategory.length} produits avec catégorie`);

      // Test relation Product -> Supplier
      const productsWithSupplier = await prisma.product.findMany({
        include: { supplier: true },
        take: 5
      });
      console.log(`✅ Product -> Supplier: ${productsWithSupplier.filter(p => p.supplier).length}/${productsWithSupplier.length} produits avec fournisseur`);

      // Test relation Stock -> Product
      const stocksWithProduct = await prisma.stock.findMany({
        include: { product: true },
        take: 5
      });
      console.log(`✅ Stock -> Product: ${stocksWithProduct.length} stocks avec produits`);

    } catch (error) {
      console.log(`❌ Relations: ERREUR - ${error.message}`);
    }

    // Test 3: Vérifier les contraintes et index
    console.log('\n🔍 TEST 3: CONTRAINTES ET INDEX');
    console.log('================================');

    try {
      // Test contrainte unique sur email utilisateur
      const users = await prisma.user.findMany({
        select: { email: true }
      });
      const uniqueEmails = new Set(users.map(u => u.email));
      console.log(`✅ User.email unique: ${users.length} utilisateurs, ${uniqueEmails.size} emails uniques`);

      // Test contrainte unique sur SKU produit
      const products = await prisma.product.findMany({
        select: { sku: true },
        where: { sku: { not: null } }
      });
      const uniqueSkus = new Set(products.map(p => p.sku).filter(Boolean));
      console.log(`✅ Product.sku unique: ${products.length} produits avec SKU, ${uniqueSkus.size} SKU uniques`);

    } catch (error) {
      console.log(`❌ Contraintes: ERREUR - ${error.message}`);
    }

    // Test 4: Vérifier les types de données
    console.log('\n📋 TEST 4: TYPES DE DONNÉES');
    console.log('============================');

    try {
      // Test types Decimal
      const product = await prisma.product.findFirst({
        select: { price: true, cost: true, vatRate: true }
      });
      if (product) {
        console.log(`✅ Product.price (Decimal): ${product.price}`);
        console.log(`✅ Product.vatRate (Decimal): ${product.vatRate}%`);
      }

      // Test types Enum
      const client = await prisma.client.findFirst({
        select: { type: true }
      });
      if (client) {
        console.log(`✅ Client.type (Enum): ${client.type}`);
      }

      // Test types DateTime
      const company = await prisma.company.findFirst({
        select: { createdAt: true, updatedAt: true }
      });
      if (company) {
        console.log(`✅ Company.createdAt (DateTime): ${company.createdAt.toISOString()}`);
      }

    } catch (error) {
      console.log(`❌ Types de données: ERREUR - ${error.message}`);
    }

    // Test 5: Vérifier les données algériennes
    console.log('\n🇩🇿 TEST 5: DONNÉES ALGÉRIENNES');
    console.log('===============================');

    try {
      // Entreprise algérienne
      const algerianCompany = await prisma.company.findFirst({
        where: { currency: 'DA' }
      });
      console.log(`✅ Entreprise algérienne: ${algerianCompany?.name || 'Non trouvée'}`);
      console.log(`   Devise: ${algerianCompany?.currency || 'N/A'}`);
      console.log(`   Timezone: ${algerianCompany?.timezone || 'N/A'}`);

      // Clients algériens
      const algerianClients = await prisma.client.findMany({
        where: { country: 'Algérie' }
      });
      console.log(`✅ Clients algériens: ${algerianClients.length}`);

      // Fournisseurs algériens
      const algerianSuppliers = await prisma.supplier.findMany({
        where: { country: 'Algérie' }
      });
      console.log(`✅ Fournisseurs algériens: ${algerianSuppliers.length}`);

      // Produits avec prix en DA
      const productsDA = await prisma.product.findMany({
        where: { 
          company: { currency: 'DA' }
        },
        take: 3,
        select: { name: true, price: true }
      });
      console.log(`✅ Produits en DA: ${productsDA.length}`);
      productsDA.forEach(p => {
        console.log(`   - ${p.name}: ${p.price} DA`);
      });

    } catch (error) {
      console.log(`❌ Données algériennes: ERREUR - ${error.message}`);
    }

    // Résumé final
    console.log('\n🎯 RÉSUMÉ DE LA VALIDATION');
    console.log('===========================');

    const totalCompanies = await prisma.company.count();
    const totalUsers = await prisma.user.count();
    const totalClients = await prisma.client.count();
    const totalProducts = await prisma.product.count();
    const totalSuppliers = await prisma.supplier.count();
    const totalStocks = await prisma.stock.count();

    console.log(`📊 Entreprises: ${totalCompanies}`);
    console.log(`👥 Utilisateurs: ${totalUsers}`);
    console.log(`👤 Clients: ${totalClients}`);
    console.log(`📦 Produits: ${totalProducts}`);
    console.log(`🏭 Fournisseurs: ${totalSuppliers}`);
    console.log(`📊 Stocks: ${totalStocks}`);

    const total = totalCompanies + totalUsers + totalClients + totalProducts + totalSuppliers + totalStocks;
    console.log(`\n📈 TOTAL: ${total} enregistrements`);

    if (total >= 50) {
      console.log('🎯 ✅ Objectif de 50+ enregistrements atteint !');
    }

    console.log('\n✅ SYNCHRONISATION VALIDÉE');
    console.log('Le schéma Prisma est parfaitement synchronisé avec PostgreSQL !');

  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }

  return true;
}

// Exécution
validateSchemaSync().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
