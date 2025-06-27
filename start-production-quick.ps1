# Script de démarrage rapide après migration
param(
    [switch]$Migrate = $false,
    [switch]$Build = $false,
    [switch]$Clean = $false
)

Write-Host "🚀 Démarrage rapide - Gestion Commerciale" -ForegroundColor Green
Write-Host "=" * 45

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    Set-Location $ProjectRoot

    # Migration si demandée
    if ($Migrate) {
        Write-Host "🔄 Migration en cours..." -ForegroundColor Yellow
        & ".\migrate-simple.ps1"
        if ($LASTEXITCODE -ne 0) { throw "Erreur lors de la migration" }
        Write-Host "✅ Migration terminée" -ForegroundColor Green
    }

    # Nettoyage si demandé
    if ($Clean) {
        Write-Host "🧹 Nettoyage..." -ForegroundColor Yellow
        docker-compose -f docker-compose.prod.yml down --remove-orphans 2>$null
        docker system prune -f 2>$null
        Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    }

    # Installation des dépendances
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "Erreur d'installation" }
    Write-Host "✅ Dépendances installées" -ForegroundColor Green

    # Build si demandé
    if ($Build) {
        Write-Host "🔨 Build des applications..." -ForegroundColor Yellow
        if (Test-Path "scripts/build-production.ps1") {
            & ".\scripts\build-production.ps1"
        } else {
            # Build manuel
            pnpm --filter "@gestion/backend" build 2>$null
            pnpm --filter "@gestion/frontend" build 2>$null
        }
        Write-Host "✅ Build terminé" -ForegroundColor Green
    }

    # Démarrage
    Write-Host "🐳 Démarrage des conteneurs..." -ForegroundColor Yellow
    if (Test-Path "scripts/start-production.ps1") {
        & ".\scripts\start-production.ps1" -Build -Detached
    } else {
        # Démarrage manuel
        docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build
    }
    
    if ($LASTEXITCODE -ne 0) { throw "Erreur de démarrage" }
    Write-Host "✅ Conteneurs démarrés" -ForegroundColor Green

    # Attendre et tester
    Write-Host "⏳ Attente du démarrage (30s)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    # Test rapide
    Write-Host "🧪 Test des services..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
        if ($response.status -eq "OK") {
            Write-Host "✅ Backend OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Backend pas encore prêt" -ForegroundColor Yellow
    }

    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Frontend OK" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️ Frontend pas encore prêt" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "🎉 APPLICATION DÉMARRÉE!" -ForegroundColor Green
    Write-Host "=" * 25
    Write-Host ""
    Write-Host "🌐 URLs:" -ForegroundColor Cyan
    Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "  • Backend:  http://localhost:3001" -ForegroundColor White
    Write-Host "  • API Docs: http://localhost:3001/docs" -ForegroundColor White
    Write-Host ""
    Write-Host "📋 Commandes utiles:" -ForegroundColor Cyan
    Write-Host "  • Logs: docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor White
    Write-Host "  • Arrêter: docker-compose -f docker-compose.prod.yml down" -ForegroundColor White
    Write-Host "  • État: docker-compose -f docker-compose.prod.yml ps" -ForegroundColor White

} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔧 Aide:" -ForegroundColor Yellow
    Write-Host "  • Vérifiez Docker Desktop" -ForegroundColor White
    Write-Host "  • Consultez les logs: docker-compose logs" -ForegroundColor White
    Write-Host "  • Essayez: .\start-production-quick.ps1 -Clean -Build" -ForegroundColor White
    exit 1
} finally {
    Set-Location $ProjectRoot
}