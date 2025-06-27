#!/usr/bin/env tsx

/**
 * Script de seeding basique pour les tables existantes
 * Fonctionne avec le schéma actuel sans relations complexes
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

async function seedBasicAlgerianData() {
  console.log('🇩🇿 SEEDING BASIQUE - DONNÉES ALGÉRIENNES')
  console.log('========================================')

  try {
    // Nettoyer les données existantes
    console.log('🧹 Nettoyage des données existantes...')
    
    try {
      await prisma.user.deleteMany()
      console.log('   ✅ Users nettoyés')
    } catch (error: any) {
      console.log('   ⚠️  Users: table non accessible')
    }

    try {
      await prisma.client.deleteMany()
      console.log('   ✅ Clients nettoyés')
    } catch (error: any) {
      console.log('   ⚠️  Clients: table non accessible')
    }

    try {
      await prisma.product.deleteMany()
      console.log('   ✅ Products nettoyés')
    } catch (error: any) {
      console.log('   ⚠️  Products: table non accessible')
    }

    // Créer une entreprise de base si la table existe
    let companyId = null
    try {
      const company = await prisma.company.create({
        data: {
          name: 'Gestion Commerciale Algérie SARL',
          address: '15 Rue Didouche Mourad',
          postalCode: '16000',
          city: 'Alger',
          country: 'Algérie',
          phone: '+213 21 12 34 56',
          email: 'contact@gestion-dz.com',
          currency: 'DA',
          timezone: 'Africa/Algiers'
        }
      })
      companyId = company.id
      console.log('✅ Entreprise créée')
    } catch (error: any) {
      console.log('⚠️  Table company non disponible - utilisation sans relation')
    }

    // Créer des utilisateurs
    console.log('\n👥 Création des utilisateurs...')
    const users = []
    
    try {
      const userData = [
        { email: 'admin@gestion-dz.com', firstName: 'Ahmed', lastName: 'Benali', role: 'ADMIN' },
        { email: 'manager@gestion-dz.com', firstName: 'Fatima', lastName: 'Cherif', role: 'MANAGER' },
        { email: 'employe@gestion-dz.com', firstName: 'Omar', lastName: 'Rahmani', role: 'EMPLOYEE' }
      ]

      for (const data of userData) {
        const password = await bcrypt.hash('password123', SALT_ROUNDS)
        
        const userCreateData: any = {
          email: data.email,
          password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          isActive: true
        }

        // Ajouter companyId seulement si disponible
        if (companyId) {
          userCreateData.companyId = companyId
        }

        const user = await prisma.user.create({ data: userCreateData })
        users.push(user)
      }
      console.log(`✅ ${users.length} utilisateurs créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création utilisateurs: ${error.message}`)
    }

    // Créer des clients
    console.log('\n👥 Création des clients...')
    const clients = []
    
    try {
      // Clients particuliers
      for (let i = 0; i < 10; i++) {
        const firstName = getRandomElement(ALGERIAN_FIRST_NAMES)
        const lastName = getRandomElement(ALGERIAN_LAST_NAMES)
        const city = getRandomElement(ALGERIAN_CITIES)
        
        const clientCreateData: any = {
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

        // Ajouter companyId seulement si disponible
        if (companyId) {
          clientCreateData.companyId = companyId
        }

        const client = await prisma.client.create({ data: clientCreateData })
        clients.push(client)
      }

      // Clients entreprises
      for (let i = 0; i < 5; i++) {
        const city = getRandomElement(ALGERIAN_CITIES)
        
        const clientCreateData: any = {
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

        // Ajouter companyId seulement si disponible
        if (companyId) {
          clientCreateData.companyId = companyId
        }

        const client = await prisma.client.create({ data: clientCreateData })
        clients.push(client)
      }
      console.log(`✅ ${clients.length} clients créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création clients: ${error.message}`)
    }

    // Créer des produits
    console.log('\n📦 Création des produits...')
    const products = []
    
    try {
      for (let i = 0; i < ALGERIAN_PRODUCTS.length; i++) {
        const productData = ALGERIAN_PRODUCTS[i]
        
        const productCreateData: any = {
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

        // Ajouter companyId seulement si disponible
        if (companyId) {
          productCreateData.companyId = companyId
        }

        const product = await prisma.product.create({ data: productCreateData })
        products.push(product)
      }
      console.log(`✅ ${products.length} produits créés`)
    } catch (error: any) {
      console.log(`❌ Erreur création produits: ${error.message}`)
    }

    // Résumé final
    console.log('\n🎉 SEEDING BASIQUE TERMINÉ !')
    console.log('============================')
    console.log(`✅ Utilisateurs: ${users.length}`)
    console.log(`✅ Clients: ${clients.length}`)
    console.log(`✅ Produits: ${products.length}`)
    
    const total = users.length + clients.length + products.length + (companyId ? 1 : 0)
    console.log(`\n📊 Total: ${total} enregistrements`)
    
    if (users.length > 0) {
      console.log('\n🔗 Connexions disponibles:')
      console.log('   Admin: admin@gestion-dz.com / password123')
      console.log('   Manager: manager@gestion-dz.com / password123')
      console.log('   Employé: employe@gestion-dz.com / password123')
    }
    
    console.log('\n🇩🇿 Données algériennes créées avec succès !')
    console.log('🌐 Application: http://localhost:3000')
    
    return { users, clients, products, companyId }

  } catch (error) {
    console.error('❌ Erreur lors du seeding:', error)
    throw error
  }
}

// Point d'entrée
async function main() {
  try {
    await seedBasicAlgerianData()
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
