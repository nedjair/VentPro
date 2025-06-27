#!/usr/bin/env pwsh

Write-Host "Arret et redemarrage du Frontend" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Configuration
$FRONTEND_PORT = 3003
$FRONTEND_DIR = "frontend-nextjs-production"

# Fonction pour arrêter les processus sur un port
function Stop-ProcessOnPort {
    param([int]$Port)
    
    Write-Host "Verification du port $Port..." -ForegroundColor Yellow
    
    try {
        # Utiliser netstat pour trouver les processus
        $netstatOutput = netstat -ano | Select-String ":$Port"
        
        if ($netstatOutput) {
            Write-Host "Processus trouvés sur le port $Port :" -ForegroundColor Yellow
            
            # Extraire les PID des connexions LISTENING
            $pids = @()
            foreach ($line in $netstatOutput) {
                if ($line -match "LISTENING") {
                    $parts = $line -split '\s+'
                    $pid = $parts[-1]
                    if ($pid -and $pid -ne "0") {
                        $pids += $pid
                        Write-Host "  - PID: $pid" -ForegroundColor White
                    }
                }
            }
            
            # Arrêter les processus
            foreach ($pid in ($pids | Sort-Object -Unique)) {
                try {
                    Write-Host "Arret du processus PID $pid..." -ForegroundColor Yellow
                    Stop-Process -Id $pid -Force -ErrorAction Stop
                    Write-Host "  Processus $pid arrete avec succes" -ForegroundColor Green
                } catch {
                    Write-Host "  Impossible d'arreter le processus $pid : $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
            # Attendre un peu
            Start-Sleep -Seconds 3
            
            # Vérifier si le port est maintenant libre
            $checkOutput = netstat -ano | Select-String ":$Port.*LISTENING"
            if ($checkOutput) {
                Write-Host "Attention: Le port $Port est encore utilise" -ForegroundColor Yellow
            } else {
                Write-Host "Port $Port maintenant libre" -ForegroundColor Green
            }
        } else {
            Write-Host "Port $Port libre" -ForegroundColor Green
        }
    } catch {
        Write-Host "Erreur lors de la verification du port $Port : $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Arrêter les processus sur le port 3003
Write-Host "`nArret des processus sur le port $FRONTEND_PORT..." -ForegroundColor Yellow
Stop-ProcessOnPort -Port $FRONTEND_PORT

# Vérifier que le backend est accessible
Write-Host "`nVerification du backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "Backend accessible sur le port 3001" -ForegroundColor Green
    } else {
        Write-Host "Backend repond mais avec le statut: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Backend non accessible sur le port 3001!" -ForegroundColor Red
    Write-Host "Veuillez demarrer le backend avec: node production-backend.js" -ForegroundColor Yellow
}

# Aller dans le répertoire frontend
if (Test-Path $FRONTEND_DIR) {
    Set-Location $FRONTEND_DIR
    Write-Host "Repertoire frontend trouve" -ForegroundColor Green
} else {
    Write-Host "Repertoire frontend non trouve: $FRONTEND_DIR" -ForegroundColor Red
    exit 1
}

# Nettoyer le cache Next.js
Write-Host "`nNettoyage du cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
    Write-Host "Cache Next.js nettoye" -ForegroundColor Green
}

# Démarrer le frontend en mode développement
Write-Host "`nDemarrage du frontend en mode developpement..." -ForegroundColor Green
Write-Host "URL: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host "Mode: Developpement (PWA desactive)" -ForegroundColor Cyan

# Démarrer Next.js
npm run dev
