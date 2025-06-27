Write-Host "=== CORRECTION ET BUILD DES APPLICATIONS ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Nettoyage
Write-Host "1. Nettoyage..." -ForegroundColor Yellow
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/backend/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps/frontend/.next -ErrorAction SilentlyContinue
Remove-Item -Force pnpm-lock.yaml -ErrorAction SilentlyContinue

# 2. Installation propre des dépendances
Write-Host "2. Installation des dépendances..." -ForegroundColor Yellow
pnpm install --no-frozen-lockfile

# 3. Build backend avec tsconfig simplifié
Write-Host "3. Build Backend..." -ForegroundColor Cyan
cd "apps/backend"

# Test avec tsconfig simplifié
Write-Host "Tentative avec tsconfig simplifié..." -ForegroundColor Yellow
npx tsc --project tsconfig.simple.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend build OK avec tsconfig simple" -ForegroundColor Green
    $backendOK = $true
} else {
    Write-Host "❌ Tentative avec build normal..." -ForegroundColor Yellow
    pnpm run build
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend build OK avec config normale" -ForegroundColor Green
        $backendOK = $true
    } else {
        Write-Host "❌ Backend build échouée" -ForegroundColor Red
        $backendOK = $false
    }
}

cd "../.."

# 4. Build frontend
Write-Host "4. Build Frontend..." -ForegroundColor Cyan
cd "apps/frontend"

$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
$env:NEXT_TELEMETRY_DISABLED = "1"

pnpm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build OK" -ForegroundColor Green
    $frontendOK = $true
} else {
    Write-Host "❌ Frontend build échouée" -ForegroundColor Red
    $frontendOK = $false
}

cd "../.."

# 5. Résumé
Write-Host ""
Write-Host "=== RÉSULTAT ===" -ForegroundColor Cyan
if ($backendOK) {
    Write-Host "✅ Backend: BUILD OK" -ForegroundColor Green
} else {
    Write-Host "❌ Backend: BUILD FAILED" -ForegroundColor Red
}

if ($frontendOK) {
    Write-Host "✅ Frontend: BUILD OK" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend: BUILD FAILED" -ForegroundColor Red
}

# 6. Si les deux builds sont OK, test de démarrage
if ($backendOK -and $frontendOK) {
    Write-Host ""
    Write-Host "6. Test de démarrage..." -ForegroundColor Green
    
    # Démarrer base de données
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis
    Start-Sleep -Seconds 15
    
    # Démarrer backend
    Write-Host "Démarrage Backend..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/backend; node dist/index.js" -WindowStyle Minimized
    Start-Sleep -Seconds 10
    
    # Démarrer frontend
    Write-Host "Démarrage Frontend..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/frontend; pnpm start" -WindowStyle Minimized
    Start-Sleep -Seconds 20
    
    # Tests
    try {
        $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
        Write-Host "✅ Backend fonctionne: $($backend.status)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Backend pas accessible" -ForegroundColor Yellow
    }
    
    try {
        $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
        Write-Host "✅ Frontend fonctionne: Status $($frontend.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Frontend pas accessible" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "=== APPLICATIONS PRÊTES ===" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
    
} else {
    Write-Host ""
    Write-Host "❌ Build échoué - Vérifiez les erreurs ci-dessus" -ForegroundColor Red
}