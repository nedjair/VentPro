Write-Host "=== DIAGNOSTIC APPLICATION NON FONCTIONNELLE ===" -ForegroundColor Yellow

cd "d:/Gestion Commerciale"

# 1. État des conteneurs
Write-Host "1. État des conteneurs:" -ForegroundColor Cyan
Write-Host "--- Conteneurs du projet ---"
docker-compose -f docker-compose.prod.yml ps
Write-Host ""
Write-Host "--- Tous les conteneurs Docker ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 2. Vérification des ports
Write-Host ""
Write-Host "2. Vérification des ports:" -ForegroundColor Cyan
$ports = @(3000, 3001, 5432, 6379)
foreach ($port in $ports) {
    $result = netstat -an | Select-String ":$port.*LISTENING"
    if ($result) {
        Write-Host "  Port $port: OCCUPE" -ForegroundColor Green
    } else {
        Write-Host "  Port $port: LIBRE (problème!)" -ForegroundColor Red
    }
}

# 3. Test de connexion
Write-Host ""
Write-Host "3. Tests de connexion:" -ForegroundColor Cyan

# Test Backend
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "  Backend (3001): OK - $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "  Backend (3001): ERREUR - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5
    Write-Host "  Frontend (3000): OK - Status $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend (3000): ERREUR - $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Logs des conteneurs
Write-Host ""
Write-Host "4. Derniers logs des conteneurs:" -ForegroundColor Cyan

$containers = @("gestion-frontend-prod", "gestion-backend-prod", "gestion-postgres-prod", "gestion-redis-prod")
foreach ($container in $containers) {
    Write-Host "--- Logs de $container ---" -ForegroundColor Gray
    docker logs --tail=5 $container 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Conteneur $container non trouvé" -ForegroundColor Yellow
    }
    Write-Host ""
}

# 5. Vérification des fichiers critiques
Write-Host "5. Fichiers critiques:" -ForegroundColor Cyan
$criticalFiles = @(
    "apps/frontend/package.json",
    "apps/backend/package.json", 
    "apps/frontend/src/app/page.tsx",
    "apps/backend/src/index.ts"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  $file: OK" -ForegroundColor Green
    } else {
        Write-Host "  $file: MANQUANT" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== SOLUTIONS POSSIBLES ===" -ForegroundColor Yellow
Write-Host "Si les conteneurs app ne sont pas démarrés:"
Write-Host "  docker-compose -f docker-compose.prod.yml up -d frontend backend" -ForegroundColor White
Write-Host ""
Write-Host "Si erreur de build:"
Write-Host "  docker-compose -f docker-compose.prod.yml build --no-cache frontend backend" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml up -d frontend backend" -ForegroundColor White
Write-Host ""
Write-Host "Pour voir les logs détaillés:"
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f frontend" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml logs -f backend" -ForegroundColor White