# Demarrage production simple
Write-Host "Demarrage Gestion Commerciale TPE - Production" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"

try {
    # Verification Docker
    docker --version | Out-Null
    Write-Host "Docker disponible" -ForegroundColor Green

    # Nettoyage des conteneurs existants
    Write-Host "Nettoyage des conteneurs existants..." -ForegroundColor Yellow
    docker-compose -f docker-compose.simple.yml down 2>$null
    
    # Creation des repertoires necessaires
    if (-not (Test-Path "nginx")) { New-Item -Path "nginx" -ItemType Directory -Force | Out-Null }
    if (-not (Test-Path "static-app")) { New-Item -Path "static-app" -ItemType Directory -Force | Out-Null }

    # Demarrage des services
    Write-Host "Demarrage des services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.simple.yml up -d

    # Attente que les services soient prets
    Write-Host "Attente des services..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15

    # Verification des services
    Write-Host "Verification des services..." -ForegroundColor Yellow
    
    $containers = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion_"
    
    foreach ($container in $containers) {
        Write-Host "  $container" -ForegroundColor Cyan
    }

    # Test de l'API
    Write-Host "Test de l'API..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    try {
        $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 10
        Write-Host "API Health Check OK" -ForegroundColor Green
    } catch {
        Write-Host "API pas encore prete" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "Deploiement termine!" -ForegroundColor Green
    Write-Host ""
    Write-Host "URLs disponibles:" -ForegroundColor Cyan
    Write-Host "  • Application: http://localhost:3000" -ForegroundColor White
    Write-Host "  • API Backend: http://localhost:3001" -ForegroundColor White
    Write-Host "  • API Docs: http://localhost:3001/docs" -ForegroundColor White
    Write-Host "  • Health Check: http://localhost:3001/health" -ForegroundColor White
    Write-Host ""
    Write-Host "Commandes utiles:" -ForegroundColor Cyan
    Write-Host "  • Logs: docker-compose -f docker-compose.simple.yml logs -f" -ForegroundColor White
    Write-Host "  • Status: docker-compose -f docker-compose.simple.yml ps" -ForegroundColor White
    Write-Host "  • Arreter: docker-compose -f docker-compose.simple.yml down" -ForegroundColor White
    Write-Host ""
    Write-Host "Compte de test:" -ForegroundColor Cyan
    Write-Host "  • Email: admin@test.com" -ForegroundColor White
    Write-Host "  • Password: password123" -ForegroundColor White

} catch {
    Write-Host ""
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifications:" -ForegroundColor Yellow
    Write-Host "  • Docker Desktop est-il demarre?" -ForegroundColor White
    Write-Host "  • Les ports 3000, 3001, 5432 sont-ils libres?" -ForegroundColor White
    Write-Host "  • Consultez les logs: docker-compose -f docker-compose.simple.yml logs" -ForegroundColor White
    exit 1
}