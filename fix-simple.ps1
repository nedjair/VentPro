# Script de reparation simple - A executer en tant qu'administrateur
Write-Host "=== REPARATION APPLICATION ===" -ForegroundColor Green

# Verifier les privileges administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "ERREUR: Privileges administrateur requis" -ForegroundColor Red
    Write-Host "Clic droit sur PowerShell -> Executer en tant qu'administrateur" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

Write-Host "Privileges administrateur OK" -ForegroundColor Green

# Aller dans le dossier du projet
Set-Location "D:\Gestion Commerciale"

# 1. Arreter tous les processus Node.js
Write-Host "1. Arret des processus Node.js..." -ForegroundColor Blue
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-Host "Processus Node.js arretes" -ForegroundColor Green

# 2. Nettoyer les caches
Write-Host "2. Nettoyage des caches..." -ForegroundColor Blue
Remove-Item -Recurse -Force apps\frontend\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\frontend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Write-Host "Caches nettoyes" -ForegroundColor Green

# 3. Creer un package.json minimal pour le frontend
Write-Host "3. Creation package.json minimal..." -ForegroundColor Blue
Set-Location apps\frontend

$packageJson = @"
{
  "name": "frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.4.5"
  }
}
"@

Set-Content -Path "package.json" -Value $packageJson
Write-Host "Package.json minimal cree" -ForegroundColor Green

# 4. Installer les dependances
Write-Host "4. Installation des dependances..." -ForegroundColor Blue
npm install
Write-Host "Dependances installees" -ForegroundColor Green

# Retourner a la racine
Set-Location ..\..

# 5. Demarrer le backend
Write-Host "5. Demarrage du backend..." -ForegroundColor Blue
Start-Process -FilePath "node" -ArgumentList "minimal-backend-3003.js" -WindowStyle Hidden
Start-Sleep -Seconds 3
Write-Host "Backend demarre" -ForegroundColor Green

# 6. Demarrer le frontend
Write-Host "6. Demarrage du frontend..." -ForegroundColor Blue
Set-Location apps\frontend
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
Set-Location ..\..
Start-Sleep -Seconds 5
Write-Host "Frontend demarre" -ForegroundColor Green

Write-Host ""
Write-Host "=== REPARATION TERMINEE ===" -ForegroundColor Green
Write-Host ""
Write-Host "URLs d'acces :" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend  : http://localhost:3003" -ForegroundColor White
Write-Host ""

# Ouvrir le navigateur
Start-Process "http://localhost:3000"

Write-Host "Application reparee et demarree !" -ForegroundColor Green
Read-Host "Appuyez sur Entree pour fermer"
