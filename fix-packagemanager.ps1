# Script pour corriger le packageManager et installer avec yarn
Write-Host "Correction du packageManager pour yarn..." -ForegroundColor Green

# Sauvegarder le package.json original
Copy-Item package.json package.json.backup

# Lire le contenu et remplacer packageManager
$content = Get-Content package.json -Raw
$content = $content -replace '"packageManager": "pnpm@8.15.0"', '"packageManager": "yarn@1.22.22"'
Set-Content package.json $content

Write-Host "packageManager modifie pour yarn" -ForegroundColor Yellow

# Nettoyer
Write-Host "Nettoyage..." -ForegroundColor Blue
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
    
    # Tester la génération Prisma
    Write-Host "Test generation Prisma..." -ForegroundColor Blue
    yarn --cwd packages/database prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prisma genere avec succes !" -ForegroundColor Green
        
        # Essayer de démarrer le backend
        Write-Host "Test demarrage backend..." -ForegroundColor Blue
        Start-Process -FilePath "cmd" -ArgumentList "/c", "cd apps\backend && yarn dev > ..\..\logs\backend-yarn.log 2>&1" -WindowStyle Hidden
        
        Start-Sleep -Seconds 5
        
        # Essayer de démarrer le frontend
        Write-Host "Test demarrage frontend..." -ForegroundColor Blue
        Start-Process -FilePath "cmd" -ArgumentList "/c", "cd apps\frontend && yarn dev > ..\..\logs\frontend-yarn.log 2>&1" -WindowStyle Hidden
        
        Write-Host "Services demarres avec yarn !" -ForegroundColor Green
        Write-Host "Verifiez les logs :" -ForegroundColor Yellow
        Write-Host "  Get-Content logs\backend-yarn.log -Wait" -ForegroundColor Cyan
        Write-Host "  Get-Content logs\frontend-yarn.log -Wait" -ForegroundColor Cyan
        
    } else {
        Write-Host "Echec generation Prisma" -ForegroundColor Red
    }
    
} else {
    Write-Host "Echec installation yarn" -ForegroundColor Red
    
    # Restaurer le package.json original
    Copy-Item package.json.backup package.json
    Write-Host "package.json restaure" -ForegroundColor Yellow
}

Write-Host "Script termine" -ForegroundColor Green
