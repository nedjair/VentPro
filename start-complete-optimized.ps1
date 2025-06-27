#!/usr/bin/env pwsh
# Script de démarrage complet optimisé pour Docker

Write-Host "🚀 DÉMARRAGE COMPLET - GESTION COMMERCIALE OPTIMISÉE" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Vérification des prérequis
Write-Host "`n📋 Vérification des prérequis..." -ForegroundColor Yellow
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Docker n'est pas installé" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker disponible" -ForegroundColor Green

# Phase 1: Nettoyage et optimisation
Write-Host "`n🧹 Phase 1: Nettoyage et optimisation..." -ForegroundColor Yellow
Write-Host "Arrêt des conteneurs existants..."
docker stop gestion-backend-simple gestion-postgres gestion-redis 2>$null
docker rm gestion-backend-simple gestion-postgres gestion-redis 2>$null

Write-Host "Nettoyage des images non utilisées..."
docker image prune -f 2>$null

# Phase 2: Démarrage des services de base
Write-Host "`n🗄️ Phase 2: Démarrage des services de base..." -ForegroundColor Yellow
Write-Host "Démarrage PostgreSQL et Redis..."
docker-compose up -d postgres redis

Write-Host "Attente de la disponibilité des services..."
$maxWait = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $pgHealth = docker inspect gestion-postgres --format='{{.State.Health.Status}}' 2>$null
    $redisHealth = docker inspect gestion-redis --format='{{.State.Health.Status}}' 2>$null
    Write-Host "." -NoNewline
    if ($elapsed -ge $maxWait) {
        Write-Host "`n❌ Timeout: Services non prêts après $maxWait secondes" -ForegroundColor Red
        exit 1
    }
} while ($pgHealth -ne "healthy" -or $redisHealth -ne "healthy")

Write-Host "`n✅ Services de base prêts!" -ForegroundColor Green

# Phase 3: Démarrage du backend
Write-Host "`n⚡ Phase 3: Démarrage du backend..." -ForegroundColor Yellow
Write-Host "Construction et démarrage du backend simple..."
docker build -f Dockerfile.simple -t gestion-backend-simple . --quiet
docker run -d --name gestion-backend-simple --network gestioncommerciale_gestion-network -p 3001:3001 -e DATABASE_URL=postgresql://gestion_user:gestion_password_secure_2024@gestion-postgres:5432/gestion_commerciale -e REDIS_URL=redis://:redis_password_secure_2024@gestion-redis:6379 gestion-backend-simple

Write-Host "Attente du backend..."
$maxWait = 30
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            break
        }
    } catch {}
    Write-Host "." -NoNewline
    if ($elapsed -ge $maxWait) {
        Write-Host "`n❌ Timeout: Backend non prêt après $maxWait secondes" -ForegroundColor Red
        exit 1
    }
} while ($true)

Write-Host "`n✅ Backend prêt!" -ForegroundColor Green

# Phase 4: Vérification et tests
Write-Host "`n🔍 Phase 4: Vérification finale..." -ForegroundColor Yellow
Write-Host "État des conteneurs:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`nPerformances:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

Write-Host "`nTests de connectivité:"
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend Health: OK (Uptime: $([math]::Round($health.uptime, 2))s)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend Health: Erreur" -ForegroundColor Red
}

try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/status" -TimeoutSec 5
    Write-Host "✅ API Status: $($status.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Status: Erreur" -ForegroundColor Red
}

# Phase 5: Ouverture du frontend de test
Write-Host "`n🌐 Phase 5: Ouverture du frontend de test..." -ForegroundColor Yellow
Write-Host "Ouverture du frontend de test dans le navigateur..."
Start-Process "test-frontend.html"

# Résumé final
Write-Host "`n🎯 DÉMARRAGE TERMINÉ AVEC SUCCÈS!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "📊 Services actifs:" -ForegroundColor Cyan
Write-Host "  • PostgreSQL: http://localhost:5432" -ForegroundColor White
Write-Host "  • Redis: http://localhost:6379" -ForegroundColor White
Write-Host "  • Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "  • Frontend Test: Ouvert dans le navigateur" -ForegroundColor White

Write-Host "`n🔧 Commandes utiles:" -ForegroundColor Cyan
Write-Host "  • Monitoring: .\check-docker-performance.ps1" -ForegroundColor White
Write-Host "  • Arrêt: docker stop gestion-backend-simple gestion-postgres gestion-redis" -ForegroundColor White
Write-Host "  • Logs: docker logs gestion-backend-simple" -ForegroundColor White

Write-Host "`n✨ Application prête à l'utilisation!" -ForegroundColor Green