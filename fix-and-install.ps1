# Script de correction et installation des dependances
Write-Host "Correction des references workspace et installation..." -ForegroundColor Green

# Fonction pour remplacer workspace:* par file:
function Fix-WorkspaceReferences($packagePath) {
    if (Test-Path $packagePath) {
        $content = Get-Content $packagePath -Raw
        $content = $content -replace '"workspace:\*"', '"file:../../packages/shared"'
        $content = $content -replace '"@gestion/shared": "workspace:\*"', '"@gestion/shared": "file:../../packages/shared"'
        $content = $content -replace '"@gestion/database": "workspace:\*"', '"@gestion/database": "file:../../packages/database"'
        Set-Content $packagePath $content
        Write-Host "Corrige: $packagePath" -ForegroundColor Yellow
    }
}

# Nettoyer d'abord
Write-Host "Nettoyage..." -ForegroundColor Blue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\*\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\*\node_modules -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue

# Corriger les references workspace
Write-Host "Correction des references workspace..." -ForegroundColor Blue
Fix-WorkspaceReferences "apps\backend\package.json"
Fix-WorkspaceReferences "apps\frontend\package.json"

# Installer les dependances de base d'abord
Write-Host "Installation packages/shared..." -ForegroundColor Blue
Set-Location packages\shared
npm install --no-package-lock
Set-Location ..\..

Write-Host "Installation packages/database..." -ForegroundColor Blue
Set-Location packages\database
npm install --no-package-lock
Set-Location ..\..

# Maintenant installer backend et frontend
Write-Host "Installation apps/backend..." -ForegroundColor Blue
Set-Location apps\backend
npm install --no-package-lock
Set-Location ..\..

Write-Host "Installation apps/frontend..." -ForegroundColor Blue
Set-Location apps\frontend
npm install --no-package-lock
Set-Location ..\..

Write-Host "Installation terminee !" -ForegroundColor Green

# Tester les commandes
Write-Host "Test des commandes..." -ForegroundColor Blue
Set-Location apps\backend
if (Test-Path "node_modules\.bin\tsx.cmd") {
    Write-Host "tsx trouve dans backend" -ForegroundColor Green
} else {
    Write-Host "tsx manquant dans backend" -ForegroundColor Red
}
Set-Location ..\..

Set-Location apps\frontend
if (Test-Path "node_modules\.bin\next.cmd") {
    Write-Host "next trouve dans frontend" -ForegroundColor Green
} else {
    Write-Host "next manquant dans frontend" -ForegroundColor Red
}
Set-Location ..\..

Write-Host "Verification terminee !" -ForegroundColor Green
