# Script de démarrage en production
param(
    [switch]$Build = $false,
    [switch]$Detached = $false,
    [switch]$Logs = $false,
    [string]$Service = ""
)

Write-Host "🚀 Démarrage en production - Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # Vérification des prérequis
    Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Yellow
    
    # Docker
    try {
        docker --version | Out-Null
        docker-compose --version | Out-Null
        Write-Host "  ✅ Docker et Docker Compose disponibles" -ForegroundColor Green
    } catch {
        throw "Docker ou Docker Compose non disponible. Veuillez les installer."
    }

    # Fichier .env.production
    if (-not (Test-Path ".env.production")) {
        throw "Fichier .env.production manquant. Créez-le à partir de .env.production.example"
    }
    Write-Host "  ✅ Configuration .env.production trouvée" -ForegroundColor Green

    # Build si demandé
    if ($Build) {
        Write-Host "🔨 Build des applications..." -ForegroundColor Yellow
        & "$ProjectRoot/scripts/build-production.ps1"
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build" }
    }

    # Préparation des volumes et réseaux
    Write-Host "📁 Préparation de l'environnement Docker..." -ForegroundColor Yellow
    
    # Création des répertoires logs
    $LogDirs = @(
        "$ProjectRoot/logs/backend",
        "$ProjectRoot/logs/nginx",
        "$ProjectRoot/logs/postgres"
    )
    
    foreach ($dir in $LogDirs) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Write-Host "  ✅ Créé: $dir" -ForegroundColor Green
        }
    }

    # Arrêt des conteneurs existants si running
    Write-Host "🛑 Arrêt des conteneurs existants..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml --env-file .env.production down 2>$null
    
    # Démarrage des services
    Write-Host "🚀 Démarrage des services..." -ForegroundColor Yellow
    
    $ComposeCmd = @(
        "docker-compose",
        "-f", "docker-compose.prod.yml",
        "--env-file", ".env.production",
        "up"
    )
    
    if ($Build) {
        $ComposeCmd += "--build"
    }
    
    if ($Detached) {
        $ComposeCmd += "-d"
    }
    
    if ($Service) {
        $ComposeCmd += $Service
    }

    Write-Host "💻 Commande: $($ComposeCmd -join ' ')" -ForegroundColor Cyan
    Write-Host ""

    # Exécution
    & $ComposeCmd[0] $ComposeCmd[1..($ComposeCmd.Length-1)]
    
    if ($LASTEXITCODE -ne 0) {
        throw "Erreur lors du démarrage des conteneurs"
    }

    if ($Detached) {
        Write-Host ""
        Write-Host "🎉 Services démarrés en arrière-plan!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 URLs disponibles:" -ForegroundColor Cyan
        Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "  • Backend API: http://localhost:3001" -ForegroundColor White
        Write-Host "  • API Docs: http://localhost:3001/docs" -ForegroundColor White
        Write-Host "  • Health Check: http://localhost:3001/health" -ForegroundColor White
        Write-Host ""
        Write-Host "📊 Commandes utiles:" -ForegroundColor Cyan
        Write-Host "  • Voir les logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
        Write-Host "  • Arrêter: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
        Write-Host "  • Status: docker-compose -f docker-compose.prod.yml ps" -ForegroundColor White
    }

    if ($Logs -and $Detached) {
        Write-Host "📋 Affichage des logs..." -ForegroundColor Yellow
        docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f
    }

} catch {
    Write-Host ""
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Aide au dépannage:" -ForegroundColor Yellow
    Write-Host "  • Vérifiez que Docker Desktop est démarré" -ForegroundColor White
    Write-Host "  • Vérifiez le fichier .env.production" -ForegroundColor White
    Write-Host "  • Consultez les logs: docker-compose -f docker-compose.prod.yml logs" -ForegroundColor White
    Write-Host "  • Vérifiez les ports (3000, 3001, 5432) ne sont pas utilisés" -ForegroundColor White
    exit 1
} finally {
    Set-Location $ProjectRoot
}

# Exemples d'utilisation
if ($args.Count -eq 0 -and -not $Build -and -not $Detached -and -not $Logs -and -not $Service) {
    Write-Host ""
    Write-Host "💡 Exemples d'utilisation:" -ForegroundColor Cyan
    Write-Host "  .\scripts\start-production.ps1 -Build -Detached  # Build et démarrer en arrière-plan" -ForegroundColor White
    Write-Host "  .\scripts\start-production.ps1 -Logs              # Démarrer et voir les logs" -ForegroundColor White
    Write-Host "  .\scripts\start-production.ps1 -Service backend   # Démarrer seulement le backend" -ForegroundColor White
    Write-Host "  .\scripts\start-production.ps1 -Detached -Logs    # Démarrer en arrière-plan puis logs" -ForegroundColor White
}