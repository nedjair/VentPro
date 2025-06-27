Write-Host "Demarrage Docker (sans frozen-lockfile)" -ForegroundColor Green

# Arreter les conteneurs
docker-compose -f docker-compose.prod.yml down

# Modifier temporairement les Dockerfiles pour enlever --frozen-lockfile
$backendDockerfile = Get-Content "apps/backend/Dockerfile" -Raw
$backendDockerfile = $backendDockerfile -replace "--frozen-lockfile", "--no-frozen-lockfile"
Set-Content -Path "apps/backend/Dockerfile" -Value $backendDockerfile

# Demarrer
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

Write-Host "Conteneurs demarres" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan