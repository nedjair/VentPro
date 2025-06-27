# Script PowerShell pour vérifier l'état de la base de données PostgreSQL
# Application de Gestion Commerciale TPE

param(
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

# Fonction pour vérifier Docker
function Test-DockerStatus {
    Write-Section "VÉRIFICATION DE DOCKER"
    
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker installé: $dockerVersion"
        } else {
            Write-Error "Docker n'est pas installé ou accessible"
            return $false
        }
        
        # Vérifier si Docker est en cours d'exécution
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Docker daemon en cours d'exécution"
        } else {
            Write-Error "Docker daemon non accessible"
            return $false
        }
        
        return $true
    }
    catch {
        Write-Error "Erreur lors de la vérification Docker: $($_.Exception.Message)"
        return $false
    }
}

# Fonction pour vérifier les conteneurs PostgreSQL
function Test-PostgreSQLContainers {
    Write-Section "VÉRIFICATION DES CONTENEURS POSTGRESQL"
    
    try {
        # Vérifier les conteneurs PostgreSQL
        $postgresContainers = docker ps -a --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>$null
        
        if ($LASTEXITCODE -eq 0 -and $postgresContainers) {
            Write-Success "Conteneurs PostgreSQL trouvés:"
            Write-Host $postgresContainers
            
            # Vérifier si un conteneur PostgreSQL est en cours d'exécution
            $runningPostgres = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
            if ($runningPostgres) {
                Write-Success "Conteneur PostgreSQL en cours d'exécution: $runningPostgres"
                return $true
            } else {
                Write-Warning "Aucun conteneur PostgreSQL en cours d'exécution"
                return $false
            }
        } else {
            Write-Warning "Aucun conteneur PostgreSQL trouvé"
            return $false
        }
    }
    catch {
        Write-Error "Erreur lors de la vérification des conteneurs: $($_.Exception.Message)"
        return $false
    }
}

# Fonction pour démarrer PostgreSQL
function Start-PostgreSQL {
    Write-Section "DÉMARRAGE DE POSTGRESQL"
    
    try {
        Write-Info "Démarrage de PostgreSQL avec Docker Compose..."
        
        # Vérifier si le fichier docker-compose.prod.yml existe
        if (-not (Test-Path "docker-compose.prod.yml")) {
            Write-Error "Fichier docker-compose.prod.yml non trouvé"
            return $false
        }
        
        # Vérifier si le fichier .env existe
        if (-not (Test-Path ".env")) {
            Write-Error "Fichier .env non trouvé"
            return $false
        }
        
        # Démarrer PostgreSQL
        $result = docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "PostgreSQL démarré avec succès"
            
            # Attendre que PostgreSQL soit prêt
            Write-Info "Attente que PostgreSQL soit prêt..."
            Start-Sleep -Seconds 10
            
            return $true
        } else {
            Write-Error "Erreur lors du démarrage de PostgreSQL:"
            Write-Host $result -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Error "Erreur lors du démarrage: $($_.Exception.Message)"
        return $false
    }
}

# Fonction pour tester la connectivité avec Prisma
function Test-PrismaConnection {
    Write-Section "TEST DE CONNECTIVITÉ AVEC PRISMA"
    
    try {
        # Vérifier si le client Prisma est généré
        if (-not (Test-Path "packages/database/generated/client")) {
            Write-Warning "Client Prisma non généré"
            Write-Info "Génération du client Prisma..."
            
            Set-Location "packages/database"
            $generateResult = npx prisma generate 2>&1
            Set-Location "../.."
            
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Client Prisma généré"
            } else {
                Write-Error "Erreur lors de la génération du client Prisma"
                Write-Host $generateResult -ForegroundColor Red
                return $false
            }
        } else {
            Write-Success "Client Prisma trouvé"
        }
        
        # Tester la connectivité avec un script Node.js simple
        Write-Info "Test de connectivité à la base de données..."
        
        $testScript = @"
const { PrismaClient } = require('./packages/database/generated/client');

async function testConnection() {
    const prisma = new PrismaClient();
    try {
        await prisma.`$connect();
        console.log('SUCCESS: Connexion PostgreSQL établie');
        
        const result = await prisma.`$queryRaw``SELECT version() as version, current_database() as database``;
        console.log('INFO: Version PostgreSQL:', result[0].version);
        console.log('INFO: Base de données:', result[0].database);
        
        await prisma.`$disconnect();
        process.exit(0);
    } catch (error) {
        console.log('ERROR: Connexion échouée:', error.message);
        process.exit(1);
    }
}

testConnection();
"@
        
        $testScript | Out-File -FilePath "temp-db-test.js" -Encoding UTF8
        
        $connectionResult = node temp-db-test.js 2>&1
        Remove-Item "temp-db-test.js" -ErrorAction SilentlyContinue
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Connexion PostgreSQL réussie"
            $connectionResult | ForEach-Object {
                if ($_ -match "SUCCESS:") {
                    Write-Success ($_ -replace "SUCCESS: ", "")
                } elseif ($_ -match "INFO:") {
                    Write-Info ($_ -replace "INFO: ", "")
                }
            }
            return $true
        } else {
            Write-Error "Connexion PostgreSQL échouée"
            $connectionResult | ForEach-Object {
                if ($_ -match "ERROR:") {
                    Write-Error ($_ -replace "ERROR: ", "")
                } else {
                    Write-Host $_ -ForegroundColor Red
                }
            }
            return $false
        }
    }
    catch {
        Write-Error "Erreur lors du test Prisma: $($_.Exception.Message)"
        return $false
    }
}

# Fonction principale
function Main {
    Write-ColorOutput "🔍 DIAGNOSTIC DE LA BASE DE DONNÉES POSTGRESQL" "Cyan"
    Write-ColorOutput "Application de Gestion Commerciale TPE" "Magenta"
    Write-Host ""
    
    $dockerOk = Test-DockerStatus
    if (-not $dockerOk) {
        Write-Error "Docker n'est pas disponible. Impossible de continuer."
        return
    }
    
    $postgresRunning = Test-PostgreSQLContainers
    if (-not $postgresRunning) {
        Write-Info "Tentative de démarrage de PostgreSQL..."
        $startResult = Start-PostgreSQL
        if (-not $startResult) {
            Write-Error "Impossible de démarrer PostgreSQL"
            return
        }
    }
    
    $connectionOk = Test-PrismaConnection
    
    Write-Section "RÉSUMÉ DU DIAGNOSTIC"
    
    if ($dockerOk) {
        Write-Success "✅ Docker: Disponible"
    } else {
        Write-Error "❌ Docker: Non disponible"
    }
    
    if ($postgresRunning -or $startResult) {
        Write-Success "✅ PostgreSQL: En cours d'exécution"
    } else {
        Write-Error "❌ PostgreSQL: Non disponible"
    }
    
    if ($connectionOk) {
        Write-Success "✅ Connectivité: Base de données accessible"
    } else {
        Write-Error "❌ Connectivité: Base de données inaccessible"
    }
    
    Write-Section "RECOMMANDATIONS"
    
    if (-not $connectionOk) {
        Write-Warning "🔧 Actions recommandées:"
        Write-Info "   1. Vérifier que Docker Desktop est démarré"
        Write-Info "   2. Vérifier les paramètres dans le fichier .env"
        Write-Info "   3. Redémarrer PostgreSQL: docker-compose restart postgres"
        Write-Info "   4. Vérifier les logs: docker-compose logs postgres"
    } else {
        Write-Success "🎉 La base de données PostgreSQL est opérationnelle !"
        Write-Info "   Vous pouvez maintenant utiliser l'application"
    }
}

# Exécution du script
Main
