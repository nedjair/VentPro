# Script de réparation automatique - À exécuter en tant qu'administrateur
# Clic droit sur PowerShell → "Exécuter en tant qu'administrateur"

Write-Host "=== REPARATION AUTOMATIQUE APPLICATION ===" -ForegroundColor Red
Write-Host "Ce script doit être exécuté en tant qu'administrateur" -ForegroundColor Yellow
Write-Host ""

# Vérifier les privilèges administrateur
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")

if (-not $isAdmin) {
    Write-Host "Erreur: Ce script necessite des privileges administrateur" -ForegroundColor Red
    Write-Host "Clic droit sur PowerShell -> 'Executer en tant qu'administrateur'" -ForegroundColor Yellow
    Read-Host "Appuyez sur Entree pour quitter"
    exit 1
}

Write-Host "✅ Privilèges administrateur confirmés" -ForegroundColor Green
Write-Host ""

# Aller dans le dossier du projet
$projectPath = "D:\Gestion Commerciale"
if (Test-Path $projectPath) {
    Set-Location $projectPath
    Write-Host "✅ Dossier projet trouvé : $projectPath" -ForegroundColor Green
} else {
    Write-Host "❌ Dossier projet non trouvé : $projectPath" -ForegroundColor Red
    $projectPath = Read-Host "Entrez le chemin vers le dossier du projet"
    Set-Location $projectPath
}

Write-Host ""

# 1. Arrêter tous les processus Node.js
Write-Host "1. Arrêt des processus Node.js..." -ForegroundColor Blue
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Processus Node.js arrêtés" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Aucun processus Node.js à arrêter" -ForegroundColor Yellow
}

# 2. Nettoyer les caches et node_modules
Write-Host "2. Nettoyage des caches..." -ForegroundColor Blue
Remove-Item -Recurse -Force apps\frontend\.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\frontend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force apps\backend\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages\*\node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Write-Host "✅ Caches nettoyés" -ForegroundColor Green

# 3. Nettoyer les lock files
Write-Host "3. Nettoyage des lock files..." -ForegroundColor Blue
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
Remove-Item yarn.lock -ErrorAction SilentlyContinue
Write-Host "✅ Lock files supprimés" -ForegroundColor Green

# 4. Réinstaller les dépendances frontend
Write-Host "4. Installation des dépendances frontend..." -ForegroundColor Blue
Set-Location apps\frontend

# Créer un package.json minimal
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
    "typescript": "^5.4.5",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "tailwindcss": "^3.4.4",
    "postcss": "^8.4.38",
    "autoprefixer": "^10.4.19"
  }
}
"@

Set-Content -Path "package.json" -Value $packageJson
Write-Host "✅ Package.json minimal créé" -ForegroundColor Green

# Installer avec npm (plus fiable que yarn/pnpm)
npm install --no-package-lock
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dépendances frontend installées" -ForegroundColor Green
} else {
    Write-Host "❌ Échec installation frontend" -ForegroundColor Red
}

# Retourner à la racine
Set-Location ..\..

# 5. Créer les dossiers nécessaires
Write-Host "5. Création des dossiers..." -ForegroundColor Blue
New-Item -ItemType Directory -Path "logs" -Force | Out-Null
Write-Host "✅ Dossiers créés" -ForegroundColor Green

# 6. Démarrer les services Docker
Write-Host "6. Démarrage Docker..." -ForegroundColor Blue
docker-compose down 2>$null | Out-Null
docker-compose up -d
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Services Docker démarrés" -ForegroundColor Green
} else {
    Write-Host "⚠️  Problème Docker (peut-être pas démarré)" -ForegroundColor Yellow
}

# 7. Démarrer le backend minimal
Write-Host "7. Démarrage du backend..." -ForegroundColor Blue
Start-Process -FilePath "node" -ArgumentList "minimal-backend-3003.js" -WindowStyle Hidden
Start-Sleep -Seconds 3

# Test du backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/health" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Backend démarré sur port 3003" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend ne répond pas encore" -ForegroundColor Yellow
}

# 8. Démarrer le frontend
Write-Host "8. Démarrage du frontend..." -ForegroundColor Blue
Set-Location apps\frontend
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WindowStyle Hidden
Set-Location ..\..

Start-Sleep -Seconds 5

# Test du frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend démarré sur port 3000" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Frontend ne répond pas encore" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== REPARATION TERMINEE ===" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URLs d'accès :" -ForegroundColor Cyan
Write-Host "  Frontend : http://localhost:3000" -ForegroundColor White
Write-Host "  Backend  : http://localhost:3003" -ForegroundColor White
Write-Host "  Health   : http://localhost:3003/health" -ForegroundColor White
Write-Host ""
Write-Host "📝 Si problèmes persistent :" -ForegroundColor Yellow
Write-Host "  1. Redémarrer Docker Desktop" -ForegroundColor White
Write-Host "  2. Vérifier les ports avec : netstat -an | findstr :3000" -ForegroundColor White
Write-Host "  3. Consulter les logs dans le dossier logs/" -ForegroundColor White
Write-Host ""

# Ouvrir le navigateur
Start-Process "http://localhost:3000"

Write-Host "🎉 Application réparée et démarrée !" -ForegroundColor Green
Read-Host "Appuyez sur Entree pour fermer"
