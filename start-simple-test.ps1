#!/usr/bin/env pwsh

# Script simple pour démarrer les applications pour les tests API

Write-Host "🚀 DÉMARRAGE SIMPLE POUR TESTS API" -ForegroundColor Green
Write-Host "Backend: Port 3001" -ForegroundColor Cyan
Write-Host "Frontend: Port 3000" -ForegroundColor Cyan
Write-Host ""

# Arrêter les processus Node.js existants
Write-Host "Arrêt des processus Node.js existants..." -ForegroundColor Yellow
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js non trouvé!" -ForegroundColor Red
    exit 1
}

# Démarrer le backend
Write-Host "Démarrage du backend..." -ForegroundColor Cyan

# Aller dans le dossier backend
Set-Location "apps/backend"

# Vérifier si les dépendances sont installées
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances backend..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances backend" -ForegroundColor Red
        exit 1
    }
}

# Démarrer le backend avec tsx directement
Write-Host "Lancement du serveur backend avec tsx..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    Set-Location "D:\Gestion Commerciale\apps\backend"
    & npx tsx watch src/index.ts
}

if ($backendJob) {
    Write-Host "✅ Backend démarré (Job ID: $($backendJob.Id))" -ForegroundColor Green
    
    # Attendre que le backend soit prêt
    $attempts = 0
    $maxAttempts = 20
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Backend opérationnel" -ForegroundColor Green
                break
            }
        } catch {
            Write-Host "Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
            if ($attempts -eq $maxAttempts) {
                Write-Host "❌ Backend non accessible après $maxAttempts tentatives" -ForegroundColor Red
                Stop-Job $backendJob -ErrorAction SilentlyContinue
                Remove-Job $backendJob -ErrorAction SilentlyContinue
                exit 1
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Host "❌ Échec du démarrage du backend" -ForegroundColor Red
    exit 1
}

# Retour au répertoire racine
Set-Location "../.."

# Démarrer le frontend
Write-Host "Démarrage du frontend..." -ForegroundColor Cyan

# Aller dans le dossier frontend
Set-Location "apps/frontend"

# Vérifier si les dépendances sont installées
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dépendances frontend..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Échec de l'installation des dépendances frontend" -ForegroundColor Red
        exit 1
    }
}

# Créer/mettre à jour le fichier .env.local
$envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NODE_ENV=development
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✅ Configuration frontend mise à jour" -ForegroundColor Green

# Démarrer le frontend avec Next.js
Write-Host "Lancement du serveur frontend avec Next.js..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "D:\Gestion Commerciale\apps\frontend"
    & npx next dev
}

if ($frontendJob) {
    Write-Host "✅ Frontend démarré (Job ID: $($frontendJob.Id))" -ForegroundColor Green
    
    # Attendre que le frontend soit prêt
    $attempts = 0
    $maxAttempts = 30
    do {
        Start-Sleep -Seconds 3
        $attempts++
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Frontend opérationnel" -ForegroundColor Green
                break
            }
        } catch {
            Write-Host "Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
            if ($attempts -eq $maxAttempts) {
                Write-Host "⚠️ Frontend non accessible après $maxAttempts tentatives" -ForegroundColor Yellow
                break
            }
        }
    } while ($attempts -lt $maxAttempts)
} else {
    Write-Host "❌ Échec du démarrage du frontend" -ForegroundColor Red
}

# Retour au répertoire racine
Set-Location "../.."

# Affichage final
Write-Host ""
Write-Host "🎉 APPLICATIONS DÉMARRÉES" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green

Write-Host ""
Write-Host "🌐 URLs d'accès:" -ForegroundColor Yellow
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host ""
Write-Host "🔐 Identifiants de test:" -ForegroundColor Yellow
Write-Host "  Email: admin@gctpe.dz" -ForegroundColor Cyan
Write-Host "  Mot de passe: admin123" -ForegroundColor Cyan

Write-Host ""
Write-Host "📊 Jobs PowerShell:" -ForegroundColor Yellow
Write-Host "  Backend Job ID: $($backendJob.Id)" -ForegroundColor Cyan
if ($frontendJob) {
    Write-Host "  Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "⚠️ Pour arrêter:" -ForegroundColor Yellow
Write-Host "  Get-Job | Stop-Job; Get-Job | Remove-Job" -ForegroundColor Cyan

Write-Host ""
Write-Host "✅ Prêt pour les tests API!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant exécuter: node test-api-connections-complete.js" -ForegroundColor Cyan

# Garder le script actif
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter les applications..." -ForegroundColor Yellow
try {
    while ($true) {
        Start-Sleep -Seconds 5
        # Vérifier si les jobs sont toujours actifs
        $backendStatus = Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        $frontendStatus = if ($frontendJob) { Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue } else { $null }
        
        if ($backendStatus.State -eq "Failed") {
            Write-Host "❌ Backend job a échoué" -ForegroundColor Red
            break
        }
        if ($frontendStatus -and $frontendStatus.State -eq "Failed") {
            Write-Host "❌ Frontend job a échoué" -ForegroundColor Red
            break
        }
    }
} catch {
    Write-Host ""
    Write-Host "🛑 Arrêt des applications..." -ForegroundColor Yellow
    Get-Job | Stop-Job -ErrorAction SilentlyContinue
    Get-Job | Remove-Job -ErrorAction SilentlyContinue
    Write-Host "Applications arrêtées." -ForegroundColor Green
}
