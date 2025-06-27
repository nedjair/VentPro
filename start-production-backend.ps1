# =============================================================================
# SCRIPT DE DÉMARRAGE - BACKEND DE PRODUCTION
# Gestion Commerciale TPE - production-backend.js
# =============================================================================

Write-Host "DEMARRAGE DU BACKEND DE PRODUCTION" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Backend: production-backend.js (Port 3001)" -ForegroundColor Gray
Write-Host ""

# Vérifier les prérequis
Write-Host "1. VERIFICATION DES PREREQUIS" -ForegroundColor Yellow

# Vérifier Node.js
try {
    $nodeVersion = node --version
    Write-Host "OK Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERREUR Node.js non installe" -ForegroundColor Red
    exit 1
}

# Vérifier les dépendances
if (Test-Path "node_modules") {
    Write-Host "OK Dependencies: Installees" -ForegroundColor Green
} else {
    Write-Host "ATTENTION Dependencies manquantes - Installation..." -ForegroundColor Yellow
    npm install
}

# Vérifier Docker
Write-Host "`n2. VERIFICATION DE L'INFRASTRUCTURE DOCKER" -ForegroundColor Yellow
try {
    $dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($dockerStatus) {
        Write-Host "OK Services Docker: ACTIFS" -ForegroundColor Green
        $dockerStatus | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    } else {
        Write-Host "ATTENTION Services Docker: NON DEMARRES" -ForegroundColor Yellow
        Write-Host "Demarrage des services Docker..." -ForegroundColor Yellow
        docker-compose up -d
        Start-Sleep -Seconds 10
    }
} catch {
    Write-Host "ERREUR Docker non accessible" -ForegroundColor Red
    Write-Host "Veuillez demarrer Docker Desktop" -ForegroundColor Red
    exit 1
}

# Vérifier si le port 3001 est libre
Write-Host "`n3. VERIFICATION DU PORT 3001" -ForegroundColor Yellow
try {
    $portCheck = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "ATTENTION Port 3001: OCCUPE" -ForegroundColor Yellow
        Write-Host "Arret du processus existant..." -ForegroundColor Yellow
        
        # Arrêter les processus Node.js sur le port 3001
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($nodeProcesses) {
            $nodeProcesses | Stop-Process -Force
            Write-Host "OK Processus Node.js arretes" -ForegroundColor Green
        }
        
        Start-Sleep -Seconds 2
    } else {
        Write-Host "OK Port 3001: LIBRE" -ForegroundColor Green
    }
} catch {
    Write-Host "OK Port 3001: LIBRE" -ForegroundColor Green
}

# Démarrer le backend de production
Write-Host "`n4. DEMARRAGE DU BACKEND DE PRODUCTION" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

if (Test-Path "production-backend.js") {
    Write-Host "Demarrage de production-backend.js..." -ForegroundColor White
    
    # Démarrer en arrière-plan
    $process = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden
    
    Write-Host "OK Backend demarre: PID $($process.Id)" -ForegroundColor Green
    Write-Host "   Fichier: production-backend.js" -ForegroundColor Gray
    Write-Host "   Port: 3001" -ForegroundColor Gray
    Write-Host "   PID: $($process.Id)" -ForegroundColor Gray
    
    # Attendre que le serveur soit prêt
    Write-Host "`nAttente du demarrage du serveur..." -ForegroundColor Yellow
    $maxAttempts = 10
    $attempt = 0
    $serverReady = $false
    
    while ($attempt -lt $maxAttempts -and -not $serverReady) {
        Start-Sleep -Seconds 2
        try {
            $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
            if ($healthCheck.StatusCode -eq 200) {
                $serverReady = $true
                Write-Host "OK Serveur: PRET" -ForegroundColor Green
            }
        } catch {
            $attempt++
            Write-Host "   Tentative $attempt/$maxAttempts..." -ForegroundColor Gray
        }
    }
    
    if ($serverReady) {
        Write-Host "`n5. VERIFICATION DES CONNEXIONS" -ForegroundColor Yellow
        Write-Host "==============================" -ForegroundColor Yellow
        
        # Test health check
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
            $healthData = $health.Content | ConvertFrom-Json
            
            Write-Host "OK Health Check: OPERATIONNEL" -ForegroundColor Green
            Write-Host "   Database: $($healthData.database)" -ForegroundColor Gray
            Write-Host "   Redis: $($healthData.redis)" -ForegroundColor Gray
            Write-Host "   Uptime: $([math]::Round($healthData.uptime, 2))s" -ForegroundColor Gray
        } catch {
            Write-Host "ERREUR Health Check: ECHEC" -ForegroundColor Red
        }
        
        # Test métriques
        try {
            $metrics = Invoke-WebRequest -Uri "http://localhost:3001/metrics" -UseBasicParsing
            $metricsData = $metrics.Content | ConvertFrom-Json
            
            Write-Host "OK Metriques: DISPONIBLES" -ForegroundColor Green
            Write-Host "   Clients: $($metricsData.clients)" -ForegroundColor Gray
            Write-Host "   Produits: $($metricsData.products)" -ForegroundColor Gray
            Write-Host "   Utilisateurs: $($metricsData.users)" -ForegroundColor Gray
        } catch {
            Write-Host "ERREUR Metriques: ECHEC" -ForegroundColor Red
        }
        
        Write-Host "`n6. BACKEND DE PRODUCTION OPERATIONNEL" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
        
        Write-Host "URLs disponibles:" -ForegroundColor White
        Write-Host "   Backend: http://localhost:3001" -ForegroundColor Cyan
        Write-Host "   Health Check: http://localhost:3001/health" -ForegroundColor Cyan
        Write-Host "   Metriques: http://localhost:3001/metrics" -ForegroundColor Cyan
        Write-Host "   Login: POST http://localhost:3001/auth/login" -ForegroundColor Cyan
        
        Write-Host "`nIdentifiants admin:" -ForegroundColor White
        Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor Cyan
        Write-Host "   Mot de passe: demo123" -ForegroundColor Cyan
        
        Write-Host "`nPour arreter le backend:" -ForegroundColor White
        Write-Host "   Get-Process -Name 'node' | Stop-Process -Force" -ForegroundColor Gray
        
        Write-Host "`nPour tester les connexions:" -ForegroundColor White
        Write-Host "   .\verification-finale-complete.ps1" -ForegroundColor Gray
        
        Write-Host "`nBACKEND DE PRODUCTION PRET!" -ForegroundColor Green
        
    } else {
        Write-Host "`nERREUR Serveur: ECHEC DU DEMARRAGE" -ForegroundColor Red
        Write-Host "Verifiez les logs et les dependances" -ForegroundColor Red
        
        # Arrêter le processus si échec
        if ($process -and -not $process.HasExited) {
            $process.Kill()
        }
        exit 1
    }
    
} else {
    Write-Host "ERREUR Fichier production-backend.js non trouve" -ForegroundColor Red
    exit 1
}

Write-Host "`nDEMARRAGE TERMINE" -ForegroundColor Cyan
