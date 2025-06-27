Write-Host "=== BUILD MINIMAL QUI FONCTIONNE ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Build backend minimal
Write-Host "1. Build Backend Minimal..." -ForegroundColor Cyan
cd "apps/backend"

# Créer le dossier dist
New-Item -ItemType Directory -Force -Path "dist" | Out-Null

# Build seulement le fichier minimal
Write-Host "Compilation index-minimal.ts..." -ForegroundColor Yellow
npx tsc --project tsconfig.simple.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend minimal build OK" -ForegroundColor Green
    $backendOK = $true
} else {
    Write-Host "❌ Backend minimal build FAILED" -ForegroundColor Red
    $backendOK = $false
}

cd "../.."

# 2. Test du backend minimal
if ($backendOK) {
    Write-Host "2. Test Backend..." -ForegroundColor Cyan
    
    # Démarrer PostgreSQL pour les tests
    Write-Host "Démarrage PostgreSQL..." -ForegroundColor Yellow
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis
    Start-Sleep -Seconds 10
    
    # Démarrer backend minimal
    Write-Host "Démarrage Backend minimal..." -ForegroundColor Yellow
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/backend; node dist/index-minimal.js" -WindowStyle Minimized
    Start-Sleep -Seconds 5
    
    # Test de connexion
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
        Write-Host "✅ Backend fonctionne: $($response.status)" -ForegroundColor Green
        $backendRunning = $true
    } catch {
        Write-Host "❌ Backend pas accessible: $($_.Exception.Message)" -ForegroundColor Red
        $backendRunning = $false
    }
} else {
    $backendRunning = $false
}

# 3. Build frontend simple
Write-Host "3. Build Frontend..." -ForegroundColor Cyan
cd "apps/frontend"

$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
$env:NEXT_TELEMETRY_DISABLED = "1"

# Tentative de build
pnpm run build 2>&1 | Tee-Object -Variable frontendBuildOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build OK" -ForegroundColor Green
    $frontendOK = $true
} else {
    Write-Host "❌ Frontend build FAILED" -ForegroundColor Red
    Write-Host "Erreurs Frontend:" -ForegroundColor Yellow
    $frontendBuildOutput | Select-Object -Last 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    $frontendOK = $false
}

cd "../.."

# 4. Test frontend si build OK
if ($frontendOK -and $backendRunning) {
    Write-Host "4. Test Frontend..." -ForegroundColor Cyan
    
    # Démarrer frontend
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/frontend; pnpm start" -WindowStyle Minimized
    Start-Sleep -Seconds 20
    
    # Test de connexion
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        Write-Host "✅ Frontend fonctionne: Status $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Frontend pas accessible: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Résumé
Write-Host ""
Write-Host "=== RÉSUMÉ ===" -ForegroundColor Cyan
if ($backendOK) {
    Write-Host "✅ Backend: BUILD OK" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: BUILD FAILED" -ForegroundColor Red
}

if ($backendRunning) {
    Write-Host "✅ Backend: FONCTIONNE" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: NON ACCESSIBLE" -ForegroundColor Red
}

if ($frontendOK) {
    Write-Host "✅ Frontend: BUILD OK" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: BUILD FAILED" -ForegroundColor Red
}

if ($backendRunning -and $frontendOK) {
    Write-Host ""
    Write-Host "🎉 APPLICATIONS PRÊTES!" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
    Write-Host "🔍 Health:   http://localhost:3001/health" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "❌ Problèmes détectés - Applications non complètement fonctionnelles" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pour arrêter:" -ForegroundColor Yellow
Write-Host "  Get-Process -Name node | Stop-Process -Force" -ForegroundColor White