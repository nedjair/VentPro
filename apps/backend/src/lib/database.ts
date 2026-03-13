import { prisma } from './prisma'
import { logger } from '../utils/logger'

// Utiliser le client Prisma centralisé
export { prisma }

// Log des requêtes en développement
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore - Ignorer l'erreur de type pour l'événement 'query'
  prisma.$on('query', (e: any) => {
    logger.debug('Query: ' + e.query)
    logger.debug('Params: ' + e.params)
    logger.debug('Duration: ' + e.duration + 'ms')
  })
}

// Fonction pour tester la connexion
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    logger.info('✅ Connexion à la base de données réussie')
    return true
  } catch (error) {
    logger.error('❌ Erreur de connexion à la base de données:', error)
    return false
  }
}

// Fonction pour fermer la connexion
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect()
    logger.info('🔌 Connexion à la base de données fermée')
  } catch (error) {
    logger.error('❌ Erreur lors de la fermeture de la connexion:', error)
  }
}

// Fonction pour initialiser la base de données avec des données de test
export async function seedDatabase(): Promise<void> {
  try {
    logger.info('🌱 Initialisation de la base de données...')

    // Sécurité de compatibilité : le backend historique tente d'initialiser
    // l'ancien schéma Prisma (tables `companies`, `users`, `products`, ...).
    // Dans l'environnement PostgreSQL réellement utilisé en local, ce schéma
    // n'existe pas. On détecte donc sa présence avant de lancer le seed pour
    // éviter un bruit d'erreur inutile au démarrage.
    const legacyCompaniesTable = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'companies'
      ) AS exists
    `

    if (!legacyCompaniesTable[0]?.exists) {
      logger.info('ℹ️ Seed legacy ignoré : la table public.companies n’existe pas dans la base locale active')
      return
    }

    // Vérifier si des données existent déjà
    const existingCompany = await prisma.company.findFirst()
    if (existingCompany) {
      logger.info('✅ Base de données déjà initialisée')
      logger.info(`🏢 Entreprise existante: ${existingCompany.name}`)
      return
    }

    logger.info('🌱 Première initialisation de la base de données...')

    // Créer une entreprise de test
    const company = await prisma.company.upsert({
      where: { siret: '12345678901234' },
      update: {
        name: 'Entreprise de Test SARL',
        address: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        phone: '01 23 45 67 89',
        email: 'contact@entreprise-test.fr',
        country: 'France',
      },
      create: {
        id: 'company-test',
        name: 'Entreprise de Test SARL',
        address: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        phone: '01 23 45 67 89',
        email: 'contact@entreprise-test.fr',
        siret: '12345678901234',
        country: 'France',
      }
    })

    // Créer un utilisateur admin
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('password123', 10)

    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@test.com' },
      update: {},
      create: {
        email: 'admin@test.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        companyId: company.id,
      }
    })

    // Créer des catégories
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
          description: 'Fournitures de bureau',
          companyId: company.id,
        }
      })
    ])

    // Créer des produits
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 'prod-ordinateur' },
        update: {
          name: 'Ordinateur Portable Dell Latitude',
          description: 'Ordinateur portable professionnel 15.6" Intel Core i5',
          price: 899.99,
          cost: 650.00,
          stockQuantity: 15,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        },
        create: {
          id: 'prod-ordinateur',
          name: 'Ordinateur Portable Dell Latitude',
          description: 'Ordinateur portable professionnel 15.6" Intel Core i5',
          sku: 'DELL-LAT-001',
          price: 899.99,
          cost: 650.00,
          stockQuantity: 15,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-souris' },
        update: {
          name: 'Souris Logitech MX Master 3',
          description: 'Souris sans fil ergonomique pour professionnels',
          price: 79.99,
          cost: 45.00,
          stockQuantity: 50,
          minStock: 10,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        },
        create: {
          id: 'prod-souris',
          name: 'Souris Logitech MX Master 3',
          description: 'Souris sans fil ergonomique pour professionnels',
          sku: 'LOG-MX3-001',
          price: 79.99,
          cost: 45.00,
          stockQuantity: 50,
          minStock: 10,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-clavier' },
        update: {
          name: 'Clavier Mécanique Corsair K95',
          description: 'Clavier mécanique RGB pour gaming et bureautique',
          price: 129.99,
          cost: 85.00,
          stockQuantity: 25,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        },
        create: {
          id: 'prod-clavier',
          name: 'Clavier Mécanique Corsair K95',
          description: 'Clavier mécanique RGB pour gaming et bureautique',
          sku: 'COR-K95-001',
          price: 129.99,
          cost: 85.00,
          stockQuantity: 25,
          minStock: 5,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      }),
      prisma.product.upsert({
        where: { id: 'prod-ecran' },
        update: {
          name: 'Écran Dell UltraSharp 24"',
          description: 'Moniteur professionnel 24 pouces Full HD IPS',
          price: 199.99,
          cost: 140.00,
          stockQuantity: 8,
          minStock: 3,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        },
        create: {
          id: 'prod-ecran',
          name: 'Écran Dell UltraSharp 24"',
          description: 'Moniteur professionnel 24 pouces Full HD IPS',
          sku: 'DELL-U24-001',
          price: 199.99,
          cost: 140.00,
          stockQuantity: 8,
          minStock: 3,
          unit: 'pièce',
          categoryId: categories[0].id,
          companyId: company.id,
        }
      })
    ])

    // Créer des clients
    const clients = await Promise.all([
      prisma.client.upsert({
        where: { id: 'client-jean' },
        update: {},
        create: {
          id: 'client-jean',
          type: 'INDIVIDUAL',
          firstName: 'Jean',
          lastName: 'Dupont',
          email: 'jean.dupont@email.com',
          phone: '01 23 45 67 89',
          address: '123 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-acme' },
        update: {},
        create: {
          id: 'client-acme',
          type: 'COMPANY',
          companyName: 'ACME Corporation',
          email: 'contact@acme.com',
          phone: '01 98 76 54 32',
          address: '456 Avenue des Entreprises',
          city: 'Lyon',
          postalCode: '69000',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-marie' },
        update: {},
        create: {
          id: 'client-marie',
          type: 'INDIVIDUAL',
          firstName: 'Marie',
          lastName: 'Martin',
          email: 'marie.martin@email.com',
          phone: '01 55 66 77 88',
          address: '789 Boulevard du Commerce',
          city: 'Marseille',
          postalCode: '13000',
          companyId: company.id,
        }
      }),
      prisma.client.upsert({
        where: { id: 'client-techstart' },
        update: {},
        create: {
          id: 'client-techstart',
          type: 'COMPANY',
          companyName: 'TechStart SARL',
          email: 'info@techstart.fr',
          phone: '01 44 33 22 11',
          address: '321 Rue de l\'Innovation',
          city: 'Toulouse',
          postalCode: '31000',
          companyId: company.id,
        }
      })
    ])

    // Créer des fournisseurs
    const suppliers = await Promise.all([
      prisma.supplier.upsert({
        where: { id: 'supplier-tech-france' },
        update: {
          name: 'Tech Supplier France',
          phone: '+33123456789',
          address: '123 Rue de la Technologie',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          contactName: 'Jean Dupont',
          paymentTerms: 30,
          isActive: true,
          companyId: company.id,
        },
        create: {
          id: 'supplier-tech-france',
          name: 'Tech Supplier France',
          email: 'contact@techsupplier.fr',
          phone: '+33123456789',
          address: '123 Rue de la Technologie',
          city: 'Paris',
          postalCode: '75001',
          country: 'France',
          contactName: 'Jean Dupont',
          paymentTerms: 30,
          isActive: true,
          companyId: company.id,
        },
      }),
      prisma.supplier.upsert({
        where: { id: 'supplier-office-intl' },
        update: {
          name: 'Office Supply International',
          phone: '+33987654321',
          address: '456 Avenue des Bureaux',
          city: 'Lyon',
          postalCode: '69000',
          country: 'France',
          contactName: 'Marie Martin',
          paymentTerms: 45,
          isActive: true,
          companyId: company.id,
        },
        create: {
          id: 'supplier-office-intl',
          name: 'Office Supply International',
          email: 'info@officesupply.com',
          phone: '+33987654321',
          address: '456 Avenue des Bureaux',
          city: 'Lyon',
          postalCode: '69000',
          country: 'France',
          contactName: 'Marie Martin',
          paymentTerms: 45,
          isActive: true,
          companyId: company.id,
        },
      }),
      prisma.supplier.upsert({
        where: { id: 'supplier-electroparts' },
        update: {
          name: 'ElectroParts GmbH',
          phone: '+49123456789',
          address: '789 Elektronikstraße',
          city: 'Berlin',
          postalCode: '10115',
          country: 'Allemagne',
          contactName: 'Hans Mueller',
          paymentTerms: 60,
          isActive: true,
          companyId: company.id,
        },
        create: {
          id: 'supplier-electroparts',
          name: 'ElectroParts GmbH',
          email: 'sales@electroparts.de',
          phone: '+49123456789',
          address: '789 Elektronikstraße',
          city: 'Berlin',
          postalCode: '10115',
          country: 'Allemagne',
          contactName: 'Hans Mueller',
          paymentTerms: 60,
          isActive: true,
          companyId: company.id,
        },
      }),
    ])

    logger.info('✅ Base de données initialisée avec succès')
    logger.info(`📊 Créé: ${products.length} produits, ${clients.length} clients, ${categories.length} catégories, ${suppliers.length} fournisseurs`)

  } catch (error) {
    logger.error('❌ Erreur lors de l\'initialisation de la base de données:', error)
    throw error
  }
}

