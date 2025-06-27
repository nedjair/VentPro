# Script PowerShell pour peupler la base de données avec des données algériennes
# Application de Gestion Commerciale TPE

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

# Configuration des couleurs
$ErrorActionPreference = "Continue"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    switch ($Color) {
        "Red" { Write-Host $Message -ForegroundColor Red }
        "Green" { Write-Host $Message -ForegroundColor Green }
        "Yellow" { Write-Host $Message -ForegroundColor Yellow }
        "Blue" { Write-Host $Message -ForegroundColor Blue }
        "Cyan" { Write-Host $Message -ForegroundColor Cyan }
        "Magenta" { Write-Host $Message -ForegroundColor Magenta }
        default { Write-Host $Message }
    }
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-ColorOutput $Title "Cyan"
    Write-Host ("=" * 60) -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" "Blue"
}

# Fonction pour vérifier les prérequis
function Test-Prerequisites {
    Write-Section "VÉRIFICATION DES PRÉREQUIS"
    
    $allGood = $true
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Node.js installé: $nodeVersion"
        } else {
            Write-Error "Node.js non trouvé"
            $allGood = $false
        }
    }
    catch {
        Write-Error "Node.js non accessible"
        $allGood = $false
    }
    
    # Vérifier npm
    try {
        $npmVersion = npm --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "npm installé: $npmVersion"
        } else {
            Write-Error "npm non trouvé"
            $allGood = $false
        }
    }
    catch {
        Write-Error "npm non accessible"
        $allGood = $false
    }
    
    # Vérifier que PostgreSQL est en cours d'exécution
    try {
        $postgresContainers = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
        if ($postgresContainers) {
            Write-Success "PostgreSQL en cours d'exécution: $postgresContainers"
        } else {
            Write-Warning "PostgreSQL non détecté"
            Write-Info "Tentative de démarrage de PostgreSQL..."
            
            docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL démarré"
                Start-Sleep -Seconds 10
            } else {
                Write-Error "Impossible de démarrer PostgreSQL"
                $allGood = $false
            }
        }
    }
    catch {
        Write-Error "Docker non accessible"
        $allGood = $false
    }
    
    # Vérifier les fichiers nécessaires
    $requiredFiles = @(
        "packages/database/seed-algerian-data.ts",
        "packages/database/package.json",
        "packages/database/generated/client/index.js",
        ".env"
    )
    
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Success "Fichier trouvé: $file"
        } else {
            Write-Error "Fichier manquant: $file"
            $allGood = $false
        }
    }
    
    return $allGood
}

# Fonction pour installer les dépendances
function Install-Dependencies {
    Write-Section "INSTALLATION DES DÉPENDANCES"
    
    try {
        Write-Info "Installation des dépendances du package database..."
        Set-Location "packages/database"
        
        $installResult = npm install 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Dépendances installées"
        } else {
            Write-Error "Erreur lors de l'installation des dépendances"
            Write-Host $installResult -ForegroundColor Red
            Set-Location "../.."
            return $false
        }
        
        Set-Location "../.."
        return $true
    }
    catch {
        Write-Error "Erreur lors de l'installation: $($_.Exception.Message)"
        Set-Location "../.."
        return $false
    }
}

# Fonction pour générer le client Prisma
function Generate-PrismaClient {
    Write-Section "GÉNÉRATION DU CLIENT PRISMA"
    
    try {
        Write-Info "Génération du client Prisma..."
        Set-Location "packages/database"
        
        $generateResult = npx prisma generate 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Client Prisma généré"
        } else {
            Write-Error "Erreur lors de la génération du client Prisma"
            Write-Host $generateResult -ForegroundColor Red
            Set-Location "../.."
            return $false
        }
        
        Set-Location "../.."
        return $true
    }
    catch {
        Write-Error "Erreur lors de la génération: $($_.Exception.Message)"
        Set-Location "../.."
        return $false
    }
}

# Fonction pour exécuter le seeding
function Start-Seeding {
    Write-Section "EXÉCUTION DU SEEDING ALGÉRIEN"
    
    try {
        Write-Info "Démarrage du seeding avec des données algériennes..."
        Set-Location "packages/database"
        
        $seedResult = npm run db:seed-algerian 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Seeding terminé avec succès"
            Write-Host $seedResult -ForegroundColor Green
        } else {
            Write-Error "Erreur lors du seeding"
            Write-Host $seedResult -ForegroundColor Red
            Set-Location "../.."
            return $false
        }
        
        Set-Location "../.."
        return $true
    }
    catch {
        Write-Error "Erreur lors du seeding: $($_.Exception.Message)"
        Set-Location "../.."
        return $false
    }
}

# Fonction principale
function Main {
    Write-ColorOutput "🇩🇿 SEEDING DE LA BASE DE DONNÉES ALGÉRIENNE" "Cyan"
    Write-ColorOutput "Application de Gestion Commerciale TPE" "Magenta"
    Write-Host ""
    
    # Vérification des prérequis
    $prerequisitesOk = Test-Prerequisites
    if (-not $prerequisitesOk) {
        Write-Error "Les prérequis ne sont pas satisfaits. Impossible de continuer."
        return
    }
    
    # Confirmation si pas de force
    if (-not $Force) {
        Write-Warning "Cette opération va supprimer toutes les données existantes et les remplacer par des données de test algériennes."
        $confirmation = Read-Host "Voulez-vous continuer ? (oui/non)"
        if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "y" -and $confirmation -ne "yes") {
            Write-Info "Opération annulée par l'utilisateur"
            return
        }
    }
    
    # Installation des dépendances
    $dependenciesOk = Install-Dependencies
    if (-not $dependenciesOk) {
        Write-Error "Impossible d'installer les dépendances"
        return
    }
    
    # Génération du client Prisma
    $clientOk = Generate-PrismaClient
    if (-not $clientOk) {
        Write-Error "Impossible de générer le client Prisma"
        return
    }
    
    # Exécution du seeding
    $seedingOk = Start-Seeding
    if (-not $seedingOk) {
        Write-Error "Échec du seeding"
        return
    }
    
    Write-Section "SEEDING TERMINÉ AVEC SUCCÈS"
    Write-Success "🎉 La base de données a été peuplée avec des données algériennes !"
    Write-Info "🔗 Vous pouvez maintenant vous connecter avec:"
    Write-Info "   Email: admin@gestion-dz.com"
    Write-Info "   Mot de passe: admin123"
    Write-Info ""
    Write-Info "🌐 Accédez à l'application sur: http://localhost:3000"
    Write-Info "📊 Dashboard: http://localhost:3000/dashboard"
}

# Exécution du script
Main
