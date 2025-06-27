Write-Host "=== DEMARRAGE CONTENEURS APPLICATION ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Vérifier que les dépendances sont installées
Write-Host "1. Vérification des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances..."
    pnpm install --no-frozen-lockfile
}

# 2. Construire les images app
Write-Host "2. Construction des images..." -ForegroundColor Yellow
Write-Host "Construction Backend..."
docker-compose -f docker-compose.prod.yml build backend

Write-Host "Construction Frontend..."  
docker-compose -f docker-compose.prod.yml build frontend

# 3. Démarrer les conteneurs app
Write-Host "3. Démarrage des conteneurs application..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d backend frontend

# 4. Attendre le démarrage
Write-Host "4. Attente du démarrage (60s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60

# 5. Vérification
Write-Host "5. Vérification finale..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "Tests de connexion:" -ForegroundColor Cyan

# Test backend
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
    Write-Host "✅ Backend OK: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend KO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs Backend:"
    docker logs --tail=10 gestion-backend-prod
}

# Test frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    Write-Host "✅ Frontend OK: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend KO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs Frontend:"
    docker logs --tail=10 gestion-frontend-prod
}

Write-Host ""
Write-Host "=== URLs DISPONIBLES ===" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "API Health: http://localhost:3001/health" -ForegroundColor White