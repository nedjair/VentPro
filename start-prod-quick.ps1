# Demarrage rapide en production
Write-Host "Demarrage rapide en production - Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"

try {
    # Verification Docker
    docker --version | Out-Null
    Write-Host "Docker disponible" -ForegroundColor Green

    # Arret des conteneurs existants
    Write-Host "Arret des conteneurs existants..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml down 2>$null

    # Demarrage des services essentiels
    Write-Host "Demarrage de PostgreSQL..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres

    # Attendre PostgreSQL
    Write-Host "Attente de PostgreSQL..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Demarrage Redis
    Write-Host "Demarrage de Redis..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d redis

    Write-Host ""
    Write-Host "Services de base demarres!" -ForegroundColor Green
    Write-Host "PostgreSQL: port 5432" -ForegroundColor Cyan
    Write-Host "Redis: port 6379" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pour demarrer l'application complete:" -ForegroundColor Yellow
    Write-Host "docker-compose -f docker-compose.prod.yml --env-file .env.production up -d" -ForegroundColor White

} catch {
    Write-Host "Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}