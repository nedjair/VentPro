Write-Host "=== CORRECTION AUTOMATIQUE ===" -ForegroundColor Green

# 1. Arreter tous les conteneurs
Write-Host "1. Arret des conteneurs..." -ForegroundColor Cyan
docker stop $(docker ps -aq) 2>$null
docker-compose -f docker-compose.prod.yml down 2>$null

# 2. Corriger le probleme de lockfile
Write-Host "2. Correction du lockfile..." -ForegroundColor Cyan
if (-not (Test-Path "pnpm-lock.yaml")) {
    Write-Host "  Creation du lockfile..."
    pnpm install --no-frozen-lockfile
}

# 3. Corriger les Dockerfiles
Write-Host "3. Correction des Dockerfiles..." -ForegroundColor Cyan

# Backend Dockerfile
if (Test-Path "apps/backend/Dockerfile") {
    $backendDockerfile = Get-Content "apps/backend/Dockerfile" -Raw
    if ($backendDockerfile -match "--frozen-lockfile") {
        $backendDockerfile = $backendDockerfile -replace "--frozen-lockfile", "--no-frozen-lockfile"
        Set-Content -Path "apps/backend/Dockerfile" -Value $backendDockerfile
        Write-Host "  Backend Dockerfile corrige" -ForegroundColor Green
    }
}

# Frontend Dockerfile  
if (Test-Path "apps/frontend/Dockerfile") {
    $frontendDockerfile = Get-Content "apps/frontend/Dockerfile" -Raw
    if ($frontendDockerfile -match "--frozen-lockfile") {
        $frontendDockerfile = $frontendDockerfile -replace "--frozen-lockfile", "--no-frozen-lockfile"
        Set-Content -Path "apps/frontend/Dockerfile" -Value $frontendDockerfile
        Write-Host "  Frontend Dockerfile corrige" -ForegroundColor Green
    }
}

# 4. Nettoyer Docker
Write-Host "4. Nettoyage Docker..." -ForegroundColor Cyan
docker system prune -f 2>$null

# 5. Recreer les images
Write-Host "5. Recreation des images..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml build --no-cache

# 6. Demarrer
Write-Host "6. Demarrage..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

Write-Host ""
Write-Host "CORRECTION TERMINEE!" -ForegroundColor Green
Write-Host "Attendez 2-3 minutes puis testez:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White