/**
 * Script d'initialisation des données de production
 * Crée l'utilisateur admin et les données de base nécessaires
 */

const { PrismaClient } = require('./packages/database/generated/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function seedProductionData() {
  try {
    log('🌱 Initialisation des données de production...', 'blue')
    
    // Créer l'entreprise principale
    const company = await prisma.company.upsert({
      where: { siret: '12345678901234' },
      update: {
        name: 'GC TPE SARL',
        address: '123 Rue Didouche Mourad',
        city: 'Alger',
        postalCode: '16000',
        phone: '+213 21 123 456',
        email: 'contact@gctpe.dz',
        country: 'Algérie',
      },
      create: {
        id: 'company-gctpe',
        name: 'GC TPE SARL',
        address: '123 Rue Didouche Mourad',
        city: 'Alger',
        postalCode: '16000',
        phone: '+213 21 123 456',
        email: 'contact@gctpe.dz',
        siret: '12345678901234',
        country: 'Algérie',
      }
    })
    
    log(`✅ Entreprise: ${company.name}`, 'green')
    
    // Créer l'utilisateur admin avec mot de passe hashé
    const hashedPassword = await bcrypt.hash('admin123', 12)
    
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@gctpe.dz' },
      update: {
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'GCTPE',
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email: 'admin@gctpe.dz',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'GCTPE',
        role: 'ADMIN',
        isActive: true,
        companyId: company.id,
      }
    })
    
    log(`✅ Utilisateur admin: ${adminUser.email}`, 'green')
    
    // Créer les catégories de base
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { id: 'cat-informatique' },
        update: {},
        create: {
          id: 'cat-informatique',
          name: 'Informatique',
          description: 'Matériel informatique et accessoires',
          companyId: company.id,
        }
      }),
      prisma.category.upsert({
        where: { id: 'cat-bureautique' },
        update: {},
        create: {
          id: 'cat-bureautique',
          name: 'Bureautique',
          description: 'Fournitures de bureau et équipements',
          companyId: company.id,
        }
      }),
      prisma.category.upsert({
        where: { id: 'cat-mobilier' },
        update: {},
        create: {
          id: 'cat-mobilier',
          name: 'Mobilier',
          description: 'Mobilier de bureau et équipements',
          companyId: company.id,
        }
      })
    ])
    
    log(`✅ ${categories.length} catégories créées`, 'green')
    
    // Créer quelques produits de base
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 'prod-ordinateur-dell' },
        update: {},
        create: {
          id: 'prod-ordinateur-dell',
          name: 'Ordinateur Portable Dell Latitude 5520',
          description: 'Ordinateur portable professionnel 15.6" Intel Core i5-1135G7, 8GB RAM, 256GB SSD',
          sku: 'DELL-LAT-5520',
          price: 89999.99, // Prix en DZD
          cost: 65000.00,
          stockQuantity: 15,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-souris-logitech' },
        update: {},
        create: {
          id: 'prod-souris-logitech',
          name: 'Souris Logitech MX Master 3',
          description: 'Souris sans fil ergonomique pour professionnels avec défilement ultra-rapide',
          sku: 'LOG-MX3-001',
          price: 7999.99, // Prix en DZD
          cost: 4500.00,
          stockQuantity: 50,
          minStock: 10,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-clavier-corsair' },
        update: {},
        create: {
          id: 'prod-clavier-corsair',
          name: 'Clavier Mécanique Corsair K95 RGB',
          description: 'Clavier mécanique RGB pour gaming et bureautique avec switches Cherry MX',
          sku: 'COR-K95-RGB',
          price: 12999.99, // Prix en DZD
          cost: 8500.00,
          stockQuantity: 25,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-ecran-dell' },
        update: {},
        create: {
          id: 'prod-ecran-dell',
          name: 'Écran Dell UltraSharp 24" U2422H',
          description: 'Moniteur professionnel 24 pouces Full HD IPS avec hub USB-C',
          sku: 'DELL-U2422H',
          price: 19999.99, // Prix en DZD
          cost: 14000.00,
          stockQuantity: 8,
          minStock: 3,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-imprimante-hp' },
        update: {},
        create: {
          id: 'prod-imprimante-hp',
          name: 'Imprimante HP LaserJet Pro M404dn',
          description: 'Imprimante laser monochrome professionnelle avec réseau',
          sku: 'HP-LJ-M404DN',
          price: 24999.99, // Prix en DZD
          cost: 18000.00,
          stockQuantity: 12,
          minStock: 3,
          unit: 'pièce',
          categoryId: categories[1].id,
          companyId: company.id,
        }
      })
    ])
    
    log(`✅ ${products.length} produits créés`, 'green')
    
    // Créer quelques clients de base
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { id: 'client-ahmed-benali' },
        update: {},
        create: {
          id: 'client-ahmed-benali',
          type: 'INDIVIDUAL',
          firstName: 'Ahmed',
          lastName: 'Benali',
          email: 'ahmed.benali@email.dz',
          phone: '+213 555 123 456',
          address: '123 Rue Didouche Mourad',
          city: 'Alger',
          postalCode: '16000',
          country: 'Algérie',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-sonatrach' },
        update: {},
        create: {
          id: 'client-sonatrach',
          type: 'COMPANY',
          companyName: 'Sonatrach',
          email: 'contact@sonatrach.dz',
          phone: '+213 21 987 654',
          address: '456 Avenue de l\'Indépendance',
          city: 'Alger',
          postalCode: '16000',
          country: 'Algérie',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-fatima-zerrouki' },
        update: {},
        create: {
          id: 'client-fatima-zerrouki',
          type: 'INDIVIDUAL',
          firstName: 'Fatima',
          lastName: 'Zerrouki',
          email: 'fatima.zerrouki@email.dz',
          phone: '+213 555 987 654',
          address: '789 Boulevard Mohamed V',
          city: 'Oran',
          postalCode: '31000',
          country: 'Algérie',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-algerie-telecom' },
        update: {},
        create: {
          id: 'client-algerie-telecom',
          type: 'COMPANY',
          companyName: 'Algérie Télécom',
          email: 'contact@at.dz',
          phone: '+213 21 444 555',
          address: '321 Rue de l\'Innovation',
          city: 'Constantine',
          postalCode: '25000',
          country: 'Algérie',
          companyId: company.id,
        }
      })
    ])
    
    log(`✅ ${clients.length} clients créés`, 'green')
    
    // Créer quelques fournisseurs de base
    const suppliers = await Promise.all([
      prisma.supplier.upsert({
        where: { id: 'supplier-tech-alger' },
        update: {},
        create: {
          id: 'supplier-tech-alger',
          type: 'COMPANY',
          name: 'Tech Supplier Alger',
          email: 'contact@techsupplier.dz',
          phone: '+213 21 123 456',
          address: '123 Rue de la Technologie',
          city: 'Alger',
          postalCode: '16000',
          country: 'Algérie',
          contactName: 'Karim Benaissa',
          paymentTerms: 30,
          isActive: true,
          isPreferred: true,
          companyId: company.id,
        },
      }),
      prisma.supplier.upsert({
        where: { id: 'supplier-office-oran' },
        update: {},
        create: {
          id: 'supplier-office-oran',
          type: 'COMPANY',
          name: 'Office Supply Oran',
          email: 'info@officesupply.dz',
          phone: '+213 41 987 654',
          address: '456 Boulevard de l\'ANP',
          city: 'Oran',
          postalCode: '31000',
          country: 'Algérie',
          contactName: 'Fatima Zerrouki',
          paymentTerms: 45,
          isActive: true,
          isPreferred: false,
          companyId: company.id,
        },
      }),
      prisma.supplier.upsert({
        where: { id: 'supplier-import-constantine' },
        update: {},
        create: {
          id: 'supplier-import-constantine',
          type: 'COMPANY',
          name: 'Import Tech Constantine',
          email: 'sales@importtech.dz',
          phone: '+213 31 555 777',
          address: '789 Avenue de l\'Indépendance',
          city: 'Constantine',
          postalCode: '25000',
          country: 'Algérie',
          contactName: 'Mohamed Brahim',
          paymentTerms: 60,
          isActive: true,
          isPreferred: false,
          companyId: company.id,
        },
      })
    ])
    
    log(`✅ ${suppliers.length} fournisseurs créés`, 'green')
    
    log('\n🎉 Données de production initialisées avec succès !', 'green')
    log('=' * 50, 'green')
    log('📧 Utilisateur admin: admin@gctpe.dz', 'cyan')
    log('🔑 Mot de passe: admin123', 'cyan')
    log(`🏢 Entreprise: ${company.name}`, 'cyan')
    log(`📊 Données créées:`, 'cyan')
    log(`   - ${categories.length} catégories`, 'cyan')
    log(`   - ${products.length} produits`, 'cyan')
    log(`   - ${clients.length} clients`, 'cyan')
    log(`   - ${suppliers.length} fournisseurs`, 'cyan')
    
    return true
    
  } catch (error) {
    log(`❌ Erreur lors de l'initialisation: ${error.message}`, 'red')
    console.error(error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
if (require.main === module) {
  seedProductionData()
    .then(() => {
      log('\n✅ Script terminé avec succès', 'green')
      process.exit(0)
    })
    .catch((error) => {
      log('\n❌ Erreur fatale:', 'red')
      console.error(error)
      process.exit(1)
    })
}

module.exports = { seedProductionData }
