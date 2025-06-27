Write-Host "=== BUILD SIMPLE DES CONTENEURS ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Arrêter tous les conteneurs
Write-Host "1. Arrêt des conteneurs..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down 2>$null

# 2. Installer les dépendances localement d'abord
Write-Host "2. Installation des dépendances locales..." -ForegroundColor Yellow
if (-not (Test-Path "pnpm-lock.yaml")) {
    pnpm install --no-frozen-lockfile
}

# 3. Build backend avec Dockerfile simple
Write-Host "3. Build backend simple..." -ForegroundColor Yellow
docker build --no-cache -f apps/backend/Dockerfile.simple -t gestion-backend-simple .
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Backend build OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend build ERREUR" -ForegroundColor Red
    Write-Host "Trying direct Node.js approach..." -ForegroundColor Yellow
}

# 4. Build frontend avec Dockerfile simple
Write-Host "4. Build frontend simple..." -ForegroundColor Yellow
docker build --no-cache -f apps/frontend/Dockerfile.simple -t gestion-frontend-simple --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 .
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Frontend build OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend build ERREUR" -ForegroundColor Red
    Write-Host "Trying direct Node.js approach..." -ForegroundColor Yellow
}

# 5. Démarrer avec les images simples si build OK
Write-Host "5. Démarrage des conteneurs simples..." -ForegroundColor Yellow

# Démarrer postgres et redis d'abord
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# Attendre que les bases soient prêtes
Start-Sleep -Seconds 30

# Démarrer backend simple
docker run -d --name gestion-backend-simple --network gestion-commerciale_gestion-network-prod -p 3001:3001 --env-file .env.production gestion-backend-simple

# Démarrer frontend simple
docker run -d --name gestion-frontend-simple --network gestion-commerciale_gestion-network-prod -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://localhost:3001 gestion-frontend-simple

# 6. Vérification
Write-Host "6. Vérification..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "=== TESTS ===" -ForegroundColor Cyan

# Test Backend
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "URLs:" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White