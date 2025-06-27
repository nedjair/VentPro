# Script de configuration automatique pour Windows PowerShell
# Application de gestion commerciale TPE

param(
    [switch]$SkipDocker,
    [switch]$SkipDependencies,
    [switch]$Verbose
)

# Configuration des couleurs
$Host.UI.RawUI.ForegroundColor = "White"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Test-Prerequisites {
    Write-Status "Vérification des prérequis..."
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version
        $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
        if ($versionNumber -lt 20) {
            Write-Error "Node.js version 20 ou supérieure requise. Version actuelle: $nodeVersion"
            exit 1
        }
        Write-Success "Node.js $nodeVersion détecté"
    }
    catch {
        Write-Error "Node.js n'est pas installé. Veuillez installer Node.js 20 LTS ou supérieur."
        exit 1
    }
    
    # Vérifier pnpm
    try {
        $pnpmVersion = pnpm --version
        Write-Success "pnpm $pnpmVersion détecté"
    }
    catch {
        Write-Warning "pnpm n'est pas installé. Installation en cours..."
        npm install -g pnpm@latest
    }
    
    # Vérifier Docker (si pas skippé)
    if (-not $SkipDocker) {
        try {
            docker --version | Out-Null
            Write-Success "Docker détecté"
        }
        catch {
            Write-Error "Docker n'est pas installé. Veuillez installer Docker Desktop."
            exit 1
        }
        
        try {
            docker-compose --version | Out-Null
            Write-Success "Docker Compose détecté"
        }
        catch {
            Write-Error "Docker Compose n'est pas installé."
            exit 1
        }
    }
}

function Set-Environment {
    Write-Status "Configuration des variables d'environnement..."
    
    # Copier les fichiers d'exemple s'ils n'existent pas
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Success "Fichier .env créé à partir de .env.example"
    }
    
    if (-not (Test-Path "apps/backend/.env")) {
        Copy-Item "apps/backend/.env.example" "apps/backend/.env"
        Write-Success "Fichier .env backend créé"
    }
    
    if (-not (Test-Path "apps/frontend/.env.local")) {
        Copy-Item "apps/frontend/.env.local.example" "apps/frontend/.env.local"
        Write-Success "Fichier .env.local frontend créé"
    }
    
    Write-Warning "Pensez à modifier les mots de passe et secrets dans les fichiers .env pour la production!"
}

function Install-Dependencies {
    if ($SkipDependencies) {
        Write-Status "Installation des dépendances ignorée (--SkipDependencies)"
        return
    }
    
    Write-Status "Installation des dépendances..."
    pnpm install
    Write-Success "Dépendances installées avec succès"
}

function Set-Docker {
    if ($SkipDocker) {
        Write-Status "Configuration Docker ignorée (--SkipDocker)"
        return
    }
    
    Write-Status "Configuration de l'infrastructure Docker..."
    
    # Créer les dossiers nécessaires
    New-Item -ItemType Directory -Force -Path "docker/postgres/data" | Out-Null
    New-Item -ItemType Directory -Force -Path "docker/redis/data" | Out-Null
    New-Item -ItemType Directory -Force -Path "uploads" | Out-Null
    
    # Arrêter les services existants s'ils tournent
    try {
        docker-compose down 2>$null
    }
    catch {
        # Ignorer les erreurs si les services ne tournent pas
    }
    
    # Démarrer les services
    Write-Status "Démarrage des services Docker (PostgreSQL, Redis, PgBouncer)..."
    docker-compose up -d
    
    # Attendre que PostgreSQL soit prêt
    Write-Status "Attente de la disponibilité de PostgreSQL..."
    $maxAttempts = 30
    $attempt = 0
    do {
        $attempt++
        try {
            docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale 2>$null | Out-Null
            break
        }
        catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    } while ($attempt -lt $maxAttempts)
    Write-Host ""
    
    # Vérifier que Redis est prêt
    Write-Status "Vérification de Redis..."
    $maxAttempts = 15
    $attempt = 0
    do {
        $attempt++
        try {
            docker-compose exec -T redis redis-cli -a redis_password_secure_2024 ping 2>$null | Out-Null
            break
        }
        catch {
            Write-Host "." -NoNewline
            Start-Sleep -Seconds 2
        }
    } while ($attempt -lt $maxAttempts)
    Write-Host ""
    
    Write-Success "Services Docker démarrés avec succès"
}

