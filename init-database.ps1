# =============================================================================
# Script d'Initialisation Base de Données - Gestion Commerciale TPE
# =============================================================================
Write-Host "🗄️  INITIALISATION BASE DE DONNEES GESTION COMMERCIALE TPE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""

function Write-Step {
    param([string]$Message)
    Write-Host "▶️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Vérifier que Docker est démarré
Write-Step "Vérification de Docker..."
try {
    $dockerStatus = docker ps 2>$null
    Write-Success "Docker est actif"
}
catch {
    Write-Error "Docker n'est pas démarré. Veuillez démarrer Docker d'abord."
    exit 1
}

# Vérifier que PostgreSQL est accessible
Write-Step "Vérification de PostgreSQL..."
try {
    $pgTest = docker exec gestion-postgres pg_isready -U gestion_user -d gestion_commerciale 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "PostgreSQL est accessible"
    } else {
        Write-Error "PostgreSQL n'est pas accessible"
        Write-Host "Démarrez d'abord les services Docker avec: docker-compose up -d" -ForegroundColor Yellow
        exit 1
    }
}
catch {
    Write-Error "Impossible de se connecter à PostgreSQL"
    exit 1
}

# Créer le fichier .env pour la base de données
Write-Step "Configuration des variables d'environnement..."
$envContent = @"
# Configuration Base de Données - Gestion Commerciale TPE
DATABASE_URL="postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"
DIRECT_DATABASE_URL="postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"

# JWT
JWT_SECRET="your-secret-key-change-in-production-2024"
JWT_REFRESH_SECRET="your-refresh-secret-key-change-in-production-2024"

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="redis_password_secure_2024"

# Application
NODE_ENV="development"
PORT=3001
HOST="0.0.0.0"
CORS_ORIGIN="http://localhost:3000,http://localhost:3002"
"@

$envContent | Out-File -FilePath "packages/database/.env" -Encoding UTF8
Write-Success "Variables d'environnement configurées"

# Vérifier si le package database existe
if (!(Test-Path "packages/database")) {
    Write-Step "Création du package database..."
    New-Item -ItemType Directory -Path "packages/database" -Force | Out-Null
    
    # Créer package.json pour le package database
    $packageJson = @"
{
  "name": "@gestion/database",
  "version": "1.0.0",
  "description": "Schéma de base de données et migrations Prisma",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "node seed.js",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset --force"
  },
  "dependencies": {
    "prisma": "^5.15.1",
    "@prisma/client": "^5.15.1",
    "bcrypt": "^5.1.1"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2"
  }
}
"@
    $packageJson | Out-File -FilePath "packages/database/package.json" -Encoding UTF8
    Write-Success "Package database créé"
}

# Créer un schéma Prisma simplifié
Write-Step "Création du schéma Prisma..."
$prismaSchema = @"
// Schéma Prisma pour l'application de gestion commerciale TPE
generator client {
  provider = "prisma-client-js"
  output   = "./generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Modèle Utilisateur
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  firstName String
  lastName  String
  role      UserRole @default(EMPLOYEE)
  isActive  Boolean  @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("users")
}

enum UserRole {
  ADMIN
  MANAGER
  EMPLOYEE
}

// Modèle Client
model Client {
  id           String      @id @default(cuid())
  type         ClientType  @default(INDIVIDUAL)
  
  firstName    String?
  lastName     String?
  companyName  String?
  email        String?
  phone        String?
  
  address      String?
  postalCode   String?
  city         String?
  country      String      @default("France")
  
  siret        String?
  vatNumber    String?
  
  paymentTerms Int         @default(30)
  discount     Decimal     @default(0) @db.Decimal(5,2)
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  @@map("clients")
}

enum ClientType {
  INDIVIDUAL
  COMPANY
}

// Modèle Produit
model Product {
  id           String      @id @default(cuid())
  name         String
  description  String?
  sku          String?     @unique
  
  price        Decimal     @db.Decimal(10,2)
  cost         Decimal?    @db.Decimal(10,2)
  vatRate      Decimal     @default(20) @db.Decimal(5,2)
  
  stockQuantity Int        @default(0)
  minStock     Int         @default(0)
  
  isActive     Boolean     @default(true)
  isService    Boolean     @default(false)
  unit         String      @default("pièce")
  
  category     String?
  
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  
  @@map("products")
}
"@

if (!(Test-Path "packages/database/schema.prisma")) {
    $prismaSchema | Out-File -FilePath "packages/database/schema.prisma" -Encoding UTF8
    Write-Success "Schéma Prisma créé"
}

# Installer les dépendances Prisma
Write-Step "Installation des dépendances Prisma..."
Set-Location "packages/database"
try {
    npm install prisma @prisma/client bcrypt 2>$null | Out-Null
    Write-Success "Dépendances Prisma installées"
}
catch {
    Write-Error "Erreur lors de l'installation des dépendances"
}
Set-Location "../.."

