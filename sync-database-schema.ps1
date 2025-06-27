# Script PowerShell pour synchroniser le schéma Prisma avec PostgreSQL
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

# Fonction pour vérifier PostgreSQL
function Test-PostgreSQL {
    Write-Section "VÉRIFICATION DE POSTGRESQL"
    
    try {
        $postgresContainers = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
        if ($postgresContainers) {
            Write-Success "PostgreSQL en cours d'exécution: $postgresContainers"
            return $true
        } else {
            Write-Warning "PostgreSQL non détecté - tentative de démarrage..."
            
            $startResult = docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "PostgreSQL démarré"
                Write-Info "Attente de l'initialisation..."
                Start-Sleep -Seconds 20
                return $true
            } else {
                Write-Error "Impossible de démarrer PostgreSQL"
                Write-Host $startResult -ForegroundColor Red
                return $false
            }
        }
    }
    catch {
        Write-Error "Erreur lors de la vérification PostgreSQL: $($_.Exception.Message)"
        return $false
    }
}

# Fonction pour synchroniser le schéma
function Sync-PrismaSchema {
    Write-Section "SYNCHRONISATION DU SCHÉMA PRISMA"
    
    try {
        Write-Info "Changement vers le répertoire database..."
        Set-Location "packages/database"
        
        if (-not $Force) {
            Write-Warning "Cette opération va recréer toutes les tables et supprimer les données existantes !"
            $confirmation = Read-Host "Voulez-vous continuer ? (oui/non)"
            if ($confirmation -ne "oui" -and $confirmation -ne "o" -and $confirmation -ne "y" -and $confirmation -ne "yes") {
                Write-Info "Opération annulée par l'utilisateur"
                Set-Location "../.."
                return $false
            }
        }
        
        Write-Info "Exécution du reset complet de la base de données..."
        $resetResult = npx prisma db push --force-reset --accept-data-loss 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Schéma synchronisé avec succès"
        } else {
            Write-Warning "Tentative avec migrate reset..."
            $migrateResult = npx prisma migrate reset --force --skip-seed 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Migration reset réussie"
            } else {
                Write-Error "Erreur lors de la synchronisation du schéma"
                Write-Host $resetResult -ForegroundColor Red
                Write-Host $migrateResult -ForegroundColor Red
                Set-Location "../.."
                return $false
            }
        }
        
        Write-Info "Génération du client Prisma..."
        $generateResult = npx prisma generate 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Client Prisma généré"
        } else {
            Write-Error "Erreur lors de la génération du client"
            Write-Host $generateResult -ForegroundColor Red
            Set-Location "../.."
            return $false
        }
        
        Set-Location "../.."
        return $true
    }
    catch {
        Write-Error "Erreur lors de la synchronisation: $($_.Exception.Message)"
        Set-Location "../.."
        return $false
    }
}

# Fonction pour vérifier les tables créées
function Test-DatabaseTables {
    Write-Section "VÉRIFICATION DES TABLES CRÉÉES"
    
    try {
        Set-Location "packages/database"
        
        Write-Info "Vérification du schéma de base de données..."
        $pullResult = npx prisma db pull --print 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Schéma vérifié avec succès"
            
            # Extraire les noms de tables du résultat
            $tables = @()
            $pullResult | ForEach-Object {
                if ($_ -match "model\s+(\w+)") {
                    $tables += $matches[1]
                }
            }
            
            if ($tables.Count -gt 0) {
                Write-Success "Tables détectées:"
                $tables | ForEach-Object {
                    Write-Info "   - $_"
                }
            }
        } else {
            Write-Warning "Impossible de vérifier le schéma"
            Write-Host $pullResult -ForegroundColor Yellow
        }
        
        Set-Location "../.."
        return $true
    }
    catch {
        Write-Error "Erreur lors de la vérification: $($_.Exception.Message)"
        Set-Location "../.."
        return $false
    }
}

# Fonction principale
function Main {
    Write-ColorOutput "🔄 SYNCHRONISATION DU SCHÉMA PRISMA" "Cyan"
    Write-ColorOutput "Application de Gestion Commerciale TPE" "Magenta"
    Write-Host ""
    
    # Vérification de PostgreSQL
    $postgresOk = Test-PostgreSQL
    if (-not $postgresOk) {
        Write-Error "PostgreSQL n'est pas disponible. Impossible de continuer."
        return
    }
    
    # Synchronisation du schéma
    $syncOk = Sync-PrismaSchema
    if (-not $syncOk) {
        Write-Error "Échec de la synchronisation du schéma"
        return
    }
    
    # Vérification des tables
    $tablesOk = Test-DatabaseTables
    
    Write-Section "SYNCHRONISATION TERMINÉE"
    
    if ($syncOk -and $tablesOk) {
        Write-Success "🎉 Schéma Prisma synchronisé avec succès !"
        Write-Info ""
        Write-Info "📊 Tables créées selon le schéma Prisma:"
        Write-Info "   - companies (entreprises)"
        Write-Info "   - users (utilisateurs)"
        Write-Info "   - clients (clients)"
        Write-Info "   - products (produits)"
        Write-Info "   - suppliers (fournisseurs)"
        Write-Info "   - stocks (stocks)"
        Write-Info "   - categories (catégories)"
        Write-Info "   - orders (commandes)"
        Write-Info "   - invoices (factures)"
        Write-Info "   - Et toutes les tables de relations"
        Write-Info ""
        Write-Success "🚀 Vous pouvez maintenant exécuter le seeding:"
        Write-Info "   cd packages/database"
        Write-Info "   npm run db:seed-basic"
        Write-Info ""
        Write-Info "🌐 Ou utiliser le script complet:"
        Write-Info "   setup-database-algerian.bat"
    } else {
        Write-Error "❌ Problèmes détectés lors de la synchronisation"
        Write-Info "Consultez les messages d'erreur ci-dessus"
    }
}

# Exécution du script
Main
