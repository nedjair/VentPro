#!/usr/bin/env tsx

/**
 * Script de seeding pour générer des données de test algériennes
 * Application de Gestion Commerciale TPE
 * 
 * Génère 50+ enregistrements avec des données algériennes authentiques
 */

import { PrismaClient } from './generated/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Configuration
const SALT_ROUNDS = 10

// Données algériennes authentiques
const ALGERIAN_CITIES = [
  { name: 'Alger', postalCode: '16000' },
  { name: 'Oran', postalCode: '31000' },
  { name: 'Constantine', postalCode: '25000' },
  { name: 'Annaba', postalCode: '23000' },
  { name: 'Blida', postalCode: '09000' },
  { name: 'Batna', postalCode: '05000' },
  { name: 'Djelfa', postalCode: '17000' },
  { name: 'Sétif', postalCode: '19000' },
  { name: 'Sidi Bel Abbès', postalCode: '22000' },
  { name: 'Biskra', postalCode: '07000' },
  { name: 'Tébessa', postalCode: '12000' },
  { name: 'El Oued', postalCode: '39000' },
  { name: 'Skikda', postalCode: '21000' },
  { name: 'Tiaret', postalCode: '14000' },
  { name: 'Béjaïa', postalCode: '06000' },
  { name: 'Tlemcen', postalCode: '13000' },
  { name: 'Ouargla', postalCode: '30000' },
  { name: 'Béchar', postalCode: '08000' },
  { name: 'Médéa', postalCode: '26000' },
  { name: 'Mostaganem', postalCode: '27000' }
]

const ALGERIAN_FIRST_NAMES = [
  'Ahmed', 'Mohamed', 'Ali', 'Omar', 'Youssef', 'Karim', 'Rachid', 'Samir', 'Nabil', 'Farid',
  'Fatima', 'Aicha', 'Khadija', 'Amina', 'Zohra', 'Samira', 'Naima', 'Leila', 'Malika', 'Yamina'
]

const ALGERIAN_LAST_NAMES = [
  'Benali', 'Benaissa', 'Boumediene', 'Cherif', 'Djelloul', 'Ferhat', 'Ghali', 'Hamidi', 'Kaci', 'Larbi',
  'Mansouri', 'Naceri', 'Ouali', 'Rahmani', 'Saadi', 'Tebboune', 'Yahiaoui', 'Zeroual', 'Amrani', 'Belkacem'
]

const ALGERIAN_COMPANIES = [
  'Sonatrach Distribution', 'Naftal Services', 'Cevital Agro', 'Saidal Pharma', 'ENIE Électronique',
  'Condor Electronics', 'Groupe Benamor', 'Sim Industrie', 'Tchin-Lait', 'Laiterie Soummam',
  'Groupe Amor Benamor', 'Danone Djurdjura', 'Cevital Foods', 'Groupe Rebrab', 'Tango Télécom'
]

const ALGERIAN_PRODUCTS = [
  { name: 'Couscous Ferrero 1kg', category: 'Alimentation', unit: 'kg', price: 350 },
  { name: 'Huile Elio 1L', category: 'Alimentation', unit: 'L', price: 280 },
  { name: 'Thé Palais des Thés 200g', category: 'Boissons', unit: 'g', price: 450 },
  { name: 'Café Malongo 250g', category: 'Boissons', unit: 'g', price: 680 },
  { name: 'Lait Soummam 1L', category: 'Produits laitiers', unit: 'L', price: 120 },
  { name: 'Yaourt Danone pack 8', category: 'Produits laitiers', unit: 'pack', price: 320 },
  { name: 'Pain de mie Bimo', category: 'Boulangerie', unit: 'pièce', price: 85 },
  { name: 'Biscuits Bimo 200g', category: 'Biscuiterie', unit: 'g', price: 150 },
  { name: 'Sardines Gourmet 125g', category: 'Conserves', unit: 'g', price: 180 },
  { name: 'Tomates pelées 400g', category: 'Conserves', unit: 'g', price: 95 },
  { name: 'Riz Taureau 1kg', category: 'Céréales', unit: 'kg', price: 220 },
  { name: 'Pâtes Barilla 500g', category: 'Céréales', unit: 'g', price: 160 },
  { name: 'Sucre Cevital 1kg', category: 'Épicerie', unit: 'kg', price: 140 },
  { name: 'Sel de table 1kg', category: 'Épicerie', unit: 'kg', price: 45 },
  { name: 'Détergent Ariel 2kg', category: 'Entretien', unit: 'kg', price: 850 },
  { name: 'Savon Dove 100g', category: 'Hygiène', unit: 'g', price: 180 },
  { name: 'Shampoing Elsève 400ml', category: 'Hygiène', unit: 'ml', price: 520 },
  { name: 'Dentifrice Signal 75ml', category: 'Hygiène', unit: 'ml', price: 280 },
  { name: 'Smartphone Condor P8', category: 'Électronique', unit: 'pièce', price: 35000 },
  { name: 'Tablette ENIE 10"', category: 'Électronique', unit: 'pièce', price: 28000 }
]

