#!/usr/bin/env pwsh
# Script d'optimisation des performances Docker Desktop
# Créé pour résoudre les problèmes de performance identifiés

Write-Host "🔧 OPTIMISATION DOCKER DESKTOP - GESTION COMMERCIALE" -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Nettoyage Docker complet
Write-Host "🧹 Étape 1: Nettoyage Docker..." -ForegroundColor Yellow
docker system prune -af --volumes
docker builder prune -af

# 2. Arrêt des conteneurs actuels
Write-Host "⏹️ Étape 2: Arrêt des conteneurs..." -ForegroundColor Yellow
docker-compose down --remove-orphans
docker-compose -f docker-compose.prod.yml down --remove-orphans

# 3. Vérification des ressources Docker Desktop
Write-Host "📊 Étape 3: Analyse des ressources..." -ForegroundColor Yellow
$dockerInfo = docker system df
Write-Host $dockerInfo

# 4. Configuration optimisée pour Docker Desktop
Write-Host "⚙️ Étape 4: Application des optimisations..." -ForegroundColor Yellow

# Vérification de la mémoire disponible
$availableMemory = (Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1KB / 1KB
Write-Host "💾 Mémoire disponible: $([math]::Round($availableMemory, 2)) GB" -ForegroundColor Green

# 5. Reconstruction avec optimisations
Write-Host "🔨 Étape 5: Reconstruction optimisée..." -ForegroundColor Yellow
$env:DOCKER_BUILDKIT = "1"
$env:COMPOSE_DOCKER_CLI_BUILD = "1"

# Build avec cache optimisé
docker-compose build --no-cache --parallel

# 6. Démarrage avec monitoring
Write-Host "🚀 Étape 6: Démarrage avec monitoring..." -ForegroundColor Yellow
docker-compose up -d

# Attente de stabilisation
Start-Sleep -Seconds 30

# 7. Vérification des performances
Write-Host "📈 Étape 7: Analyse des performances..." -ForegroundColor Yellow
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"

# 8. Vérification des logs
Write-Host "📋 Étape 8: Vérification des logs..." -ForegroundColor Yellow
$containers = @("gestion_backend", "gestion_postgres", "gestion-redis-prod", "gestion_frontend")

foreach ($container in $containers) {
    Write-Host "Logs $container" -ForegroundColor Cyan
    docker logs $container --tail 10
    Write-Host ""
}

# 9. Recommandations Docker Desktop
Write-Host "💡 RECOMMANDATIONS DOCKER DESKTOP:" -ForegroundColor Green
Write-Host "1. Allouez au moins 4GB de RAM à Docker Desktop" -ForegroundColor White
Write-Host "2. Activez 'Use Docker Compose V2'" -ForegroundColor White
Write-Host "3. Activez 'Enable VirtioFS accelerated directory sharing'" -ForegroundColor White
Write-Host "4. Désactivez 'Send usage statistics' pour de meilleures performances" -ForegroundColor White

# 10. Tests de connectivité
Write-Host "🔗 Étape 10: Tests de connectivité..." -ForegroundColor Yellow
$testUrls = @(
    "http://localhost:3000",  # Frontend
    "http://localhost:3001/health",  # Backend
    "http://localhost:8080"   # Adminer
)

foreach ($url in $testUrls) {
    try {
        $response = Invoke-WebRequest -Uri $url -TimeoutSec 5 -UseBasicParsing
        Write-Host "✅ $url - Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ $url - Erreur: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎯 OPTIMISATION TERMINÉE!" -ForegroundColor Green
Write-Host "Consultez docker stats pour surveiller les performances en temps reel." -ForegroundColor Yellow