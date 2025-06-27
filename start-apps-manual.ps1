Write-Host "=== DEMARRAGE MANUEL DES APPLICATIONS ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

Write-Host "Cette solution démarre les apps directement sans Docker" -ForegroundColor Yellow
Write-Host ""

# 1. Installer les dépendances si nécessaire
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances..."
    pnpm install --no-frozen-lockfile
}

# 2. Démarrer le backend en arrière-plan
Write-Host "Démarrage du Backend sur port 3001..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'apps/backend'; pnpm run dev" -WindowStyle Minimized

# 3. Attendre un peu
Start-Sleep -Seconds 5

# 4. Démarrer le frontend en arrière-plan  
Write-Host "Démarrage du Frontend sur port 3000..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'apps/frontend'; pnpm run dev" -WindowStyle Minimized

# 5. Attendre le démarrage
Write-Host "Attente du démarrage (30s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# 6. Tests
Write-Host "Tests de connexion:" -ForegroundColor Cyan

try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible" -ForegroundColor Red
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5  
    Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== APPLICATIONS DÉMARRÉES ===" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Pour arrêter:" -ForegroundColor Yellow
Write-Host "Get-Process -Name node | Stop-Process -Force" -ForegroundColor White