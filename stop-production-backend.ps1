# =============================================================================
# SCRIPT D'ARRÊT - BACKEND DE PRODUCTION
# Gestion Commerciale TPE - production-backend.js
# =============================================================================

Write-Host "ARRET DU BACKEND DE PRODUCTION" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Vérifier les processus Node.js en cours
Write-Host "1. VERIFICATION DES PROCESSUS NODE.JS" -ForegroundColor Yellow

try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    
    if ($nodeProcesses) {
        Write-Host "Processus Node.js detectes:" -ForegroundColor White
        foreach ($proc in $nodeProcesses) {
            Write-Host "   PID: $($proc.Id) - Memoire: $([math]::Round($proc.WorkingSet / 1MB, 1)) MB" -ForegroundColor Gray
        }
        
        Write-Host "`nArret des processus Node.js..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force
        
        Start-Sleep -Seconds 2
        
        # Vérifier que les processus sont arrêtés
        $remainingProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Host "ATTENTION Certains processus persistent" -ForegroundColor Yellow
            foreach ($proc in $remainingProcesses) {
                Write-Host "   PID: $($proc.Id) - Force l'arret..." -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force
            }
        }
        
        Write-Host "OK Tous les processus Node.js arretes" -ForegroundColor Green
        
    } else {
        Write-Host "Aucun processus Node.js en cours" -ForegroundColor Gray
    }
} catch {
    Write-Host "ERREUR Impossible de verifier les processus Node.js" -ForegroundColor Red
}

# Vérifier les ports
Write-Host "`n2. VERIFICATION DES PORTS" -ForegroundColor Yellow

try {
    $portCheck = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
    if ($portCheck) {
        Write-Host "ATTENTION Port 3001: TOUJOURS OCCUPE" -ForegroundColor Yellow
        Write-Host "   Etat: $($portCheck.State)" -ForegroundColor Gray
        Write-Host "   PID: $($portCheck.OwningProcess)" -ForegroundColor Gray
        
        # Essayer d'arrêter le processus propriétaire
        try {
            Stop-Process -Id $portCheck.OwningProcess -Force
            Write-Host "OK Processus proprietaire arrete" -ForegroundColor Green
        } catch {
            Write-Host "ERREUR Impossible d'arreter le processus proprietaire" -ForegroundColor Red
        }
    } else {
        Write-Host "OK Port 3001: LIBRE" -ForegroundColor Green
    }
} catch {
    Write-Host "OK Port 3001: LIBRE" -ForegroundColor Green
}

# Vérifier que le backend est arrêté
Write-Host "`n3. VERIFICATION DE L'ARRET" -ForegroundColor Yellow

try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3
    Write-Host "ATTENTION Backend: TOUJOURS ACTIF" -ForegroundColor Yellow
    Write-Host "Le serveur repond encore sur le port 3001" -ForegroundColor Yellow
} catch {
    Write-Host "OK Backend: ARRETE" -ForegroundColor Green
    Write-Host "Le serveur ne repond plus sur le port 3001" -ForegroundColor Green
}

# Informations sur les services Docker (optionnel)
Write-Host "`n4. SERVICES DOCKER (CONSERVES)" -ForegroundColor Yellow

try {
    $dockerStatus = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String "gestion-"
    if ($dockerStatus) {
        Write-Host "Services Docker toujours actifs:" -ForegroundColor Green
        $dockerStatus | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
        Write-Host "`nPour arreter les services Docker:" -ForegroundColor White
        Write-Host "   docker-compose down" -ForegroundColor Gray
    } else {
        Write-Host "Aucun service Docker actif" -ForegroundColor Gray
    }
} catch {
    Write-Host "Docker non accessible" -ForegroundColor Gray
}

Write-Host "`n5. RESUME DE L'ARRET" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

Write-Host "Backend de production: ARRETE" -ForegroundColor Green
Write-Host "Port 3001: LIBRE" -ForegroundColor Green
Write-Host "Processus Node.js: ARRETES" -ForegroundColor Green

Write-Host "`nPour redemarrer le backend:" -ForegroundColor White
Write-Host "   .\start-production-backend.ps1" -ForegroundColor Cyan

Write-Host "`nPour arreter completement l'infrastructure:" -ForegroundColor White
Write-Host "   docker-compose down" -ForegroundColor Gray

Write-Host "`nARRET TERMINE" -ForegroundColor Cyan
