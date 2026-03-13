const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStockSync() {
  try {
    console.log('🔍 Vérification des triggers de synchronisation...');
    
    // Vérifier les triggers existants
    const triggers = await prisma.$queryRaw`
      SELECT trigger_name, event_manipulation, event_object_table, action_statement
      FROM information_schema.triggers 
      WHERE trigger_schema = 'public' 
      AND (event_object_table = 'products' OR event_object_table = 'stocks')
      ORDER BY event_object_table, trigger_name;
    `;
    
    console.log('📋 Triggers trouvés:', triggers.length);
    triggers.forEach(trigger => {
      console.log(`  - ${trigger.trigger_name} sur ${trigger.event_object_table} (${trigger.event_manipulation})`);
    });
    
    // Vérifier quelques produits avec leurs stocks
    console.log('\n📦 Vérification de la cohérence des données...');
    const products = await prisma.product.findMany({
      where: { isService: false },
      include: { stock: true },
      take: 10
    });
    
    let inconsistencies = 0;
    let missingStocks = 0;
    
    products.forEach(product => {
      if (product.stock) {
        const stockMatch = product.stockQuantity === product.stock.quantiteActuelle;
        const minMatch = product.minStock === product.stock.quantiteMinimale;
        const maxMatch = product.maxStock === product.stock.quantiteMaximale;
        
        if (!stockMatch || !minMatch || !maxMatch) {
          inconsistencies++;
          console.log(`❌ ${product.name}:`);
          console.log(`   Stock: Product(${product.stockQuantity}) vs Stock(${product.stock.quantiteActuelle})`);
          console.log(`   Min: Product(${product.minStock}) vs Stock(${product.stock.quantiteMinimale})`);
          console.log(`   Max: Product(${product.maxStock}) vs Stock(${product.stock.quantiteMaximale})`);
        } else {
          console.log(`✅ ${product.name}: Cohérent`);
        }
      } else {
        console.log(`⚠️ ${product.name}: Pas d'enregistrement Stock`);
        missingStocks++;
      }
    });
    
    console.log(`\n📊 Résumé:`);
    console.log(`   - ${inconsistencies} incohérences trouvées`);
    console.log(`   - ${missingStocks} produits sans enregistrement Stock`);
    console.log(`   - ${products.length - inconsistencies - missingStocks} produits cohérents`);
    
    // Vérifier les API endpoints utilisés
    console.log('\n🔗 Analyse des sources de données...');
    console.log('   - Page produit: utilise product.stockQuantity (table Product)');
    console.log('   - Page stocks: utilise stock.quantiteActuelle (table Stock)');
    console.log('   - Hook unifié: utilise les deux sources selon le contexte');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkStockSync();
