Write-Host "=== DIAGNOSTIC DES ERREURS DE BUILD ===" -ForegroundColor Yellow

cd "d:/Gestion Commerciale"

# 1. Vérification des fichiers critiques
Write-Host "1. Vérification des fichiers critiques..." -ForegroundColor Cyan
$criticalFiles = @(
    "package.json",
    "pnpm-workspace.yaml", 
    "apps/backend/package.json",
    "apps/frontend/package.json",
    "apps/backend/Dockerfile",
    "apps/frontend/Dockerfile",
    "apps/backend/src/index.ts",
    "apps/frontend/src/app/page.tsx"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MANQUANT" -ForegroundColor Red
    }
}

# 2. Test build backend isolé
Write-Host ""
Write-Host "2. Test build backend..." -ForegroundColor Cyan
Write-Host "Commande: docker build -f apps/backend/Dockerfile -t test-backend ."
docker build -f apps/backend/Dockerfile -t test-backend . 2>&1 | Tee-Object -Variable backendBuildOutput
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Backend build OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Backend build ERREUR" -ForegroundColor Red
    Write-Host "Dernières lignes de l'erreur:" -ForegroundColor Yellow
    $backendBuildOutput | Select-Object -Last 10
}

# 3. Test build frontend isolé
Write-Host ""
Write-Host "3. Test build frontend..." -ForegroundColor Cyan
Write-Host "Commande: docker build -f apps/frontend/Dockerfile -t test-frontend ."
docker build -f apps/frontend/Dockerfile -t test-frontend . 2>&1 | Tee-Object -Variable frontendBuildOutput
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Frontend build OK" -ForegroundColor Green
} else {
    Write-Host "  ❌ Frontend build ERREUR" -ForegroundColor Red
    Write-Host "Dernières lignes de l'erreur:" -ForegroundColor Yellow
    $frontendBuildOutput | Select-Object -Last 10
}

# 4. Vérification du contexte Docker
Write-Host ""
Write-Host "4. Vérification du contexte Docker..." -ForegroundColor Cyan
Write-Host "Taille du contexte:" 
$contextSize = Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
Write-Host "  Fichiers: $($contextSize.Count), Taille: $([math]::Round($contextSize.Sum/1MB, 2)) MB"

# 5. Vérification .dockerignore
if (Test-Path ".dockerignore") {
    Write-Host "  ✅ .dockerignore existe" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  .dockerignore manquant (contexte peut être trop gros)" -ForegroundColor Yellow
}

# 6. Vérification des logs Docker Compose
Write-Host ""
Write-Host "5. Logs du dernier docker-compose..." -ForegroundColor Cyan
docker-compose -f docker-compose.prod.yml logs --tail=20 2>$null

Write-Host ""
Write-Host "=== SOLUTIONS RECOMMANDÉES ===" -ForegroundColor Green
Write-Host "Si erreur de build backend:" -ForegroundColor Yellow
Write-Host "  1. Vérifier apps/backend/src/index.ts existe" -ForegroundColor White
Write-Host "  2. Vérifier apps/backend/package.json correct" -ForegroundColor White
Write-Host ""
Write-Host "Si erreur de build frontend:" -ForegroundColor Yellow  
Write-Host "  1. Vérifier next.config.mjs configuré pour standalone" -ForegroundColor White
Write-Host "  2. Vérifier apps/frontend/src/app/page.tsx existe" -ForegroundColor White
Write-Host ""
Write-Host "Pour build simple sans cache:" -ForegroundColor Yellow
Write-Host "  docker build --no-cache -f apps/backend/Dockerfile -t test-backend ." -ForegroundColor White
Write-Host "  docker build --no-cache -f apps/frontend/Dockerfile -t test-frontend ." -ForegroundColor White