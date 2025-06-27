# Script pour essayer yarn comme alternative
Write-Host "Tentative d'installation avec Yarn..." -ForegroundColor Green

# Vérifier si yarn est installé
try {
    $yarnVersion = yarn --version
    Write-Host "Yarn trouve : v$yarnVersion" -ForegroundColor Green
}
catch {
    Write-Host "Yarn non trouve, installation..." -ForegroundColor Blue
    npm install -g yarn
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Echec installation yarn" -ForegroundColor Red
        exit 1
    }
}

# Nettoyer complètement
Write-Host "Nettoyage complet..." -ForegroundColor Blue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\*\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\*\node_modules -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue

# Essayer yarn install
Write-Host "Installation avec yarn..." -ForegroundColor Blue
yarn install

if ($LASTEXITCODE -eq 0) {
    Write-Host "Installation yarn reussie !" -ForegroundColor Green
    
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
    
    Write-Host "Essayez maintenant de demarrer avec yarn :" -ForegroundColor Yellow
    Write-Host "  yarn --cwd apps/backend dev" -ForegroundColor Cyan
    Write-Host "  yarn --cwd apps/frontend dev" -ForegroundColor Cyan
    
} else {
    Write-Host "Echec installation yarn" -ForegroundColor Red
    Write-Host "Utilisez le serveur de test : node simple-server.js" -ForegroundColor Yellow
}
