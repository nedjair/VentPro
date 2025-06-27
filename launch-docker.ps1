Write-Host "Demarrage Docker Production" -ForegroundColor Green

# Arreter les anciens conteneurs
docker-compose -f docker-compose.prod.yml down

# Demarrer les nouveaux
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

Write-Host "Conteneurs demarres" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan