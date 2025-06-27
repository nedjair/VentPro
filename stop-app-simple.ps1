# Script d'arrêt simple - Gestion Commerciale TPE
Write-Host "🛑 Arrêt de l'application Gestion Commerciale TPE" -ForegroundColor Red
Write-Host "============================================================"

# Arrêter le backend
if (Test-Path "backend.pid") {
    $backendPid = Get-Content "backend.pid"
    Write-Host "🔄 Arrêt du backend (PID: $backendPid)..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Remove-Item "backend.pid" -ErrorAction SilentlyContinue
        Write-Host "✅ Backend arrêté" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Backend déjà arrêté" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ Aucun PID backend trouvé" -ForegroundColor Gray
}

# Arrêter le frontend
if (Test-Path "frontend.pid") {
    $frontendPid = Get-Content "frontend.pid"
    Write-Host "🔄 Arrêt du frontend (PID: $frontendPid)..." -ForegroundColor Yellow
    try {
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Remove-Item "frontend.pid" -ErrorAction SilentlyContinue
        Write-Host "✅ Frontend arrêté" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Frontend déjà arrêté" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️ Aucun PID frontend trouvé" -ForegroundColor Gray
}

# Arrêter les processus Node.js sur les ports
Write-Host "🔄 Nettoyage des ports..." -ForegroundColor Yellow

# Port 3000 (Frontend)
try {
    $processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
    if ($processes3000) {
        $processes3000 | ForEach-Object { 
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
        }
        Write-Host "✅ Port 3000 libéré" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️ Port 3000 déjà libre" -ForegroundColor Gray
}

# Port 3001 (Backend)
try {
    $processes3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($processes3001) {
        $processes3001 | ForEach-Object { 
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
        }
        Write-Host "✅ Port 3001 libéré" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️ Port 3001 déjà libre" -ForegroundColor Gray
}

# Optionnel: Arrêter PostgreSQL
Write-Host ""
$response = Read-Host "Voulez-vous aussi arrêter PostgreSQL? (y/N)"
if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "🔄 Arrêt de PostgreSQL..." -ForegroundColor Yellow
    docker-compose stop postgres
    Write-Host "✅ PostgreSQL arrêté" -ForegroundColor Green
}

Write-Host ""
Write-Host "✅ Application arrêtée avec succès!" -ForegroundColor Green
Write-Host "============================================================"
