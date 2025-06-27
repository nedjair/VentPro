# Script de build pour la production
param(
    [switch]$Clean = $false,
    [switch]$Verbose = $false
)

Write-Host "🚀 Build de production - Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    # 1. Nettoyage si demandé
    if ($Clean) {
        Write-Host "🧹 Nettoyage des fichiers de build..." -ForegroundColor Yellow
        
        $CleanDirs = @(
            "$ProjectRoot/apps/backend/dist",
            "$ProjectRoot/apps/frontend/.next",
            "$ProjectRoot/packages/shared/dist",
            "$ProjectRoot/packages/database/generated"
        )
        
        foreach ($dir in $CleanDirs) {
            if (Test-Path $dir) {
                Remove-Item -Path $dir -Recurse -Force
                Write-Host "  ✅ Supprimé: $dir" -ForegroundColor Green
            }
        }
    }

    Set-Location $ProjectRoot

    # 2. Installation des dépendances
    Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de l'installation des dépendances" }

    # 3. Build du package database
    Write-Host "🗄️ Génération du client Prisma..." -ForegroundColor Yellow
    Set-Location "$ProjectRoot/packages/database"
    pnpm prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de la génération Prisma" }

    # 4. Build du package shared
    Write-Host "📚 Build du package shared..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    pnpm --filter "@gestion/shared" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du package shared" }

    # 5. Build du backend
    Write-Host "⚙️ Build du backend..." -ForegroundColor Yellow
    pnpm --filter "backend" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du backend" }

    # 6. Build du frontend
    Write-Host "🌐 Build du frontend..." -ForegroundColor Yellow
    pnpm --filter "frontend" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du frontend" }

    # 7. Vérification des builds
    Write-Host "🔍 Vérification des builds..." -ForegroundColor Yellow
    
    $RequiredFiles = @(
        "$ProjectRoot/apps/backend/dist/index.js",
        "$ProjectRoot/apps/frontend/.next",
        "$ProjectRoot/packages/database/generated/client"
    )
    
    foreach ($file in $RequiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Fichier de build manquant: $file"
        }
        Write-Host "  ✅ $file" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "🎉 Build de production terminé avec succès!" -ForegroundColor Green
    Write-Host "📁 Fichiers de build disponibles:" -ForegroundColor Cyan
    Write-Host "  • Backend: apps/backend/dist/" -ForegroundColor White
    Write-Host "  • Frontend: apps/frontend/.next/" -ForegroundColor White
    Write-Host "  • Database: packages/database/generated/" -ForegroundColor White
    Write-Host ""
    Write-Host "🐳 Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "  1. docker-compose -f docker-compose.prod.yml --env-file .env.production up --build" -ForegroundColor White
    Write-Host "  2. Ou utilisez: .\scripts\start-production.ps1" -ForegroundColor White

} catch {
    Write-Host ""
    Write-Host "❌ Erreur lors du build: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "📋 Consultez les logs ci-dessus pour plus de détails" -ForegroundColor Yellow
    exit 1
} finally {
    Set-Location $ProjectRoot
}