# Générer le client Prisma
Write-Step "Génération du client Prisma..."
Set-Location "packages/database"
try {
    npx prisma generate 2>$null | Out-Null
    Write-Success "Client Prisma généré"
}
catch {
    Write-Error "Erreur lors de la génération du client Prisma"
}

# Pousser le schéma vers la base de données
Write-Step "Création des tables en base de données..."
try {
    npx prisma db push --force-reset 2>$null | Out-Null
    Write-Success "Tables créées en base de données"
}
catch {
    Write-Error "Erreur lors de la création des tables"
}
Set-Location "../.."

# Créer un script de seed
Write-Step "Création des données de test..."
$seedScript = @"
const { PrismaClient } = require('./generated/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Création des données de test...')

  // Créer des utilisateurs
  const hashedPassword = await bcrypt.hash('demo123', 10)
  
  await prisma.user.createMany({
    data: [
      {
        email: 'admin@demo-tpe.fr',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN'
      },
      {
        email: 'manager@demo-tpe.fr',
        password: hashedPassword,
        firstName: 'Manager',
        lastName: 'User',
        role: 'MANAGER'
      },
      {
        email: 'employee@demo-tpe.fr',
        password: hashedPassword,
        firstName: 'Employee',
        lastName: 'User',
        role: 'EMPLOYEE'
      }
    ],
    skipDuplicates: true
  })

  // Créer des clients
  await prisma.client.createMany({
    data: [
      {
        type: 'INDIVIDUAL',
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean.dupont@example.com',
        phone: '0123456789',
        address: '123 Rue de la Paix',
        city: 'Paris',
        postalCode: '75001'
      },
      {
        type: 'COMPANY',
        companyName: 'ACME Corp',
        email: 'contact@acme.com',
        phone: '0987654321',
        address: '456 Avenue des Champs',
        city: 'Lyon',
        postalCode: '69001',
        siret: '12345678901234',
        vatNumber: 'FR12345678901'
      },
      {
        type: 'INDIVIDUAL',
        firstName: 'Marie',
        lastName: 'Martin',
        email: 'marie.martin@example.com',
        phone: '0147258369',
        address: '789 Boulevard Saint-Germain',
        city: 'Marseille',
        postalCode: '13001'
      }
    ],
    skipDuplicates: true
  })

  // Créer des produits
  await prisma.product.createMany({
    data: [
      {
        name: 'Ordinateur Portable HP',
        description: 'Ordinateur portable HP 15.6" avec processeur Intel i5',
        sku: 'HP-LAPTOP-001',
        price: 699.99,
        cost: 500.00,
        stockQuantity: 15,
        minStock: 5,
        category: 'Informatique'
      },
      {
        name: 'Consultation IT',
        description: 'Service de consultation informatique - 1 heure',
        sku: 'SERV-IT-001',
        price: 80.00,
        isService: true,
        unit: 'heure',
        category: 'Services'
      },
      {
        name: 'Souris Logitech',
        description: 'Souris sans fil Logitech MX Master 3',
        sku: 'LOG-MOUSE-001',
        price: 89.99,
        cost: 45.00,
        stockQuantity: 25,
        minStock: 10,
        category: 'Accessoires'
      }
    ],
    skipDuplicates: true
  })

  console.log('✅ Données de test créées avec succès')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la création des données:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
"@

$seedScript | Out-File -FilePath "packages/database/seed.js" -Encoding UTF8

# Exécuter le seed
Set-Location "packages/database"
try {
    node seed.js
    Write-Success "Données de test créées"
}
catch {
    Write-Error "Erreur lors de la création des données de test"
}
Set-Location "../.."

Write-Host ""
Write-Host "🎉 BASE DE DONNEES INITIALISEE AVEC SUCCES !" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

Write-Host "📊 INFORMATIONS DE CONNEXION :" -ForegroundColor Cyan
Write-Host "  Base de données : gestion_commerciale" -ForegroundColor White
Write-Host "  Utilisateur     : gestion_user" -ForegroundColor White
Write-Host "  Mot de passe    : gestion_password_secure_2024" -ForegroundColor White
Write-Host "  Port            : 5432" -ForegroundColor White
Write-Host ""

Write-Host "👥 COMPTES UTILISATEURS CREES :" -ForegroundColor Cyan
Write-Host "  admin@demo-tpe.fr    / demo123 (ADMIN)" -ForegroundColor White
Write-Host "  manager@demo-tpe.fr  / demo123 (MANAGER)" -ForegroundColor White
Write-Host "  employee@demo-tpe.fr / demo123 (EMPLOYEE)" -ForegroundColor White
Write-Host ""

Write-Host "🔧 COMMANDES UTILES :" -ForegroundColor Cyan
Write-Host "  Prisma Studio   : cd packages/database && npx prisma studio" -ForegroundColor White
Write-Host "  Reset DB        : cd packages/database && npx prisma db push --force-reset" -ForegroundColor White
Write-Host "  Adminer         : http://localhost:8080" -ForegroundColor White
Write-Host ""
