#!/usr/bin/env pwsh
# Vérification performance Docker simple

Write-Host "🔍 VÉRIFICATION PERFORMANCE DOCKER" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

Write-Host "`n📊 CONTENEURS ACTIFS:" -ForegroundColor Green
docker ps

Write-Host "`n⚡ PERFORMANCES:" -ForegroundColor Yellow
docker stats --no-stream

Write-Host "`n🌐 TESTS CONNECTIVITÉ:" -ForegroundColor Magenta

# Test Backend
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend: OK - Uptime: $([math]::Round($response.uptime, 2))s" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend: Erreur" -ForegroundColor Red
}

try {
    $status = Invoke-RestMethod -Uri "http://localhost:3001/api/status" -TimeoutSec 5
    Write-Host "✅ API Status: $($status.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ API Status: Erreur" -ForegroundColor Red
}

Write-Host "`n💾 ESPACE DISQUE DOCKER:" -ForegroundColor Cyan
docker system df

Write-Host "`n✅ VÉRIFICATION TERMINÉE" -ForegroundColor Green