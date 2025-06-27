# Script de demarrage basique - Gestion Commerciale TPE
Write-Host "Demarrage de l'application Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "============================================================"

# 1. Demarrer PostgreSQL
Write-Host "1. Demarrage de PostgreSQL..." -ForegroundColor Cyan
docker-compose up -d postgres
Start-Sleep -Seconds 15
Write-Host "PostgreSQL demarre" -ForegroundColor Green

# 2. Tester la base de donnees
Write-Host "2. Test de la base de donnees..." -ForegroundColor Cyan
node test-db-connection.js
Write-Host "Base de donnees testee" -ForegroundColor Green

# 3. Demarrer le backend
Write-Host "3. Demarrage du backend..." -ForegroundColor Cyan

# Creer le dossier logs
if (-not (Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" | Out-Null
}

# Demarrer le backend simple
Write-Host "Lancement du serveur backend..." -ForegroundColor Yellow
$backendProcess = Start-Process -FilePath "node" -ArgumentList "test-backend-simple-with-routes.js" -PassThru -WindowStyle Hidden

if ($backendProcess) {
    Write-Host "Backend demarre (PID: $($backendProcess.Id))" -ForegroundColor Green
    $backendProcess.Id | Out-File -FilePath "backend.pid"
    
    # Attendre que le backend soit pret
    Write-Host "Attente du backend..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Backend operationnel" -ForegroundColor Green
        }
    } catch {
        Write-Host "Backend en cours d'initialisation..." -ForegroundColor Yellow
    }
}

# 4. Demarrer le frontend
Write-Host "4. Demarrage du frontend..." -ForegroundColor Cyan

Set-Location "apps/frontend"

# Verifier les dependances
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dependances frontend..." -ForegroundColor Yellow
    npm install
}

# Demarrer le frontend
Write-Host "Lancement du serveur frontend..." -ForegroundColor Yellow
$frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden

Set-Location "../.."

if ($frontendProcess) {
    Write-Host "Frontend demarre (PID: $($frontendProcess.Id))" -ForegroundColor Green
    $frontendProcess.Id | Out-File -FilePath "frontend.pid"
    
    # Attendre que le frontend soit pret
    Write-Host "Attente du frontend..." -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Host "Frontend operationnel" -ForegroundColor Green
        }
    } catch {
        Write-Host "Frontend en cours d'initialisation..." -ForegroundColor Yellow
    }
}

# 5. Afficher les informations
Write-Host ""
Write-Host "APPLICATION DEMARREE!" -ForegroundColor Green
Write-Host "============================================================"
Write-Host ""
Write-Host "URLs d'acces:" -ForegroundColor Cyan
Write-Host "  Frontend:     http://localhost:3000" -ForegroundColor White
Write-Host "  Backend API:  http://localhost:3001" -ForegroundColor White
Write-Host "  API Health:   http://localhost:3001/health" -ForegroundColor White
Write-Host "  PostgreSQL:   localhost:5432" -ForegroundColor White
Write-Host ""
Write-Host "Compte de test:" -ForegroundColor Cyan
Write-Host "  Email:    admin@test.com" -ForegroundColor White
Write-Host "  Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "Processus actifs:" -ForegroundColor Cyan
if (Test-Path "backend.pid") {
    $backendPid = Get-Content "backend.pid"
    Write-Host "  Backend PID:  $backendPid" -ForegroundColor White
}
if (Test-Path "frontend.pid") {
    $frontendPid = Get-Content "frontend.pid"
    Write-Host "  Frontend PID: $frontendPid" -ForegroundColor White
}
Write-Host ""
Write-Host "Pour arreter: Utilisez stop-app-simple.ps1" -ForegroundColor Yellow
Write-Host ""

# Ouvrir le navigateur
Write-Host "Ouverture du navigateur..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host "Demarrage termine!" -ForegroundColor Green
