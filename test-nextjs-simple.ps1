# Test simple de l'application Next.js avec authentification
Write-Host "Test de l'application Next.js avec authentification" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

# Test Backend
Write-Host "1. Test Backend (port 3001):" -ForegroundColor Cyan
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Backend OK - Status: $($backend.StatusCode)" -ForegroundColor Green
    $backendOk = $true
} catch {
    Write-Host "   Backend KO - $($_.Exception.Message)" -ForegroundColor Red
    $backendOk = $false
}

# Test Frontend Next.js
Write-Host "2. Test Frontend Next.js (port 3003):" -ForegroundColor Cyan
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3003" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Frontend OK - Status: $($frontend.StatusCode)" -ForegroundColor Green
    $frontendOk = $true
} catch {
    Write-Host "   Frontend KO - $($_.Exception.Message)" -ForegroundColor Red
    $frontendOk = $false
}

# Test page de connexion
Write-Host "3. Test page de connexion:" -ForegroundColor Cyan
try {
    $login = Invoke-WebRequest -Uri "http://localhost:3003/login" -UseBasicParsing -TimeoutSec 5
    Write-Host "   Page de connexion OK - Status: $($login.StatusCode)" -ForegroundColor Green
    $loginOk = $true
} catch {
    Write-Host "   Page de connexion KO - $($_.Exception.Message)" -ForegroundColor Red
    $loginOk = $false
}

# Résumé
Write-Host ""
Write-Host "Résumé des tests:" -ForegroundColor White
Write-Host "  Backend: $(if ($backendOk) { 'OK' } else { 'KO' })" -ForegroundColor $(if ($backendOk) { "Green" } else { "Red" })
Write-Host "  Frontend: $(if ($frontendOk) { 'OK' } else { 'KO' })" -ForegroundColor $(if ($frontendOk) { "Green" } else { "Red" })
Write-Host "  Login: $(if ($loginOk) { 'OK' } else { 'KO' })" -ForegroundColor $(if ($loginOk) { "Green" } else { "Red" })

Write-Host ""
if ($frontendOk) {
    Write-Host "Application accessible sur:" -ForegroundColor Green
    Write-Host "  Frontend: http://localhost:3003" -ForegroundColor Cyan
    Write-Host "  Login: http://localhost:3003/login" -ForegroundColor Cyan
    if ($backendOk) {
        Write-Host "  Backend: http://localhost:3001" -ForegroundColor Cyan
    }
} else {
    Write-Host "Problèmes détectés:" -ForegroundColor Yellow
    if (-not $backendOk) {
        Write-Host "  - Démarrez le backend: node minimal-backend.js" -ForegroundColor Gray
    }
    if (-not $frontendOk) {
        Write-Host "  - Démarrez le frontend: cd frontend-nextjs-production && npm run dev" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Test terminé!" -ForegroundColor Green