function Set-Database {
    Write-Status "Configuration de la base de données..."
    
    # Générer le client Prisma
    Write-Status "Génération du client Prisma..."
    pnpm db:generate
    
    # Appliquer le schéma à la base de données
    Write-Status "Application du schéma de base de données..."
    pnpm db:push
    
    # Insérer les données de test
    Write-Status "Insertion des données de test..."
    pnpm db:seed
    
    Write-Success "Base de données configurée avec succès"
}

function Test-Installation {
    Write-Status "Vérification de l'installation..."
    
    if (-not $SkipDocker) {
        # Vérifier que les services Docker sont en cours d'exécution
        $runningServices = docker-compose ps --services --filter "status=running"
        if (-not $runningServices) {
            Write-Error "Aucun service Docker n'est en cours d'exécution"
            return $false
        }
        
        # Vérifier la connectivité à PostgreSQL
        try {
            docker-compose exec -T postgres pg_isready -U gestion_user -d gestion_commerciale 2>$null | Out-Null
        }
        catch {
            Write-Error "Impossible de se connecter à PostgreSQL"
            return $false
        }
        
        # Vérifier la connectivité à Redis
        try {
            docker-compose exec -T redis redis-cli -a redis_password_secure_2024 ping 2>$null | Out-Null
        }
        catch {
            Write-Error "Impossible de se connecter à Redis"
            return $false
        }
    }
    
    Write-Success "Installation vérifiée avec succès"
    return $true
}

function Show-FinalInfo {
    Write-Host ""
    Write-Host "🎉 Configuration terminée avec succès!" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Informations importantes:" -ForegroundColor Cyan
    Write-Host "  • Base de données: PostgreSQL 16 (port 5432)"
    Write-Host "  • Connection pooling: PgBouncer (port 6432)"
    Write-Host "  • Cache: Redis 7 (port 6379)"
    Write-Host "  • Interface DB: Adminer (http://localhost:8080)"
    Write-Host "  • Interface Redis: Redis Commander (http://localhost:8081)"
    Write-Host ""
    Write-Host "🔐 Comptes de test créés:" -ForegroundColor Cyan
    Write-Host "  • Admin: admin@demo-tpe.fr / demo123"
    Write-Host "  • Manager: manager@demo-tpe.fr / demo123"
    Write-Host "  • Employé: employee@demo-tpe.fr / demo123"
    Write-Host ""
    Write-Host "🚀 Pour démarrer l'application:" -ForegroundColor Cyan
    Write-Host "  pnpm dev"
    Write-Host ""
    Write-Host "📚 URLs importantes:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:3000"
    Write-Host "  • Backend API: http://localhost:3001"
    Write-Host "  • Documentation API: http://localhost:3001/docs"
    Write-Host "  • Health check: http://localhost:3001/health"
    Write-Host ""
    Write-Host "📖 Consultez le README.md pour plus d'informations"
}

# Fonction principale
function Main {
    try {
        Write-Host "🚀 Configuration de l'application de gestion commerciale TPE" -ForegroundColor Green
        Write-Host "============================================================" -ForegroundColor Green
        Write-Host ""
        
        Test-Prerequisites
        Set-Environment
        Install-Dependencies
        Set-Docker
        Set-Database
        
        if (Test-Installation) {
            Show-FinalInfo
        }
        else {
            Write-Error "La vérification de l'installation a échoué"
            exit 1
        }
    }
    catch {
        Write-Error "Une erreur est survenue: $($_.Exception.Message)"
        exit 1
    }
}

# Exécution du script principal
Main
