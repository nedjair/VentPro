# Script d'installation des dependances par package
Write-Host "Installation des dependances par package..." -ForegroundColor Green

# Nettoyer d'abord
Write-Host "Nettoyage des node_modules existants..." -ForegroundColor Blue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\*\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\*\node_modules -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue

# Installer dans chaque package individuellement
Write-Host "Installation dans packages/database..." -ForegroundColor Blue
Set-Location packages\database
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec installation database" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..

Write-Host "Installation dans apps/backend..." -ForegroundColor Blue
Set-Location apps\backend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec installation backend" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..

Write-Host "Installation dans apps/frontend..." -ForegroundColor Blue
Set-Location apps\frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec installation frontend" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}
Set-Location ..\..

Write-Host "Installation terminee avec succes !" -ForegroundColor Green
