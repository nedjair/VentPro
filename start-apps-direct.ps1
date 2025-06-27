Write-Host "=== DEMARRAGE DIRECT DES APPLICATIONS ===" -ForegroundColor Green

cd "d:/Gestion Commerciale"

# 1. Vérifier la structure
Write-Host "1. Vérification de la structure..." -ForegroundColor Yellow
$requiredFiles = @(
    "apps/backend/src/index.ts",
    "apps/frontend/src/app/page.tsx",
    "apps/backend/package.json",
    "apps/frontend/package.json"
)

$allFilesOK = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MANQUANT" -ForegroundColor Red
        $allFilesOK = $false
    }
}

if (-not $allFilesOK) {
    Write-Host "❌ Fichiers manquants - Impossible de continuer" -ForegroundColor Red
    exit 1
}

# 2. Installation des dépendances
Write-Host "2. Installation des dépendances..." -ForegroundColor Yellow
pnpm install --no-frozen-lockfile

# 3. Démarrer PostgreSQL avec Docker (base de données uniquement)
Write-Host "3. Démarrage de PostgreSQL..." -ForegroundColor Yellow
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d postgres redis
Start-Sleep -Seconds 15

# 4. Configuration des variables d'environnement
Write-Host "4. Configuration des variables..." -ForegroundColor Yellow
$env:NODE_ENV = "development"
$env:DATABASE_URL = "postgresql://gestion_user:gestion_password_secure_2024@localhost:5432/gestion_commerciale"
$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
$env:PORT = "3001"

# 5. Build du backend TypeScript
Write-Host "5. Build du backend..." -ForegroundColor Cyan
cd "apps/backend"
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build backend échoué" -ForegroundColor Red
    cd "../.."
    exit 1
}
cd "../.."

# 6. Démarrer le backend
Write-Host "6. Démarrage du Backend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/backend; pnpm run start" -WindowStyle Minimized
Start-Sleep -Seconds 10

# 7. Test du backend
try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Host "✅ Backend OK: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend pas encore prêt, continuons..." -ForegroundColor Yellow
}

# 8. Démarrer le frontend
Write-Host "7. Démarrage du Frontend..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd '$(Get-Location)'; cd apps/frontend; pnpm run dev" -WindowStyle Minimized
Start-Sleep -Seconds 30

# 9. Tests finaux
Write-Host "8. Tests finaux..." -ForegroundColor Cyan

try {
    $backend = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 10
    Write-Host "✅ Backend: $($backend.status)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend: $($_.Exception.Message)" -ForegroundColor Red
}

try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 10
    Write-Host "✅ Frontend: Status $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== APPLICATIONS DÉMARRÉES ===" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "⚙️  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "🗄️  Database: localhost:5432 (Docker)" -ForegroundColor White

Write-Host ""
Write-Host "=== CONTRÔLE ===" -ForegroundColor Yellow
Write-Host "Processus Node.js actifs:" -ForegroundColor White
Get-Process -Name node -ErrorAction SilentlyContinue | Format-Table -Property Id, ProcessName, StartTime

Write-Host ""
Write-Host "Pour arrêter tout:" -ForegroundColor Yellow
Write-Host "  Get-Process -Name node | Stop-Process -Force" -ForegroundColor White
Write-Host "  docker-compose -f docker-compose.prod.yml down" -ForegroundColor White