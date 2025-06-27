Write-Host "=== TEST DES NOUVEAUX DOCKERFILES ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Arrêter tous les conteneurs existants
Write-Host "1. Nettoyage des conteneurs existants..." -ForegroundColor Yellow
docker stop $(docker ps -aq) 2>$null
docker-compose -f docker-compose.prod.yml down 2>$null

# 2. Installation des dépendances locales
Write-Host "2. Installation des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "pnpm-lock.yaml")) {
    pnpm install --no-frozen-lockfile
}

# 3. Test build backend
Write-Host "3. Build Backend..." -ForegroundColor Cyan
Write-Host "Commande: docker build -f Dockerfile.backend -t gestion-backend-new ."
docker build --no-cache -f Dockerfile.backend -t gestion-backend-new . 2>&1 | Tee-Object -Variable backendOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend build SUCCESS" -ForegroundColor Green
    $backendBuildOK = $true
} else {
    Write-Host "❌ Backend build FAILED" -ForegroundColor Red
    Write-Host "Erreurs:" -ForegroundColor Yellow
    $backendOutput | Select-Object -Last 15
    $backendBuildOK = $false
}

Write-Host ""

# 4. Test build frontend
Write-Host "4. Build Frontend..." -ForegroundColor Cyan
Write-Host "Commande: docker build -f Dockerfile.frontend -t gestion-frontend-new ."
docker build --no-cache -f Dockerfile.frontend -t gestion-frontend-new --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 . 2>&1 | Tee-Object -Variable frontendOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build SUCCESS" -ForegroundColor Green
    $frontendBuildOK = $true
} else {
    Write-Host "❌ Frontend build FAILED" -ForegroundColor Red
    Write-Host "Erreurs:" -ForegroundColor Yellow
    $frontendOutput | Select-Object -Last 15
    $frontendBuildOK = $false
}

Write-Host ""

# 5. Si les builds sont OK, démarrer les conteneurs
if ($backendBuildOK -and $frontendBuildOK) {
    Write-Host "5. Démarrage des conteneurs..." -ForegroundColor Green
    
    # Démarrer PostgreSQL et Redis
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis
    Start-Sleep -Seconds 20
    
    # Démarrer Backend
    docker run -d --name gestion-backend-test --network gestion-commerciale_gestion-network-prod -p 3001:3001 --env-file .env.production gestion-backend-new
    Start-Sleep -Seconds 15
    
    # Démarrer Frontend  
    docker run -d --name gestion-frontend-test --network gestion-commerciale_gestion-network-prod -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 gestion-frontend-new
    Start-Sleep -Seconds 30
    
    # 6. Tests de connexion
    Write-Host "6. Tests de connexion..." -ForegroundColor Cyan
    
    try {
        $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
        Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Backend: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Logs Backend:" -ForegroundColor Yellow
        docker logs --tail=20 gestion-backend-test
    }
    
    try {
        $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
        Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Logs Frontend:" -ForegroundColor Yellow
        docker logs --tail=20 gestion-frontend-test
    }
    
    Write-Host ""
    Write-Host "=== APPLICATIONS DÉMARRÉES ===" -ForegroundColor Green
    Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
    
} else {
    Write-Host "❌ Build échoué - Applications non démarrées" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== COMMANDES UTILES ===" -ForegroundColor Yellow
Write-Host "Voir conteneurs:" -ForegroundColor White
Write-Host "  docker ps" -ForegroundColor Gray
Write-Host "Voir logs:" -ForegroundColor White
Write-Host "  docker logs gestion-backend-test" -ForegroundColor Gray
Write-Host "  docker logs gestion-frontend-test" -ForegroundColor Gray
Write-Host "Arrêter:" -ForegroundColor White
Write-Host "  docker stop gestion-backend-test gestion-frontend-test" -ForegroundColor Gray