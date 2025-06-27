Write-Host "=== BUILD ET DEMARRAGE DES CONTENEURS ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Arrêter tous les conteneurs
Write-Host "1. Arrêt des conteneurs existants..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml down

# 2. Installer les dépendances d'abord
Write-Host "2. Installation des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "pnpm-lock.yaml")) {
    pnpm install --no-frozen-lockfile
}

# 3. Build du backend
Write-Host "3. Build du backend..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache backend

# 4. Build du frontend
Write-Host "4. Build du frontend..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml build --no-cache frontend

# 5. Démarrer tous les services
Write-Host "5. Démarrage de tous les services..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 6. Attendre le démarrage
Write-Host "6. Attente du démarrage (90s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 90

# 7. Vérification
Write-Host "7. Vérification des conteneurs..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml ps

Write-Host ""
Write-Host "=== TESTS DE CONNEXION ===" -ForegroundColor Cyan

# Test Backend
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
    Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs Backend:" -ForegroundColor Yellow
    docker logs --tail=10 gestion-backend-prod
}

Write-Host ""

# Test Frontend
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs Frontend:" -ForegroundColor Yellow
    docker logs --tail=10 gestion-frontend-prod
}

Write-Host ""
Write-Host "=== URLS DISPONIBLES ===" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "🔍 Health:   http://localhost:3001/health" -ForegroundColor White
Write-Host "🗄️  Nginx:    http://localhost:80" -ForegroundColor White

Write-Host ""
Write-Host "=== COMMANDES UTILES ===" -ForegroundColor Yellow
Write-Host "Voir les logs:" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f" -ForegroundColor Gray
Write-Host "Arrêter:" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml down" -ForegroundColor Gray
Write-Host "Redémarrer:" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml restart" -ForegroundColor Gray