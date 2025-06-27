import { PrismaClient } from './generated/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding de la base de données avec des données algériennes...')

  // Nettoyer les données existantes dans l'ordre des dépendances
  console.log('🧹 Suppression des données existantes...')
  await prisma.clientInteraction.deleteMany()
  await prisma.productImage.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()
  await prisma.company.deleteMany()
  console.log('✅ Données existantes supprimées')

  // Créer une entreprise algérienne de démonstration
  console.log('🏢 Création de l\'entreprise algérienne...')
  const company = await prisma.company.create({
    data: {
      name: 'SARL TechnoCommerce Algérie',
      siret: '98765432100001', // Format algérien NIF
      address: '15 Boulevard Mohamed V, Hydra',
      postalCode: '16035',
      city: 'Alger',
      country: 'Algérie',
      phone: '+213 21 69 12 34',
      email: 'contact@technocommerce.dz',
      website: 'https://technocommerce.dz',
      vatNumber: 'DZ98765432100001',
      currency: 'DZD',
      timezone: 'Africa/Algiers',
    },
  })
  console.log(`✅ Entreprise créée: ${company.name}`)

  // Créer des utilisateurs algériens
  console.log('👥 Création des utilisateurs algériens...')
  const hashedPassword = await bcrypt.hash('demo123', 10)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@technocommerce.dz',
      password: hashedPassword,
      firstName: 'Ahmed',
      lastName: 'Benali',
      role: 'ADMIN',
      companyId: company.id,
    },
  })

  const managerUser = await prisma.user.create({
    data: {
      email: 'manager@technocommerce.dz',
      password: hashedPassword,
      firstName: 'Fatima',
      lastName: 'Khelifi',
      role: 'MANAGER',
      companyId: company.id,
    },
  })

  const employeeUser = await prisma.user.create({
    data: {
      email: 'employee@technocommerce.dz',
      password: hashedPassword,
      firstName: 'Youcef',
      lastName: 'Boumediene',
      role: 'EMPLOYEE',
      companyId: company.id,
    },
  })
  console.log('✅ Utilisateurs créés: Ahmed (Admin), Fatima (Manager), Youcef (Employé)')

  // Créer des catégories adaptées au marché algérien
  console.log('📂 Création des catégories de produits...')
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Électronique et Informatique',
      description: 'Ordinateurs, téléphones, équipements électroniques',
      companyId: company.id,
    },
  })

  const homeAppliancesCategory = await prisma.category.create({
    data: {
      name: 'Électroménager',
      description: 'Appareils électroménagers pour la maison',
      companyId: company.id,
    },
  })

  const furnitureCategory = await prisma.category.create({
    data: {
      name: 'Mobilier et Décoration',
      description: 'Meubles, décoration et aménagement',
      companyId: company.id,
    },
  })

  const servicesCategory = await prisma.category.create({
    data: {
      name: 'Services',
      description: 'Services techniques et prestations',
      companyId: company.id,
    },
  })

  const textileCategory = await prisma.category.create({
    data: {
      name: 'Textile et Habillement',
      description: 'Vêtements, tissus et accessoires',
      companyId: company.id,
    },
  })
  console.log('✅ Catégories créées: Électronique, Électroménager, Mobilier, Services, Textile')

  // Créer des fournisseurs algériens
  console.log('🏭 Création des fournisseurs algériens...')
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        type: 'COMPANY',
        name: 'EURL Condor Electronics',
        contactName: 'Abderrahmane Benhamadi',
        email: 'commercial@condor.dz',
        phone: '+213 21 54 32 10',
        mobile: '+213 555 12 34 56',
        website: 'https://condor.dz',
        address: 'Zone Industrielle Bordj Bou Arreridj',
        postalCode: '34000',
        city: 'Bordj Bou Arreridj',
        country: 'Algérie',
        siret: '12345678900001',
        vatNumber: 'DZ12345678900001',
        paymentTerms: 30,
        currency: 'DZD',
        rating: 5,
        isPreferred: true,
        notes: 'Fabricant algérien d\'électronique et électroménager',
        tags: ['électronique', 'local', 'fabricant'],
        companyId: company.id,
      },
    }),
    prisma.supplier.create({
      data: {
        type: 'COMPANY',
        name: 'SARL Iris Mobilier',
        contactName: 'Samira Benaissa',
        email: 'contact@iris-mobilier.dz',
        phone: '+213 31 45 67 89',
        mobile: '+213 661 23 45 67',
        address: '12 Rue des Artisans, Sétif',
        postalCode: '19000',
        city: 'Sétif',
        country: 'Algérie',
        siret: '23456789000002',
        vatNumber: 'DZ23456789000002',
        paymentTerms: 45,
        currency: 'DZD',
        rating: 4,
        notes: 'Spécialiste du mobilier de bureau et résidentiel',
        tags: ['mobilier', 'bureau', 'local'],
        companyId: company.id,
      },
    }),
    prisma.supplier.create({
      data: {
        type: 'COMPANY',
        name: 'EURL TechImport Oran',
        contactName: 'Karim Meziane',
        email: 'import@techimport.dz',
        phone: '+213 41 33 22 11',
        mobile: '+213 772 88 99 00',
        address: 'Port d\'Oran, Zone Franche',
        postalCode: '31000',
        city: 'Oran',
        country: 'Algérie',
        siret: '34567890000003',
        vatNumber: 'DZ34567890000003',
        paymentTerms: 60,
        currency: 'DZD',
        rating: 4,
        notes: 'Importateur d\'équipements électroniques',
        tags: ['import', 'électronique', 'oran'],
        companyId: company.id,
      },
    }),
  ])
  console.log('✅ Fournisseurs créés: Condor Electronics, Iris Mobilier, TechImport Oran')

  // Créer des produits adaptés au marché algérien avec prix en DZD
  console.log('📦 Création des produits algériens...')
  const products = await Promise.all([
    // Produits électroniques
    prisma.product.create({
      data: {
        name: 'Tablette Condor TGW-712',
        description: 'Tablette Condor 7" Android, 32GB, WiFi - Fabrication algérienne',
        sku: 'CONDOR-TGW-712',
        barcode: '6111000712001',
        price: 25000.00, // 25,000 DZD
        cost: 18000.00,
        vatRate: 19, // TVA algérienne
        stockQuantity: 20,
        minStock: 5,
        maxStock: 50,
        categoryId: electronicsCategory.id,
        supplierId: suppliers[0].id, // Condor Electronics
        companyId: company.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Smartphone Condor Griffe T9',
        description: 'Smartphone Condor 4G, 64GB, Double SIM - Made in Algeria',
        sku: 'CONDOR-GRIFFE-T9',
        barcode: '6111000900001',
        price: 45000.00, // 45,000 DZD
        cost: 32000.00,
        vatRate: 19,
        stockQuantity: 15,
        minStock: 3,
        maxStock: 30,
        categoryId: electronicsCategory.id,
        supplierId: suppliers[0].id,
        companyId: company.id,
      },
    }),
    // Électroménager
    prisma.product.create({
      data: {
        name: 'Réfrigérateur Condor 350L',
        description: 'Réfrigérateur No Frost 350L, classe A+, fabrication locale',
        sku: 'CONDOR-FRIGO-350',
        barcode: '6111000350001',
        price: 85000.00, // 85,000 DZD
        cost: 65000.00,
        vatRate: 19,
        stockQuantity: 8,
        minStock: 2,
        maxStock: 15,
        categoryId: homeAppliancesCategory.id,
        supplierId: suppliers[0].id,
        companyId: company.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Climatiseur Split 12000 BTU',
        description: 'Climatiseur split 12000 BTU, inverter, classe A++',
        sku: 'CLIM-SPLIT-12K',
        barcode: '6111001200001',
        price: 75000.00, // 75,000 DZD
        cost: 55000.00,
        vatRate: 19,
        stockQuantity: 12,
        minStock: 3,
        maxStock: 25,
        categoryId: homeAppliancesCategory.id,
        supplierId: suppliers[2].id, // TechImport
        companyId: company.id,
      },
    }),
    // Mobilier
    prisma.product.create({
      data: {
        name: 'Bureau Direction Iris',
        description: 'Bureau de direction en bois massif, finition acajou',
        sku: 'IRIS-BUREAU-DIR',
        barcode: '2130001000001',
        price: 120000.00, // 120,000 DZD
        cost: 85000.00,
        vatRate: 19,
        stockQuantity: 5,
        minStock: 1,
        maxStock: 10,
        categoryId: furnitureCategory.id,
        supplierId: suppliers[1].id, // Iris Mobilier
        companyId: company.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Chaise de Bureau Ergonomique',
        description: 'Chaise de bureau ergonomique, dossier réglable, accoudoirs',
        sku: 'IRIS-CHAISE-ERG',
        barcode: '2130002000001',
        price: 35000.00, // 35,000 DZD
        cost: 22000.00,
        vatRate: 19,
        stockQuantity: 25,
        minStock: 8,
        maxStock: 50,
        categoryId: furnitureCategory.id,
        supplierId: suppliers[1].id,
        companyId: company.id,
      },
    }),
    // Textile
    prisma.product.create({
      data: {
        name: 'Costume Homme Classique',
        description: 'Costume homme 2 pièces, laine, tailles 48-56',
        sku: 'COSTUME-H-CLASS',
        barcode: '2130003000001',
        price: 18000.00, // 18,000 DZD
        cost: 12000.00,
        vatRate: 19,
        stockQuantity: 30,
        minStock: 10,
        maxStock: 60,
        unit: 'pièce',
        categoryId: textileCategory.id,
        companyId: company.id,
      },
    }),
    // Services
    prisma.product.create({
      data: {
        name: 'Installation Climatisation',
        description: 'Service d\'installation et mise en service climatiseur',
        sku: 'SERV-INSTALL-CLIM',
        price: 8000.00, // 8,000 DZD
        vatRate: 19,
        stockQuantity: 0,
        isService: true,
        unit: 'intervention',
        categoryId: servicesCategory.id,
        companyId: company.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Maintenance Informatique',
        description: 'Service de maintenance informatique - tarif horaire',
        sku: 'SERV-MAINT-INFO',
        price: 3500.00, // 3,500 DZD/heure
        vatRate: 19,
        stockQuantity: 0,
        isService: true,
        unit: 'heure',
        categoryId: servicesCategory.id,
        companyId: company.id,
      },
    }),
  ])
  console.log('✅ Produits créés: 10 produits avec prix en DZD')

  // Créer des clients algériens
  console.log('👥 Création des clients algériens...')
  const clients = await Promise.all([
    // Entreprises algériennes
    prisma.client.create({
      data: {
        type: 'COMPANY',
        companyName: 'SARL Batiment Plus',
        email: 'contact@batimentplus.dz',
        phone: '+213 21 45 67 89',
        mobile: '+213 555 11 22 33',
        address: 'Cité 20 Août 1955, Reghaia',
        postalCode: '16112',
        city: 'Alger',
        country: 'Algérie',
        siret: '11111111100001',
        vatNumber: 'DZ11111111100001',
        paymentTerms: 30,
        creditLimit: 500000.00, // 500,000 DZD
        notes: 'Entreprise de construction et BTP',
        tags: ['btp', 'construction', 'alger'],
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        type: 'COMPANY',
        companyName: 'EURL Médical Center',
        email: 'admin@medicalcenter.dz',
        phone: '+213 31 78 90 12',
        mobile: '+213 661 44 55 66',
        address: 'Boulevard de l\'ALN, Centre-ville',
        postalCode: '19000',
        city: 'Sétif',
        country: 'Algérie',
        billingAddress: 'BP 123, Sétif',
        billingPostalCode: '19000',
        billingCity: 'Sétif',
        billingCountry: 'Algérie',
        siret: '22222222200002',
        vatNumber: 'DZ22222222200002',
        paymentTerms: 45,
        creditLimit: 300000.00, // 300,000 DZD
        discount: 3.00,
        notes: 'Clinique privée, équipements médicaux',
        tags: ['médical', 'clinique', 'sétif'],
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        type: 'COMPANY',
        companyName: 'SPA Hôtel El Djazair',
        email: 'achat@hoteldjazair.dz',
        phone: '+213 41 55 66 77',
        mobile: '+213 772 99 88 77',
        website: 'https://hoteldjazair.dz',
        address: 'Front de Mer, Ain El Turck',
        postalCode: '31001',
        city: 'Oran',
        country: 'Algérie',
        siret: '33333333300003',
        vatNumber: 'DZ33333333300003',
        paymentTerms: 60,
        creditLimit: 800000.00, // 800,000 DZD
        discount: 5.00,
        notes: 'Hôtel 4 étoiles, équipements hôteliers',
        tags: ['hôtellerie', 'tourisme', 'oran'],
        companyId: company.id,
      },
    }),
    // Particuliers algériens
    prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        firstName: 'Amina',
        lastName: 'Benaissa',
        email: 'amina.benaissa@gmail.com',
        phone: '+213 21 33 44 55',
        mobile: '+213 555 77 88 99',
        address: '25 Rue Didouche Mourad, Hydra',
        postalCode: '16035',
        city: 'Alger',
        country: 'Algérie',
        paymentTerms: 15,
        creditLimit: 50000.00, // 50,000 DZD
        notes: 'Cliente particulière, achats électroménager',
        tags: ['particulier', 'alger'],
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        firstName: 'Mohamed',
        lastName: 'Khelifi',
        email: 'mohamed.khelifi@outlook.com',
        phone: '+213 25 66 77 88',
        mobile: '+213 661 22 33 44',
        address: 'Cité Boussouf, Constantine',
        postalCode: '25000',
        city: 'Constantine',
        country: 'Algérie',
        paymentTerms: 30,
        creditLimit: 75000.00, // 75,000 DZD
        notes: 'Professionnel libéral, équipements bureau',
        tags: ['particulier', 'professionnel', 'constantine'],
        companyId: company.id,
      },
    }),
    prisma.client.create({
      data: {
        type: 'INDIVIDUAL',
        firstName: 'Fatima Zohra',
        lastName: 'Meziane',
        email: 'fz.meziane@yahoo.fr',
        phone: '+213 38 99 00 11',
        mobile: '+213 772 55 66 77',
        address: 'Nouvelle Ville, Tizi Ouzou',
        postalCode: '15000',
        city: 'Tizi Ouzou',
        country: 'Algérie',
        paymentTerms: 15,
        creditLimit: 40000.00, // 40,000 DZD
        notes: 'Enseignante, achats personnels',
        tags: ['particulier', 'enseignement', 'tizi-ouzou'],
        companyId: company.id,
      },
    }),
  ])
  console.log('✅ Clients créés: 3 entreprises et 3 particuliers algériens')

  // Créer des mouvements de stock pour les produits physiques
  console.log('📊 Création des mouvements de stock...')
  const physicalProducts = products.filter(p => !p.isService)
  for (const product of physicalProducts) {
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
  console.log(`✅ Mouvements de stock créés pour ${physicalProducts.length} produits`)

  // Créer quelques commandes de démonstration
  console.log('📋 Création des commandes de démonstration...')
  const order1 = await prisma.order.create({
    data: {
      number: 'CMD-2024-001',
      type: 'ORDER',
      status: 'ACCEPTED',
      orderDate: new Date('2024-01-15'),
      deliveryDate: new Date('2024-01-25'),
      subtotal: 160000.00, // 160,000 DZD
      vatAmount: 30400.00,  // 19% TVA
      total: 190400.00,
      discount: 0,
      notes: 'Commande équipement bureau - Livraison urgente',
      clientId: clients[0].id, // SARL Batiment Plus
      companyId: company.id,
    },
  })

  // Articles de la commande 1
  await Promise.all([
    prisma.orderItem.create({
      data: {
        quantity: 1,
        unitPrice: 120000.00, // Bureau Direction
        vatRate: 19,
        discount: 0,
        orderId: order1.id,
        productId: products[4].id, // Bureau Direction Iris
      },
    }),
    prisma.orderItem.create({
      data: {
        quantity: 2,
        unitPrice: 35000.00, // Chaise Bureau
        vatRate: 19,
        discount: 0,
        orderId: order1.id,
        productId: products[5].id, // Chaise de Bureau Ergonomique
      },
    }),
  ])

  const order2 = await prisma.order.create({
    data: {
      number: 'CMD-2024-002',
      type: 'QUOTE',
      status: 'SENT',
      orderDate: new Date('2024-01-20'),
      validUntil: new Date('2024-02-20'),
      subtotal: 85000.00, // 85,000 DZD
      vatAmount: 16150.00,  // 19% TVA
      total: 101150.00,
      discount: 0,
      notes: 'Devis réfrigérateur pour clinique',
      clientId: clients[1].id, // EURL Médical Center
      companyId: company.id,
    },
  })

  // Article du devis 2
  await prisma.orderItem.create({
    data: {
      quantity: 1,
      unitPrice: 85000.00, // Réfrigérateur
      vatRate: 19,
      discount: 0,
      orderId: order2.id,
      productId: products[2].id, // Réfrigérateur Condor 350L
    },
  })
  console.log('✅ Commandes créées: 1 commande acceptée, 1 devis en attente')

  // Créer quelques factures
  console.log('🧾 Création des factures...')
  const invoice1 = await prisma.invoice.create({
    data: {
      number: 'FACT-2024-001',
      type: 'INVOICE',
      status: 'PAID',
      invoiceDate: new Date('2024-01-10'),
      dueDate: new Date('2024-02-10'),
      paidDate: new Date('2024-01-25'),
      subtotal: 45000.00, // 45,000 DZD
      vatAmount: 8550.00,  // 19% TVA
      total: 53550.00,
      paidAmount: 53550.00,
      discount: 0,
      paymentMethod: 'Virement bancaire',
      notes: 'Facture smartphone - Paiement reçu',
      clientId: clients[3].id, // Amina Benaissa
      companyId: company.id,
    },
  })

  // Article de la facture 1
  await prisma.invoiceItem.create({
    data: {
      quantity: 1,
      unitPrice: 45000.00, // Smartphone
      vatRate: 19,
      discount: 0,
      invoiceId: invoice1.id,
      productId: products[1].id, // Smartphone Condor Griffe T9
    },
  })

  const invoice2 = await prisma.invoice.create({
    data: {
      number: 'FACT-2024-002',
      type: 'INVOICE',
      status: 'SENT',
      invoiceDate: new Date('2024-01-18'),
      dueDate: new Date('2024-02-18'),
      subtotal: 11500.00, // 11,500 DZD
      vatAmount: 2185.00,  // 19% TVA
      total: 13685.00,
      paidAmount: 0,
      discount: 0,
      notes: 'Facture maintenance + installation',
      clientId: clients[4].id, // Mohamed Khelifi
      companyId: company.id,
    },
  })

  // Articles de la facture 2
  await Promise.all([
    prisma.invoiceItem.create({
      data: {
        quantity: 1,
        unitPrice: 8000.00, // Installation climatisation
        vatRate: 19,
        discount: 0,
        invoiceId: invoice2.id,
        productId: products[7].id, // Installation Climatisation
      },
    }),
    prisma.invoiceItem.create({
      data: {
        quantity: 1,
        unitPrice: 3500.00, // Maintenance informatique
        vatRate: 19,
        discount: 0,
        invoiceId: invoice2.id,
        productId: products[8].id, // Maintenance Informatique
      },
    }),
  ])
  console.log('✅ Factures créées: 1 facture payée, 1 facture en attente')

  // Créer quelques interactions clients
  console.log('💬 Création des interactions clients...')
  await Promise.all([
    prisma.clientInteraction.create({
      data: {
        type: 'CALL',
        subject: 'Demande de devis climatisation',
        description: 'Client intéressé par l\'installation d\'un système de climatisation pour son bureau',
        date: new Date('2024-01-12'),
        clientId: clients[4].id, // Mohamed Khelifi
        userId: employeeUser.id,
      },
    }),
    prisma.clientInteraction.create({
      data: {
        type: 'EMAIL',
        subject: 'Confirmation commande mobilier',
        description: 'Confirmation de la commande de mobilier de bureau, livraison prévue fin janvier',
        date: new Date('2024-01-16'),
        clientId: clients[0].id, // SARL Batiment Plus
        userId: managerUser.id,
      },
    }),
    prisma.clientInteraction.create({
      data: {
        type: 'MEETING',
        subject: 'Présentation catalogue électroménager',
        description: 'Rendez-vous pour présenter la nouvelle gamme d\'électroménager Condor',
        date: new Date('2024-01-22'),
        clientId: clients[1].id, // EURL Médical Center
        userId: adminUser.id,
      },
    }),
  ])
  console.log('✅ Interactions clients créées')

  console.log('')
  console.log('🎉 Seeding terminé avec succès!')
  console.log('📊 Données algériennes créées:')
  console.log(`   - 1 entreprise: ${company.name}`)
  console.log(`   - 3 utilisateurs algériens (Ahmed, Fatima, Youcef)`)
  console.log(`   - 5 catégories de produits`)
  console.log(`   - 10 produits avec prix en DZD (dont 2 services)`)
  console.log(`   - 3 fournisseurs algériens`)
  console.log(`   - 6 clients (3 entreprises + 3 particuliers)`)
  console.log(`   - 2 commandes/devis`)
  console.log(`   - 2 factures`)
  console.log(`   - 3 interactions clients`)
  console.log(`   - Mouvements de stock initiaux`)
  console.log('')
  console.log('🔐 Comptes de test:')
  console.log('   Admin: admin@technocommerce.dz / demo123')
  console.log('   Manager: manager@technocommerce.dz / demo123')
  console.log('   Employé: employee@technocommerce.dz / demo123')
  console.log('')
  console.log('💰 Tous les prix sont en Dinar Algérien (DZD)')
  console.log('📍 Données localisées pour l\'Algérie (Alger, Oran, Sétif, Constantine, Tizi Ouzou)')
  console.log('📞 Numéros de téléphone au format algérien (+213)')
  console.log('🏢 Entreprises avec SIRET et TVA algériens')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
