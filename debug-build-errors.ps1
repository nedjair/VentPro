Write-Host "=== DIAGNOSTIC DÉTAILLÉ DES ERREURS DE BUILD ===" -ForegroundColor Red

cd "d:/Gestion Commerciale"

# 1. Test build backend local
Write-Host "1. TEST BUILD BACKEND LOCAL" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
cd "apps/backend"

Write-Host "Contenu du dossier backend:" -ForegroundColor Cyan
Get-ChildItem | Format-Table -Property Name, Length, LastWriteTime

Write-Host "Test compilation TypeScript..." -ForegroundColor Cyan
pnpm run build 2>&1 | Tee-Object -Variable backendBuildError

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend build local OK" -ForegroundColor Green
} else {
    Write-Host "❌ Backend build local FAILED" -ForegroundColor Red
    Write-Host "ERREURS DÉTAILLÉES:" -ForegroundColor Red
    $backendBuildError | ForEach-Object { Write-Host $_ -ForegroundColor White }
}

cd "../.."

Write-Host ""
Write-Host "2. TEST BUILD FRONTEND LOCAL" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Yellow
cd "apps/frontend"

Write-Host "Contenu du dossier frontend:" -ForegroundColor Cyan
Get-ChildItem | Format-Table -Property Name, Length, LastWriteTime

Write-Host "Test compilation NextJS..." -ForegroundColor Cyan
$env:NEXT_PUBLIC_API_URL = "http://localhost:3001"
pnpm run build 2>&1 | Tee-Object -Variable frontendBuildError

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend build local OK" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend build local FAILED" -ForegroundColor Red
    Write-Host "ERREURS DÉTAILLÉES:" -ForegroundColor Red
    $frontendBuildError | ForEach-Object { Write-Host $_ -ForegroundColor White }
}

cd "../.."

Write-Host ""
Write-Host "3. VÉRIFICATION DES FICHIERS CRITIQUES" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow

$criticalFiles = @(
    "apps/backend/src/index.ts",
    "apps/backend/tsconfig.json",
    "apps/frontend/src/app/page.tsx",
    "apps/frontend/next.config.mjs",
    "apps/frontend/tsconfig.json",
    "package.json",
    "pnpm-workspace.yaml"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file MANQUANT" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "4. VÉRIFICATION DES DÉPENDANCES" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

Write-Host "Vérification pnpm-lock.yaml..." -ForegroundColor Cyan
if (Test-Path "pnpm-lock.yaml") {
    Write-Host "✅ pnpm-lock.yaml existe" -ForegroundColor Green
} else {
    Write-Host "❌ pnpm-lock.yaml manquant" -ForegroundColor Red
}

Write-Host "Vérification node_modules..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "✅ node_modules existe" -ForegroundColor Green
} else {
    Write-Host "❌ node_modules manquant" -ForegroundColor Red
}

Write-Host ""
Write-Host "5. ANALYSE DES PACKAGES.JSON" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

Write-Host "Backend package.json:" -ForegroundColor Cyan
if (Test-Path "apps/backend/package.json") {
    $backendPkg = Get-Content "apps/backend/package.json" -Raw | ConvertFrom-Json
    Write-Host "  Name: $($backendPkg.name)" -ForegroundColor White
    Write-Host "  Scripts disponibles:" -ForegroundColor White
    $backendPkg.scripts.PSObject.Properties | ForEach-Object { Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor Gray }
}

Write-Host "Frontend package.json:" -ForegroundColor Cyan
if (Test-Path "apps/frontend/package.json") {
    $frontendPkg = Get-Content "apps/frontend/package.json" -Raw | ConvertFrom-Json
    Write-Host "  Name: $($frontendPkg.name)" -ForegroundColor White
    Write-Host "  Scripts disponibles:" -ForegroundColor White
    $frontendPkg.scripts.PSObject.Properties | ForEach-Object { Write-Host "    $($_.Name): $($_.Value)" -ForegroundColor Gray }
}

Write-Host ""
Write-Host "=== RÉSUMÉ DES PROBLÈMES ===" -ForegroundColor Red
if ($backendBuildError -and $backendBuildError.Count -gt 0) {
    Write-Host "BACKEND:" -ForegroundColor Red
    $backendBuildError | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
}
if ($frontendBuildError -and $frontendBuildError.Count -gt 0) {
    Write-Host "FRONTEND:" -ForegroundColor Red
    $frontendBuildError | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
}