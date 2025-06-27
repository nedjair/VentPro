# Script de build pour la production (sans accents)
param(
    [switch]$Clean = $false
)

Write-Host "Build de production - Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=" * 50

$ErrorActionPreference = "Stop"
$ProjectRoot = "d:/Gestion Commerciale"

try {
    # Nettoyage si demande
    if ($Clean) {
        Write-Host "Nettoyage des fichiers de build..." -ForegroundColor Yellow
        
        $CleanDirs = @(
            "$ProjectRoot/apps/backend/dist",
            "$ProjectRoot/apps/frontend/.next",
            "$ProjectRoot/packages/shared/dist",
            "$ProjectRoot/packages/database/generated"
        )
        
        foreach ($dir in $CleanDirs) {
            if (Test-Path $dir) {
                Remove-Item -Path $dir -Recurse -Force
                Write-Host "  Supprime: $dir" -ForegroundColor Green
            }
        }
    }

    Set-Location $ProjectRoot

    # Installation des dependances
    Write-Host "Installation des dependances..." -ForegroundColor Yellow
    pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de l installation des dependances" }

    # Build du package database
    Write-Host "Generation du client Prisma..." -ForegroundColor Yellow
    Set-Location "$ProjectRoot/packages/database"
    pnpm prisma generate
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors de la generation Prisma" }

    # Build du package shared
    Write-Host "Build du package shared..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    pnpm --filter "@gestion/shared" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du package shared" }

    # Build du backend
    Write-Host "Build du backend..." -ForegroundColor Yellow
    pnpm --filter "backend" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du backend" }

    # Build du frontend
    Write-Host "Build du frontend..." -ForegroundColor Yellow
    pnpm --filter "frontend" build
    if ($LASTEXITCODE -ne 0) { throw "Erreur lors du build du frontend" }

    # Verification des builds
    Write-Host "Verification des builds..." -ForegroundColor Yellow
    
    $RequiredFiles = @(
        "$ProjectRoot/apps/backend/dist/index.js",
        "$ProjectRoot/apps/frontend/.next",
        "$ProjectRoot/packages/database/generated/client"
    )
    
    foreach ($file in $RequiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Fichier de build manquant: $file"
        }
        Write-Host "  OK: $file" -ForegroundColor Green
    }

    Write-Host ""
    Write-Host "Build de production termine avec succes!" -ForegroundColor Green

} catch {
    Write-Host ""
    Write-Host "Erreur lors du build: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $ProjectRoot
}