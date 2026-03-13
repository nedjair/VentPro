#!/usr/bin/env tsx

/**
 * Script de seeding simplifié pour les tables existantes
 * Fonctionne avec le schéma actuel de la base de données
 */

import { PrismaClient } from './generated/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Configuration
const SALT_ROUNDS = 10

// Données algériennes
const ALGERIAN_CITIES = [
  { name: 'Alger', postalCode: '16000' },
  { name: 'Oran', postalCode: '31000' },
  { name: 'Constantine', postalCode: '25000' },
  { name: 'Annaba', postalCode: '23000' },
  { name: 'Blida', postalCode: '09000' },
  { name: 'Batna', postalCode: '05000' },
  { name: 'Sétif', postalCode: '19000' },
  { name: 'Tlemcen', postalCode: '13000' }
]

const ALGERIAN_FIRST_NAMES = [
  'Ahmed', 'Mohamed', 'Ali', 'Omar', 'Youssef', 'Karim', 'Rachid', 'Samir',
  'Fatima', 'Aicha', 'Khadija', 'Amina', 'Zohra', 'Samira', 'Naima', 'Leila'
]

const ALGERIAN_LAST_NAMES = [
  'Benali', 'Benaissa', 'Boumediene', 'Cherif', 'Djelloul', 'Ferhat', 'Ghali', 'Hamidi',
  'Mansouri', 'Naceri', 'Ouali', 'Rahmani', 'Saadi', 'Yahiaoui', 'Zeroual', 'Amrani'
]

const ALGERIAN_PRODUCTS = [
  { name: 'Couscous Ferrero 1kg', price: 350 },
  { name: 'Huile Elio 1L', price: 280 },
  { name: 'Thé Palais des Thés 200g', price: 450 },
  { name: 'Café Malongo 250g', price: 680 },
  { name: 'Lait Soummam 1L', price: 120 },
  { name: 'Yaourt Danone pack 8', price: 320 },
  { name: 'Pain de mie Bimo', price: 85 },
  { name: 'Biscuits Bimo 200g', price: 150 },
  { name: 'Sardines Gourmet 125g', price: 180 },
  { name: 'Riz Taureau 1kg', price: 220 },
  { name: 'Sucre Cevital 1kg', price: 140 },
  { name: 'Détergent Ariel 2kg', price: 850 },
  { name: 'Savon Dove 100g', price: 180 },
  { name: 'Smartphone Condor P8', price: 35000 },
  { name: 'Tablette ENIE 10"', price: 28000 }
]

// Fonctions utilitaires
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
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

