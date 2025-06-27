#!/usr/bin/env pwsh
# Script de démarrage Docker simple et optimisé

Write-Host "🚀 DÉMARRAGE DOCKER OPTIMISÉ" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Variables d'environnement pour les performances
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

Write-Host "📋 Étape 1: Vérification du nettoyage..." -ForegroundColor Yellow
docker ps -a

Write-Host "`n🔨 Étape 2: Construction avec cache optimisé..." -ForegroundColor Yellow
docker-compose build --parallel postgres redis

Write-Host "`n🚀 Étape 3: Démarrage des services essentiels..." -ForegroundColor Yellow
docker-compose up -d postgres redis

Write-Host "`n⏳ Étape 4: Attente de la base de données..." -ForegroundColor Yellow
$timeout = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $healthCheck = docker inspect gestion-postgres --format='{{.State.Health.Status}}' 2>$null
    Write-Host "." -NoNewline
    if ($elapsed -ge $timeout) {
        Write-Host "`n❌ Timeout: PostgreSQL n'est pas prêt après $timeout secondes" -ForegroundColor Red
        break
    }
} while ($healthCheck -ne "healthy")

if ($healthCheck -eq "healthy") {
    Write-Host "`n✅ PostgreSQL est prêt!" -ForegroundColor Green
    
    Write-Host "`n📊 Étape 5: Vérification des performances..." -ForegroundColor Yellow
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
    
    Write-Host "`n🔗 Étape 6: Tests de connectivité..." -ForegroundColor Yellow
    
    # Test PostgreSQL
    try {
        $pgTest = docker exec gestion-postgres pg_isready -U gestion_user -d gestion_commerciale
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ PostgreSQL: Erreur" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ PostgreSQL: Erreur de connexion" -ForegroundColor Red
    }
    
    # Test Redis
    try {
        $redisTest = docker exec gestion-redis redis-cli -a redis_password_secure_2024 ping
        if ($redisTest -eq "PONG") {
            Write-Host "✅ Redis: OK" -ForegroundColor Green
        } else {
            Write-Host "❌ Redis: Erreur" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Redis: Erreur de connexion" -ForegroundColor Red
    }
    
    Write-Host "`n🎯 SERVICES ESSENTIELS PRÊTS!" -ForegroundColor Green
    Write-Host "Vous pouvez maintenant démarrer le backend et frontend." -ForegroundColor Yellow
    Write-Host "`nCommandes suivantes:" -ForegroundColor Cyan
    Write-Host "  docker-compose up -d pgbouncer    # (optionnel)" -ForegroundColor White
    Write-Host "  # Puis démarrer votre backend en mode développement" -ForegroundColor White
    
} else {
    Write-Host "`n❌ ÉCHEC DU DÉMARRAGE" -ForegroundColor Red
    Write-Host "Consultez les logs: docker logs gestion-postgres" -ForegroundColor Yellow
}

Write-Host "`n📈 Pour surveiller les performances:" -ForegroundColor Cyan
Write-Host "  .\docker-monitor.ps1" -ForegroundColor White