const CATEGORIES = [
  'Alimentation', 'Boissons', 'Produits laitiers', 'Boulangerie', 'Biscuiterie',
  'Conserves', 'Céréales', 'Épicerie', 'Entretien', 'Hygiène', 'Électronique'
]

// Fonctions utilitaires
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function getRandomElements<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

function generateAlgerianPhone(): string {
  const prefixes = ['05', '06', '07']
  const prefix = getRandomElement(prefixes)
  const number = Math.floor(Math.random() * 90000000) + 10000000
  return `+213 ${prefix} ${number.toString().slice(0, 2)} ${number.toString().slice(2, 4)} ${number.toString().slice(4, 6)} ${number.toString().slice(6, 8)}`
}

function generateSKU(productName: string, index: number): string {
  const prefix = productName.substring(0, 3).toUpperCase()
  return `${prefix}${String(index).padStart(4, '0')}`
}

function generateSIRET(): string {
  return Math.floor(Math.random() * 90000000000000) + 10000000000000 + ''
}

// Fonction principale de seeding
async function seedAlgerianData() {
  console.log('🇩🇿 SEEDING DES DONNÉES ALGÉRIENNES')
  console.log('=====================================')

  try {
    // 1. Nettoyer les données existantes (avec gestion des tables manquantes)
    console.log('🧹 Suppression des données existantes...')

    // Fonction pour supprimer en toute sécurité
    const safeDelete = async (tableName: string, deleteFunction: () => Promise<any>) => {
      try {
        await deleteFunction()
        console.log(`   ✅ ${tableName} nettoyé`)
      } catch (error: any) {
        if (error.code === 'P2021') {
          console.log(`   ⚠️  Table ${tableName} n'existe pas - ignoré`)
        } else {
          console.log(`   ❌ Erreur ${tableName}: ${error.message}`)
        }
      }
    }

    await safeDelete('stockMovement', () => prisma.stockMovement.deleteMany())
    await safeDelete('stock', () => prisma.stock.deleteMany())
    await safeDelete('invoiceItem', () => prisma.invoiceItem.deleteMany())
    await safeDelete('invoice', () => prisma.invoice.deleteMany())
    await safeDelete('orderItem', () => prisma.orderItem.deleteMany())
    await safeDelete('order', () => prisma.order.deleteMany())
    await safeDelete('productImage', () => prisma.productImage.deleteMany())
    await safeDelete('productVariant', () => prisma.productVariant.deleteMany())
    await safeDelete('product', () => prisma.product.deleteMany())
    await safeDelete('category', () => prisma.category.deleteMany())
    await safeDelete('supplier', () => prisma.supplier.deleteMany())
    await safeDelete('clientInteraction', () => prisma.clientInteraction.deleteMany())
    await safeDelete('client', () => prisma.client.deleteMany())
    await safeDelete('user', () => prisma.user.deleteMany())
    await safeDelete('company', () => prisma.company.deleteMany())

    console.log('✅ Nettoyage terminé')

    // 2. Créer l'entreprise principale
    console.log('🏢 Création de l\'entreprise...')
    const algerianCity = getRandomElement(ALGERIAN_CITIES)
    const company = await prisma.company.create({
      data: {
        name: 'Gestion Commerciale Algérie SARL',
        siret: generateSIRET(),
        address: '15 Rue Didouche Mourad',
        postalCode: algerianCity.postalCode,
        city: algerianCity.name,
        country: 'Algérie',
        phone: generateAlgerianPhone(),
        email: 'contact@gestion-dz.com',
        website: 'https://www.gestion-dz.com',
        vatNumber: 'DZ' + generateSIRET().substring(0, 11),
        currency: 'DA',
        timezone: 'Africa/Algiers'
      }
    })
    console.log(`✅ Entreprise créée: ${company.name}`)

    // 3. Créer les utilisateurs
    console.log('👥 Création des utilisateurs...')
    const users = []
    
    // Admin principal
    const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS)
    const admin = await prisma.user.create({
      data: {
        email: 'admin@gestion-dz.com',
        passwordHash: adminPassword,
        firstName: getRandomElement(ALGERIAN_FIRST_NAMES),
        lastName: getRandomElement(ALGERIAN_LAST_NAMES),
        role: 'ADMIN',
        companyId: company.id
      }
    })
    users.push(admin)

    // Managers et employés
    const userRoles = ['MANAGER', 'MANAGER', 'EMPLOYEE', 'EMPLOYEE']
    for (let i = 0; i < userRoles.length; i++) {
      const firstName = getRandomElement(ALGERIAN_FIRST_NAMES)
      const lastName = getRandomElement(ALGERIAN_LAST_NAMES)
      const password = await bcrypt.hash('password123', SALT_ROUNDS)
      
      const user = await prisma.user.create({
        data: {
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gestion-dz.com`,
          passwordHash: password,
          firstName,
          lastName,
          role: userRoles[i] as 'MANAGER' | 'EMPLOYEE',
          companyId: company.id
        }
      })
      users.push(user)
    }
    console.log(`✅ ${users.length} utilisateurs créés`)

    // 4. Créer les catégories (si la table existe)
    console.log('📂 Création des catégories...')
    const categories = []
    try {
      for (const categoryName of CATEGORIES) {
        const category = await prisma.category.create({
          data: {
            name: categoryName,
            description: `Catégorie ${categoryName} pour produits algériens`,
            companyId: company.id
          }
        })
        categories.push(category)
      }
      console.log(`✅ ${categories.length} catégories créées`)
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  Table categories n\'existe pas - création ignorée')
      } else {
        throw error
      }
    }

    // 5. Créer les fournisseurs (si la table existe)
    console.log('🏭 Création des fournisseurs...')
    const suppliers = []
    try {
      for (let i = 0; i < 8; i++) {
        const city = getRandomElement(ALGERIAN_CITIES)
        const supplier = await prisma.supplier.create({
          data: {
            type: 'COMPANY',
            name: getRandomElement(ALGERIAN_COMPANIES),
            contactName: `${getRandomElement(ALGERIAN_FIRST_NAMES)} ${getRandomElement(ALGERIAN_LAST_NAMES)}`,
            email: `contact@fournisseur${i + 1}.dz`,
            phone: generateAlgerianPhone(),
            mobile: generateAlgerianPhone(),
            address: `${Math.floor(Math.random() * 200) + 1} Rue ${getRandomElement(['Mohamed V', 'Emir Abdelkader', 'Larbi Ben M\'hidi', 'Hassiba Ben Bouali'])}`,
            postalCode: city.postalCode,
            city: city.name,
            country: 'Algérie',
            siret: generateSIRET(),
            vatNumber: 'DZ' + generateSIRET().substring(0, 11),
            paymentTerms: getRandomElement([15, 30, 45, 60]),
            discount: Math.floor(Math.random() * 10),
            currency: 'DA',
            rating: Math.floor(Math.random() * 5) + 1,
            isActive: true,
            isPreferred: i < 3, // Les 3 premiers sont préférés
            companyId: company.id
          }
        })
        suppliers.push(supplier)
      }
      console.log(`✅ ${suppliers.length} fournisseurs créés`)
    } catch (error: any) {
      if (error.code === 'P2021') {
        console.log('⚠️  Table suppliers n\'existe pas - création ignorée')
      } else {
        throw error
      }
    }

    // 6. Créer les produits
    console.log('📦 Création des produits...')
    const products = []
    for (let i = 0; i < ALGERIAN_PRODUCTS.length; i++) {
      const productData = ALGERIAN_PRODUCTS[i]
      const category = categories.find(c => c.name === productData.category)
      const supplier = getRandomElement(suppliers)

      const product = await prisma.product.create({
        data: {
          name: productData.name,
          description: `Produit algérien de qualité - ${productData.name}`,
          sku: generateSKU(productData.name, i + 1),
          barcode: `213${String(i + 1).padStart(10, '0')}`,
          price: productData.price,
          cost: Math.floor(productData.price * 0.7), // Coût = 70% du prix
          vatRate: 19, // TVA algérienne
          stockQuantity: Math.floor(Math.random() * 100) + 10,
          minStock: Math.floor(Math.random() * 10) + 5,
          maxStock: Math.floor(Math.random() * 200) + 100,
          isActive: true,
          isService: false,
          unit: productData.unit,
          categoryId: category?.id,
          supplierId: supplier.id,
          companyId: company.id
        }
      })
      products.push(product)
    }
    console.log(`✅ ${products.length} produits créés`)

    // 7. Créer les clients
    console.log('👥 Création des clients...')
    const clients = []

    // Clients particuliers
    for (let i = 0; i < 8; i++) {
      const firstName = getRandomElement(ALGERIAN_FIRST_NAMES)
      const lastName = getRandomElement(ALGERIAN_LAST_NAMES)
      const city = getRandomElement(ALGERIAN_CITIES)

      const client = await prisma.client.create({
        data: {
          type: 'INDIVIDUAL',
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.dz`,
          phone: generateAlgerianPhone(),
          mobile: generateAlgerianPhone(),
          address: `${Math.floor(Math.random() * 150) + 1} Rue ${getRandomElement(['1er Novembre', 'Ben Badis', 'Frantz Fanon', 'Abane Ramdane'])}`,
          postalCode: city.postalCode,
          city: city.name,
          country: 'Algérie',
          billingAddress: `${Math.floor(Math.random() * 150) + 1} Rue ${getRandomElement(['1er Novembre', 'Ben Badis', 'Frantz Fanon', 'Abane Ramdane'])}`,
          billingPostalCode: city.postalCode,
          billingCity: city.name,
          billingCountry: 'Algérie',
          paymentTerms: getRandomElement([15, 30, 45]),
          discount: Math.floor(Math.random() * 5),
          creditLimit: Math.floor(Math.random() * 50000) + 10000,
          isActive: true,
          notes: `Client particulier de ${city.name}`,
          tags: ['particulier', 'algérie'],
          companyId: company.id
        }
      })
      clients.push(client)
    }

    // Clients entreprises
    for (let i = 0; i < 7; i++) {
      const city = getRandomElement(ALGERIAN_CITIES)
      const contactName = `${getRandomElement(ALGERIAN_FIRST_NAMES)} ${getRandomElement(ALGERIAN_LAST_NAMES)}`

      const client = await prisma.client.create({
        data: {
          type: 'COMPANY',
          companyName: `${getRandomElement(['Entreprise', 'Société', 'Groupe'])} ${getRandomElement(ALGERIAN_LAST_NAMES)} ${getRandomElement(['SARL', 'SPA', 'EURL'])}`,
          email: `contact@entreprise${i + 1}.dz`,
          phone: generateAlgerianPhone(),
          mobile: generateAlgerianPhone(),
          address: `Zone Industrielle ${city.name}`,
          postalCode: city.postalCode,
          city: city.name,
          country: 'Algérie',
          billingAddress: `Zone Industrielle ${city.name}`,
          billingPostalCode: city.postalCode,
          billingCity: city.name,
          billingCountry: 'Algérie',
          siret: generateSIRET(),
          vatNumber: 'DZ' + generateSIRET().substring(0, 11),
          paymentTerms: getRandomElement([30, 45, 60]),
          discount: Math.floor(Math.random() * 10) + 5,
          creditLimit: Math.floor(Math.random() * 200000) + 50000,
          isActive: true,
          notes: `Entreprise cliente basée à ${city.name}`,
          tags: ['entreprise', 'b2b', 'algérie'],
          companyId: company.id
        }
      })
      clients.push(client)
    }
    console.log(`✅ ${clients.length} clients créés`)

    // 8. Créer les stocks
    console.log('📊 Création des stocks...')
    const stocks = []
    for (const product of products) {
      const stock = await prisma.stock.create({
        data: {
          quantiteActuelle: product.stockQuantity,
          quantiteMinimale: product.minStock,
          quantiteMaximale: product.maxStock,
          dateLastUpdate: new Date(),
          productId: product.id,
          companyId: company.id
        }
      })
      stocks.push(stock)
    }
    console.log(`✅ ${stocks.length} stocks créés`)

    // 9. Créer quelques mouvements de stock
    console.log('📈 Création des mouvements de stock...')
    const stockMovements = []
    for (let i = 0; i < 15; i++) {
      const product = getRandomElement(products)
      const movementType = getRandomElement(['IN', 'OUT', 'ADJUSTMENT'])
      const quantity = Math.floor(Math.random() * 50) + 1

      const movement = await prisma.stockMovement.create({
        data: {
          type: movementType,
          quantity: movementType === 'OUT' ? -quantity : quantity,
          unitCost: movementType === 'IN' ? product.cost : null,
          reference: `REF${String(i + 1).padStart(6, '0')}`,
          comment: `Mouvement ${movementType} - ${product.name}`,
          productId: product.id
        }
      })
      stockMovements.push(movement)
    }
    console.log(`✅ ${stockMovements.length} mouvements de stock créés`)

    // Résumé final
    console.log('\n🎉 SEEDING TERMINÉ AVEC SUCCÈS !')
    console.log('================================')
    console.log(`✅ Entreprise: 1`)
    console.log(`✅ Utilisateurs: ${users.length}`)
    console.log(`✅ Catégories: ${categories.length}`)
    console.log(`✅ Fournisseurs: ${suppliers.length}`)
    console.log(`✅ Produits: ${products.length}`)
    console.log(`✅ Clients: ${clients.length}`)
    console.log(`✅ Stocks: ${stocks.length}`)
    console.log(`✅ Mouvements de stock: ${stockMovements.length}`)
    console.log(`