async function seedSimpleAlgerianData() {
  console.log('🇩🇿 SEEDING SIMPLIFIÉ - DONNÉES ALGÉRIENNES')
  console.log('==========================================')

  try {
    // Vérifier quelles tables existent
    console.log('🔍 Vérification des tables existantes...')
    
    // Nettoyer les données existantes des tables qui existent
    try {
      await prisma.user.deleteMany()
      console.log('   ✅ Table users nettoyée')
    } catch (error: any) {
      console.log('   ⚠️  Table users non accessible')
    }

    try {
      await prisma.client.deleteMany()
      console.log('   ✅ Table clients nettoyée')
    } catch (error: any) {
      console.log('   ⚠️  Table clients non accessible')
    }

    try {
      await prisma.product.deleteMany()
      console.log('   ✅ Table products nettoyée')
    } catch (error: any) {
      console.log('   ⚠️  Table products non accessible')
    }

    // 1. Créer des utilisateurs (si possible)
    console.log('\n👥 Création des utilisateurs...')
    const users = []
    
    try {
      // Essayer de créer un utilisateur admin
      const adminPassword = await bcrypt.hash('admin123', SALT_ROUNDS)

      // D'abord, créer ou récupérer une entreprise
      let company = await prisma.company.findFirst()
      if (!company) {
        company = await prisma.company.create({
          data: {
            name: 'Entreprise Test DZ',
            email: 'contact@test.dz',
            phone: '+213 21 123 456',
            address: '123 Rue Didouche Mourad, Alger',
            city: 'Alger',
            postalCode: '16000',
            country: 'Algérie',
            currency: 'DZD',
            timezone: 'Africa/Algiers',
          },
        })
      }

      const admin = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          passwordHash: adminPassword,
          firstName: 'Admin',
          lastName: 'Test',
          role: 'ADMIN',
          companyId: company.id
        }
      })
      users.push(admin)
      console.log(`✅ Utilisateur admin créé: ${admin.email}`)

      // Créer quelques autres utilisateurs
      for (let i = 0; i < 3; i++) {
        const firstName = getRandomElement(ALGERIAN_FIRST_NAMES)
        const lastName = getRandomElement(ALGERIAN_LAST_NAMES)
        const password = await bcrypt.hash('password123', SALT_ROUNDS)
        
        const user = await prisma.user.create({
          data: {
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gestion-dz.com`,
            password,
            firstName,
            lastName,
            role: i === 0 ? 'MANAGER' : 'EMPLOYEE'
          }
        })
        users.push(user)
      }
      console.log(`✅ ${users.length} utilisateurs créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création utilisateurs: ${error.message}`)
    }

    // 2. Créer des clients algériens
    console.log('\n👥 Création des clients...')
    const clients = []
    
    try {
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
            address: `${Math.floor(Math.random() * 150) + 1} Rue 1er Novembre`,
            postalCode: city.postalCode,
            city: city.name,
            country: 'Algérie',
            paymentTerms: 30,
            discount: Math.floor(Math.random() * 5),
            isActive: true,
            notes: `Client particulier de ${city.name}`,
            tags: ['particulier', 'algérie']
          }
        })
        clients.push(client)
      }

      // Clients entreprises
      for (let i = 0; i < 5; i++) {
        const city = getRandomElement(ALGERIAN_CITIES)
        
        const client = await prisma.client.create({
          data: {
            type: 'COMPANY',
            companyName: `Entreprise ${getRandomElement(ALGERIAN_LAST_NAMES)} SARL`,
            email: `contact@entreprise${i + 1}.dz`,
            phone: generateAlgerianPhone(),
            address: `Zone Industrielle ${city.name}`,
            postalCode: city.postalCode,
            city: city.name,
            country: 'Algérie',
            paymentTerms: 45,
            discount: Math.floor(Math.random() * 10) + 5,
            isActive: true,
            notes: `Entreprise cliente basée à ${city.name}`,
            tags: ['entreprise', 'b2b', 'algérie']
          }
        })
        clients.push(client)
      }
      console.log(`✅ ${clients.length} clients créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création clients: ${error.message}`)
    }

    // 3. Créer des produits algériens
    console.log('\n📦 Création des produits...')
    const products = []
    
    try {
      for (let i = 0; i < ALGERIAN_PRODUCTS.length; i++) {
        const productData = ALGERIAN_PRODUCTS[i]
        
        const product = await prisma.product.create({
          data: {
            name: productData.name,
            description: `Produit algérien de qualité - ${productData.name}`,
            sku: generateSKU(productData.name, i + 1),
            barcode: `213${String(i + 1).padStart(10, '0')}`,
            price: productData.price,
            cost: Math.floor(productData.price * 0.7),
            vatRate: 19, // TVA algérienne
            stockQuantity: Math.floor(Math.random() * 100) + 10,
            minStock: Math.floor(Math.random() * 10) + 5,
            isActive: true,
            isService: false,
            unit: 'pièce'
          }
        })
        products.push(product)
      }
      console.log(`✅ ${products.length} produits créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création produits: ${error.message}`)
    }

    // Résumé final
    console.log('\n🎉 SEEDING SIMPLIFIÉ TERMINÉ !')
    console.log('==============================')
    console.log(`✅ Utilisateurs: ${users.length}`)
    console.log(`✅ Clients: ${clients.length}`)
    console.log(`✅ Produits: ${products.length}`)
    
    const total = users.length + clients.length + products.length
    console.log(`\n📊 Total: ${total} enregistrements`)
    
    if (users.length > 0) {
      console.log('\n🔗 Connexion admin:')
      console.log('   Email: admin@gestion-dz.com')
      console.log('   Mot de passe: admin123')
    }
    
    console.log('\n🇩🇿 Données algériennes créées avec succès !')
    
    return { users, clients, products }

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error)
    throw error
  }
}

// Point d'entrée
async function main() {
  try {
    await seedSimpleAlgerianData()
  } catch (error) {
    console.error('❌ Erreur fatale:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécution si appelé directement
if (require.main === module) {
  main()
}

export default main
