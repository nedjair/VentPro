Write-Host "=== DEMARRAGE SANS DOCKER (Test rapide) ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Installer les dépendances
Write-Host "1. Installation des dépendances..." -ForegroundColor Yellow
if (-not (Test-Path "pnpm-lock.yaml")) {
    pnpm install --no-frozen-lockfile
}

# 2. Démarrer seulement Postgres avec Docker (base de données)
Write-Host "2. Démarrage PostgreSQL avec Docker..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis

# 3. Attendre que la DB soit prête
Write-Host "3. Attente de la base de données..." -ForegroundColor Yellow
Start-Sleep -Seconds 20

# 4. Configurer les variables d'environnement pour les apps
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"
$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
$env:PORT = "3001"

# 5. Démarrer le backend en arrière-plan
Write-Host "4. Démarrage Backend (port 3001)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/backend; pnpm run dev" -WindowStyle Minimized

# 6. Attendre un peu puis démarrer le frontend
Start-Sleep -Seconds 10
Write-Host "5. Démarrage Frontend (port 3000)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/frontend; pnpm run dev" -WindowStyle Minimized

# 7. Attendre le démarrage complet
Write-Host "6. Attente du démarrage complet (45s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 45

# 8. Tests de connexion
Write-Host "7. Tests de connexion..." -ForegroundColor Cyan

try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vérifiez: cd apps/backend && pnpm run dev" -ForegroundColor Yellow
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend non accessible: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Vérifiez: cd apps/frontend && pnpm run dev" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== APPLICATION DÉMARRÉE ===" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "🗄️  Database: localhost:5432 (Docker)" -ForegroundColor White
Write-Host ""
Write-Host "Pour arrêter:" -ForegroundColor Yellow
Write-Host "  Get-Process -Name node | Stop-Process -Force" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml down" -ForegroundColor White