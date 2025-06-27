Write-Host "=== DIAGNOSTIC DOCKER ===" -ForegroundColor Yellow

# 1. Verification Docker
Write-Host "1. Verification Docker..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version
    Write-Host "  Docker: $dockerVersion" -ForegroundColor Green
    
    $composeVersion = docker-compose --version  
    Write-Host "  Docker Compose: $composeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERREUR: Docker non disponible" -ForegroundColor Red
    Write-Host "  Solution: Demarrer Docker Desktop" -ForegroundColor Yellow
}

# 2. Verification des ports
Write-Host "2. Verification des ports..." -ForegroundColor Cyan
$ports = @(3000, 3001, 5432, 6379)
foreach ($port in $ports) {
    $result = netstat -an | Select-String ":$port "
    if ($result) {
        Write-Host "  Port $port: OCCUPE" -ForegroundColor Red
        Write-Host "  Processus: $result" -ForegroundColor Gray
    } else {
        Write-Host "  Port $port: LIBRE" -ForegroundColor Green
    }
}

# 3. Etat des conteneurs
Write-Host "3. Etat des conteneurs..." -ForegroundColor Cyan
try {
    docker-compose -f docker-compose.prod.yml ps
} catch {
    Write-Host "  Aucun conteneur trouve" -ForegroundColor Yellow
}

# 4. Verification des fichiers
Write-Host "4. Verification des fichiers..." -ForegroundColor Cyan
$files = @(
    "docker-compose.prod.yml",
    ".env.production", 
    "apps/frontend/package.json",
    "apps/backend/package.json",
    "pnpm-workspace.yaml"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  $file: OK" -ForegroundColor Green
    } else {
        Write-Host "  $file: MANQUANT" -ForegroundColor Red
    }
}

# 5. Verification pnpm
Write-Host "5. Verification pnpm..." -ForegroundColor Cyan
try {
    $pnpmVersion = pnpm --version
    Write-Host "  pnpm: $pnpmVersion" -ForegroundColor Green
    
    if (Test-Path "pnpm-lock.yaml") {
        Write-Host "  pnpm-lock.yaml: OK" -ForegroundColor Green
    } else {
        Write-Host "  pnpm-lock.yaml: MANQUANT" -ForegroundColor Red
        Write-Host "  Solution: pnpm install --no-frozen-lockfile" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  pnpm: NON INSTALLE" -ForegroundColor Red
    Write-Host "  Solution: npm install -g pnpm" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== SOLUTIONS RECOMMANDEES ===" -ForegroundColor Yellow

Write-Host "Si probleme de lockfile:"
Write-Host "  pnpm install --no-frozen-lockfile" -ForegroundColor White

Write-Host "Si ports occupes:"
Write-Host "  docker stop `$(docker ps -aq)" -ForegroundColor White

Write-Host "Si problemes de build:"
Write-Host "  docker system prune -af" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml up -d --build --no-cache" -ForegroundColor White

Write-Host "Demarrage simple:"
Write-Host "  .\launch-docker.ps1" -ForegroundColor White