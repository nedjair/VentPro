# Script d'arrêt de l'application
Write-Host "=== ARRET APPLICATION GESTION COMMERCIALE TPE ===" -ForegroundColor Red
Write-Host ""

# Arrêter le frontend
if (Test-Path "frontend-working.pid") {
    $pid = Get-Content "frontend-working.pid"
    try {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Arret du frontend (PID: $pid)..." -ForegroundColor Blue
            Stop-Process -Id $pid -Force
            Write-Host "✅ Frontend arrete" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Frontend deja arrete" -ForegroundColor Yellow
    }
    Remove-Item "frontend-working.pid" -ErrorAction SilentlyContinue
}

# Arrêter le backend
if (Test-Path ".backend-working.pid") {
    $pid = Get-Content ".backend-working.pid"
    try {
        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Arret du backend (PID: $pid)..." -ForegroundColor Blue
            Stop-Process -Id $pid -Force
            Write-Host "✅ Backend arrete" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "⚠️  Backend deja arrete" -ForegroundColor Yellow
    }
    Remove-Item ".backend-working.pid" -ErrorAction SilentlyContinue
}

# Arrêter tous les processus Node.js restants
Write-Host "Arret des processus Node.js restants..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Arrêter Docker Compose
Write-Host "Arret des services Docker..." -ForegroundColor Blue
docker-compose down 2>$null | Out-Null
Write-Host "✅ Services Docker arretes" -ForegroundColor Green

# Nettoyer les fichiers temporaires
Remove-Item ".backend-working.pid" -ErrorAction SilentlyContinue
Remove-Item "frontend-working.pid" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ Application arretee avec succes !" -ForegroundColor Green
Write-Host ""
