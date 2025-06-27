#!/usr/bin/env pwsh
# Script de monitoring Docker simplifié et fonctionnel

param(
    [int]$RefreshInterval = 10,
    [int]$MaxIterations = 20
)

Write-Host "🔍 MONITORING DOCKER - GESTION COMMERCIALE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Actualisation toutes les $RefreshInterval secondes" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter`n" -ForegroundColor Yellow

$iteration = 0

try {
    while ($iteration -lt $MaxIterations) {
        $iteration++
        Clear-Host
        
        Write-Host "🔍 MONITORING DOCKER - Iteration $iteration/$MaxIterations" -ForegroundColor Cyan
        Write-Host "===============================================" -ForegroundColor Cyan
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "📅 $timestamp`n" -ForegroundColor Gray

        # Affichage des conteneurs
        Write-Host "📊 ÉTAT DES CONTENEURS:" -ForegroundColor Green
        Write-Host "======================" -ForegroundColor Green
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-Host

        Write-Host "`n⚡ PERFORMANCES EN TEMPS RÉEL:" -ForegroundColor Yellow
        Write-Host "==============================" -ForegroundColor Yellow
        docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}" | Out-Host

        # Tests de connectivité
        Write-Host "`n🌐 TESTS DE CONNECTIVITÉ:" -ForegroundColor Magenta
        Write-Host "=========================" -ForegroundColor Magenta
        
        # Test Backend
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Backend (3001): OK" -ForegroundColor Green
            } else {
                Write-Host "⚠️  Backend (3001): Status $($response.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Backend (3001): Inaccessible" -ForegroundColor Red
        }

        # Test PostgreSQL
        try {
            $pgTest = docker exec gestion-postgres pg_isready -U gestion_user -d gestion_commerciale 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ PostgreSQL (5432): OK" -ForegroundColor Green
            } else {
                Write-Host "❌ PostgreSQL (5432): Erreur" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ PostgreSQL (5432): Inaccessible" -ForegroundColor Red
        }

        # Test Redis
        try {
            $redisTest = docker exec gestion-redis redis-cli -a redis_password_secure_2024 ping 2>$null
            if ($redisTest -eq "PONG") {
                Write-Host "✅ Redis (6379): OK" -ForegroundColor Green
            } else {
                Write-Host "❌ Redis (6379): Erreur" -ForegroundColor Red
            }
        } catch {
            Write-Host "❌ Redis (6379): Inaccessible" -ForegroundColor Red
        }

        # Utilisation disque Docker
        Write-Host "`n💾 UTILISATION DISQUE DOCKER:" -ForegroundColor Cyan
        Write-Host "=============================" -ForegroundColor Cyan
        try {
            docker system df | Out-Host
        } catch {
            Write-Host "Erreur lors de la vérification du disque" -ForegroundColor Red
        }

        if ($iteration -lt $MaxIterations) {
            Write-Host "`n⏳ Prochaine mise à jour dans $RefreshInterval secondes..." -ForegroundColor Gray
            Write-Host "   (Iteration $($iteration + 1)/$MaxIterations)" -ForegroundColor Gray
            Start-Sleep -Seconds $RefreshInterval
        }
    }
    
    Write-Host "`n✅ Monitoring terminé après $MaxIterations itérations." -ForegroundColor Green
    
} catch {
    Write-Host "`n⏹️  Monitoring interrompu par l'utilisateur." -ForegroundColor Yellow
}

Write-Host "`n📋 RÉSUMÉ FINAL:" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
docker ps --format "table {{.Names}}\t{{.Status}}" | Out-Host
Write-Host "`nFin du monitoring." -ForegroundColor Gray