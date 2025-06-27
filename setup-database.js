/**
 * Script de configuration de la base de données PostgreSQL
 * Configure la base de données, l'utilisateur et initialise les données
 */

const { Client } = require('pg')
const bcrypt = require('bcryptjs')

// Configuration de la base de données
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Base par défaut pour la connexion initiale
  user: 'postgres',
  password: 'postgres' // Mot de passe par défaut, à adapter selon votre installation
}

const TARGET_DB = {
  name: 'gestion_commerciale',
  user: 'gestion_user',
  password: 'gestion_password_secure_2024'
}

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

async function setupDatabase() {
  let client = null
  
  try {
    log('🔧 Configuration de la base de données PostgreSQL...', 'blue')
    
    // Connexion à PostgreSQL avec l'utilisateur postgres
    client = new Client(DB_CONFIG)
    await client.connect()
    log('✅ Connexion à PostgreSQL réussie', 'green')
    
    // Créer l'utilisateur s'il n'existe pas
    log(`🔐 Création de l'utilisateur ${TARGET_DB.user}...`, 'cyan')
    try {
      await client.query(`
        CREATE USER ${TARGET_DB.user} WITH PASSWORD '${TARGET_DB.password}';
      `)
      log(`✅ Utilisateur ${TARGET_DB.user} créé`, 'green')
    } catch (error) {
      if (error.code === '42710') { // L'utilisateur existe déjà
        log(`⚠️ L'utilisateur ${TARGET_DB.user} existe déjà`, 'yellow')
      } else {
        throw error
      }
    }
    
    // Créer la base de données s'elle n'existe pas
    log(`🗄️ Création de la base de données ${TARGET_DB.name}...`, 'cyan')
    try {
      await client.query(`CREATE DATABASE ${TARGET_DB.name} OWNER ${TARGET_DB.user};`)
      log(`✅ Base de données ${TARGET_DB.name} créée`, 'green')
    } catch (error) {
      if (error.code === '42P04') { // La base existe déjà
        log(`⚠️ La base de données ${TARGET_DB.name} existe déjà`, 'yellow')
      } else {
        throw error
      }
    }
    
    // Accorder tous les privilèges à l'utilisateur
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${TARGET_DB.name} TO ${TARGET_DB.user};`)
    log(`✅ Privilèges accordés à ${TARGET_DB.user}`, 'green')
    
    await client.end()
    
    // Se connecter à la base de données cible
    log(`🔗 Connexion à la base de données ${TARGET_DB.name}...`, 'cyan')
    client = new Client({
      host: 'localhost',
      port: 5432,
      database: TARGET_DB.name,
      user: TARGET_DB.user,
      password: TARGET_DB.password
    })
    await client.connect()
    log('✅ Connexion à la base de données cible réussie', 'green')
    
    await client.end()
    
    log('🎉 Configuration de la base de données terminée avec succès !', 'green')
    return true
    
  } catch (error) {
    log(`❌ Erreur lors de la configuration de la base de données: ${error.message}`, 'red')
    if (error.code) {
      log(`   Code d'erreur: ${error.code}`, 'red')
    }
    return false
  } finally {
    if (client) {
      try {
        await client.end()
      } catch (e) {
        // Ignorer les erreurs de fermeture
      }
    }
  }
}

async function runPrismaMigrations() {
  log('🔄 Exécution des migrations Prisma...', 'blue')
  
  const { spawn } = require('child_process')
  
  return new Promise((resolve, reject) => {
    const prismaProcess = spawn('npx', ['prisma', 'migrate', 'deploy', '--schema=../../packages/database/schema.prisma'], {
      cwd: './apps/backend',
      stdio: 'inherit'
    })
    
    prismaProcess.on('close', (code) => {
      if (code === 0) {
        log('✅ Migrations Prisma exécutées avec succès', 'green')
        resolve(true)
      } else {
        log(`❌ Échec des migrations Prisma (code: ${code})`, 'red')
        reject(new Error(`Prisma migrations failed with code ${code}`))
      }
    })
    
    prismaProcess.on('error', (error) => {
      log(`❌ Erreur lors de l'exécution des migrations: ${error.message}`, 'red')
      reject(error)
    })
  })
}

async function seedDatabase() {
  log('🌱 Initialisation des données de base...', 'blue')
  
  const { PrismaClient } = require('./packages/database/generated/client')
  const prisma = new PrismaClient()
  
  try {
    // Créer une entreprise de test
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
    
    log(`✅ Entreprise créée: ${company.name}`, 'green')
    
    // Créer un utilisateur admin avec mot de passe hashé
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
    
    log(`✅ Utilisateur admin créé: ${adminUser.email}`, 'green')
    
    // Créer une catégorie de base
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
    
    // Créer quelques produits de base
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: 'prod-ordinateur' },
        update: {},
        create: {
          id: 'prod-ordinateur',
          name: 'Ordinateur Portable Dell Latitude',
          description: 'Ordinateur portable professionnel 15.6" Intel Core i5',
          sku: 'DELL-LAT-001',
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
          name: 'Souris Logitech MX Master 3',
          description: 'Souris sans fil ergonomique pour professionnels',
          sku: 'LOG-MX3-001',
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
    
    log(`✅ ${products.length} produits créés`, 'green')
    
    // Créer quelques clients de base
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
    
    log(`✅ ${clients.length} clients créés`, 'green')
    
    log('🎉 Données de base initialisées avec succès !', 'green')
    log('📧 Utilisateur admin: admin@gctpe.dz', 'cyan')
    log('🔑 Mot de passe: admin123', 'cyan')
    
    return true
    
  } catch (error) {
    log(`❌ Erreur lors de l'initialisation des données: ${error.message}`, 'red')
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  log('🚀 CONFIGURATION COMPLÈTE DE LA BASE DE DONNÉES', 'blue')
  log('=' * 60, 'blue')
  
  try {
    // 1. Configuration de la base de données
    const dbSetup = await setupDatabase()
    if (!dbSetup) {
      throw new Error('Échec de la configuration de la base de données')
    }
    
    // 2. Exécution des migrations Prisma
    await runPrismaMigrations()
    
    // 3. Initialisation des données
    await seedDatabase()
    
    log('\n🎉 CONFIGURATION TERMINÉE AVEC SUCCÈS !', 'green')
    log('✅ Base de données PostgreSQL configurée', 'green')
    log('✅ Migrations Prisma exécutées', 'green')
    log('✅ Données de base initialisées', 'green')
    log('\n🔗 Vous pouvez maintenant démarrer l\'application backend', 'cyan')
    
  } catch (error) {
    log(`\n❌ ÉCHEC DE LA CONFIGURATION: ${error.message}`, 'red')
    process.exit(1)
  }
}

// Exécuter le script
if (require.main === module) {
  main()
}
