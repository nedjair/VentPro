const { PrismaClient } = require('./generated/client')

const prisma = new PrismaClient()

async function seedProducts() {
  console.log('🌱 Début du seeding des produits...')

  try {
    // Créer une entreprise de test
    const company = await prisma.company.upsert({
      where: { siret: '12345678901234' },
      update: {},
      create: {
        name: 'Entreprise Test TPE',
        email: 'test@gestion-tpe.com',
        phone: '01 23 45 67 89',
        address: '123 Rue de Test',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        siret: '12345678901234',
        vatNumber: 'FR12345678901',
      },
    })

    console.log(`✅ Entreprise créée: ${company.name}`)

    // Créer un utilisateur admin
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@gestion-tpe.com' },
      update: {},
      create: {
        email: 'admin@gestion-tpe.com',
        password: '$2b$10$rQZ8vQZ8vQZ8vQZ8vQZ8vOZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8vQZ8v', // password: admin123
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        isActive: true,
        companyId: company.id,
      },
    })

    console.log(`✅ Utilisateur admin créé: ${adminUser.email}`)

    // Créer des catégories
    const categories = await Promise.all([
      prisma.category.upsert({
        where: { id: 'cat-1' },
        update: {},
        create: {
          id: 'cat-1',
          name: 'Électronique',
          description: 'Produits électroniques et high-tech',
          companyId: company.id,
        },
      }),
      prisma.category.upsert({
        where: { id: 'cat-2' },
        update: {},
        create: {
          id: 'cat-2',
          name: 'Vêtements',
          description: 'Vêtements et accessoires',
          companyId: company.id,
        },
      }),
      prisma.category.upsert({
        where: { id: 'cat-3' },
        update: {},
        create: {
          id: 'cat-3',
          name: 'Maison & Jardin',
          description: 'Articles pour la maison et le jardin',
          companyId: company.id,
        },
      }),
      prisma.category.upsert({
        where: { id: 'cat-4' },
        update: {},
        create: {
          id: 'cat-4',
          name: 'Services',
          description: 'Services et prestations',
          companyId: company.id,
        },
      }),
    ])

    console.log(`✅ ${categories.length} catégories créées`)

    // Créer des produits de test
    const products = [
      {
        name: 'iPhone 15 Pro',
        description: 'Smartphone Apple iPhone 15 Pro 128GB',
        sku: 'IPHONE-15-PRO-128',
        barcode: '1234567890123',
        price: 1199.00,
        cost: 899.00,
        vatRate: 20,
        stockQuantity: 25,
        minStock: 5,
        maxStock: 100,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[0].id,
        companyId: company.id,
      },
      {
        name: 'MacBook Air M3',
        description: 'Ordinateur portable Apple MacBook Air 13" M3 256GB',
        sku: 'MACBOOK-AIR-M3-256',
        barcode: '1234567890124',
        price: 1299.00,
        cost: 999.00,
        vatRate: 20,
        stockQuantity: 15,
        minStock: 3,
        maxStock: 50,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[0].id,
        companyId: company.id,
      },
      {
        name: 'T-shirt Premium',
        description: 'T-shirt en coton bio premium, plusieurs couleurs disponibles',
        sku: 'TSHIRT-PREMIUM',
        barcode: '1234567890125',
        price: 29.99,
        cost: 12.00,
        vatRate: 20,
        stockQuantity: 150,
        minStock: 20,
        maxStock: 500,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[1].id,
        companyId: company.id,
      },
      {
        name: 'Jean Slim Fit',
        description: 'Jean slim fit en denim stretch, coupe moderne',
        sku: 'JEAN-SLIM-FIT',
        barcode: '1234567890126',
        price: 79.99,
        cost: 35.00,
        vatRate: 20,
        stockQuantity: 80,
        minStock: 15,
        maxStock: 200,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[1].id,
        companyId: company.id,
      },
      {
        name: 'Aspirateur Robot',
        description: 'Aspirateur robot intelligent avec navigation laser',
        sku: 'ASPIRATEUR-ROBOT',
        barcode: '1234567890127',
        price: 399.99,
        cost: 250.00,
        vatRate: 20,
        stockQuantity: 12,
        minStock: 5,
        maxStock: 30,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[2].id,
        companyId: company.id,
      },
      {
        name: 'Plante Verte Décorative',
        description: 'Plante verte d\'intérieur, facile d\'entretien',
        sku: 'PLANTE-VERTE-DECO',
        barcode: '1234567890128',
        price: 24.99,
        cost: 8.00,
        vatRate: 10,
        stockQuantity: 45,
        minStock: 10,
        maxStock: 100,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[2].id,
        companyId: company.id,
      },
      {
        name: 'Consultation IT',
        description: 'Consultation en informatique et transformation digitale',
        sku: 'CONSULT-IT',
        price: 150.00,
        vatRate: 20,
        stockQuantity: 0,
        minStock: 0,
        isActive: true,
        isService: true,
        unit: 'heure',
        categoryId: categories[3].id,
        companyId: company.id,
      },
      {
        name: 'Formation Bureautique',
        description: 'Formation aux outils bureautiques (Word, Excel, PowerPoint)',
        sku: 'FORMATION-BUREAU',
        price: 450.00,
        cost: 200.00,
        vatRate: 20,
        stockQuantity: 0,
        minStock: 0,
        isActive: true,
        isService: true,
        unit: 'jour',
        categoryId: categories[3].id,
        companyId: company.id,
      },
      {
        name: 'Casque Audio Bluetooth',
        description: 'Casque audio sans fil avec réduction de bruit active',
        sku: 'CASQUE-BT-ANC',
        barcode: '1234567890129',
        price: 199.99,
        cost: 120.00,
        vatRate: 20,
        stockQuantity: 3, // Stock bas pour tester les alertes
        minStock: 5,
        maxStock: 50,
        isActive: true,
        isService: false,
        unit: 'pièce',
        categoryId: categories[0].id,
        companyId: company.id,
      },
      {
        name: 'Produit Inactif',
        description: 'Produit désactivé pour test',
        sku: 'PRODUIT-INACTIF',
        price: 99.99,
        cost: 50.00,
        vatRate: 20,
        stockQuantity: 0,
        minStock: 0,
        isActive: false,
        isService: false,
        unit: 'pièce',
        categoryId: categories[0].id,
        companyId: company.id,
      },
    ]

    for (const productData of products) {
      const product = await prisma.product.create({
        data: productData,
      })

      // Créer un mouvement de stock initial pour les produits physiques avec du stock
      if (!product.isService && product.stockQuantity > 0) {
        await prisma.stockMovement.create({
          data: {
            type: 'IN',
            quantity: product.stockQuantity,
            unitCost: product.cost,
            reference: 'STOCK-INITIAL',
            comment: 'Stock initial lors du seeding',
            productId: product.id,
          },
        })
      }

      console.log(`✅ Produit créé: ${product.name} (${product.sku})`)
    }

    // Créer quelques clients de test
    const clients = [
      {
        type: 'INDIVIDUAL',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@email.com',
        phone: '01 23 45 67 89',
        address: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001',
        country: 'France',
        isActive: true,
        companyId: company.id,
      },
      {
        type: 'COMPANY',
        companyName: 'SARL TechnoPlus',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'contact@technoplus.fr',
        phone: '01 98 76 54 32',
        address: '456 Avenue des Entreprises',
        city: 'Lyon',
        postalCode: '69000',
        country: 'France',
        siret: '98765432109876',
        vatNumber: 'FR98765432109',
        isActive: true,
        companyId: company.id,
      },
    ]

    for (const clientData of clients) {
      const client = await prisma.client.create({
        data: clientData,
      })
      console.log(`✅ Client créé: ${client.firstName} ${client.lastName}`)
    }

    console.log('🎉 Seeding terminé avec succès!')
  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedProducts()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
