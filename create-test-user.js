/**
 * Script pour créer un utilisateur de test
 * Utilise directement Prisma pour créer l'utilisateur admin@gctpe.dz
 */

const { PrismaClient } = require('../packages/database/generated/client')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    console.log('🔧 Création de l\'utilisateur de test...')

    // Créer une entreprise de test
    const company = await prisma.company.upsert({
      where: { siret: '12345678901234' },
      update: {
        name: 'GC TPE SARL',
        address: '123 Rue de la Paix',
        city: 'Alger',
        postalCode: '16000',
        phone: '+213 21 123 456',
        email: 'contact@gctpe.dz',
        country: 'Algérie',
      },
      create: {
        id: 'company-gctpe',
        name: 'GC TPE SARL',
        address: '123 Rue de la Paix',
        city: 'Alger',
        postalCode: '16000',
        phone: '+213 21 123 456',
        email: 'contact@gctpe.dz',
        siret: '12345678901234',
        country: 'Algérie',
      }
    })

    console.log('✅ Entreprise créée:', company.name)

    // Créer un utilisateur admin avec le mot de passe en clair (pour les tests)
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@gctpe.dz' },
      update: {
        password: 'admin123', // Mot de passe en clair pour les tests
        firstName: 'Admin',
        lastName: 'GCTPE',
        role: 'ADMIN',
        isActive: true,
      },
      create: {
        email: 'admin@gctpe.dz',
        password: 'admin123', // Mot de passe en clair pour les tests
        firstName: 'Admin',
        lastName: 'GCTPE',
        role: 'ADMIN',
        isActive: true,
        companyId: company.id,
      }
    })

    console.log('✅ Utilisateur admin créé:', adminUser.email)

    // Créer quelques données de test
    console.log('📊 Création de données de test...')

    // Créer une catégorie
    const category = await prisma.category.upsert({
      where: { id: 'cat-informatique' },
      update: {},
      create: {
        id: 'cat-informatique',
        name: 'Informatique',
        description: 'Matériel informatique et accessoires',
        companyId: company.id,
      }
    })

    // Créer quelques produits
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 'prod-ordinateur' },
        update: {},
        create: {
          id: 'prod-ordinateur',
          name: 'Ordinateur Portable Dell',
          description: 'Ordinateur portable professionnel',
          sku: 'DELL-001',
          price: 89999.99, // Prix en DZD
          cost: 65000.00,
          stockQuantity: 15,
          minStock: 5,
          unit: 'pièce',
          categoryId: category.id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-souris' },
        update: {},
        create: {
          id: 'prod-souris',
          name: 'Souris Logitech',
          description: 'Souris sans fil ergonomique',
          sku: 'LOG-001',
          price: 7999.99, // Prix en DZD
          cost: 4500.00,
          stockQuantity: 50,
          minStock: 10,
          unit: 'pièce',
          categoryId: category.id,
          companyId: company.id,
        }
      })
    ])

    // Créer quelques clients
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { id: 'client-ahmed' },
        update: {},
        create: {
          id: 'client-ahmed',
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
      })
    ])

    // Créer quelques fournisseurs
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
      })
    ])

    console.log('✅ Données de test créées:')
    console.log(`   - ${products.length} produits`)
    console.log(`   - ${clients.length} clients`)
    console.log(`   - ${suppliers.length} fournisseurs`)
    console.log(`   - 1 catégorie`)

    console.log('\n🎉 Utilisateur de test créé avec succès !')
    console.log('📧 Email: admin@gctpe.dz')
    console.log('🔑 Mot de passe: admin123')

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur de test:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('\n✅ Script terminé avec succès')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Erreur fatale:', error)
      process.exit(1)
    })
}

module.exports = { createTestUser }
