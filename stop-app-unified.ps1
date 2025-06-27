# =============================================================================
# SCRIPT D'ARRÊT UNIFIÉ - GESTION COMMERCIALE TPE
# Version: 2.0 - Analytics Phase 5
# Arrêt propre de tous les services
# =============================================================================

param(
    [switch]$KeepDocker,
    [switch]$Force,
    [switch]$Verbose
)

# Configuration
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3003
$BACKEND_PID_FILE = ".backend.pid"

# Couleurs pour l'affichage
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    switch ($Type) {
        "SUCCESS" { Write-Host "✅ $Message" -ForegroundColor Green }
        "ERROR" { Write-Host "❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "⚠️  $Message" -ForegroundColor Yellow }
        "INFO" { Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
        "LOADING" { Write-Host "⏳ $Message" -ForegroundColor Yellow }
        "STEP" { Write-Host "🔄 $Message" -ForegroundColor Magenta }
        default { Write-Host "$Message" -ForegroundColor White }
    }
}

# Fonction de vérification de port
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Fonction pour arrêter un processus par port
function Stop-ProcessByPort {
    param([int]$Port, [string]$ServiceName)
    
    if (Test-Port $Port) {
        Write-ColorMessage "Arrêt du service $ServiceName (port $Port)..." "LOADING"
        
        try {
            # Trouver le processus utilisant le port
            $processId = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
            if ($processId) {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    if ($Verbose) {
                        Write-Host "   Processus trouvé: $($process.ProcessName) (PID: $processId)" -ForegroundColor Gray
                    }
                    
                    if ($Force) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 3
                        if (-not $process.HasExited) {
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        }
                    }
                    
                    Write-ColorMessage "$ServiceName arrêté" "SUCCESS"
                    return $true
                }
            }
        } catch {
            Write-ColorMessage "Erreur lors de l'arrêt de $ServiceName" "WARNING"
            if ($Verbose) {
                Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
            }
        }
    } else {
        Write-ColorMessage "$ServiceName n'était pas en cours d'exécution" "INFO"
        return $true
    }
    
    return $false
}

# En-tête
Clear-Host
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║              GESTION COMMERCIALE TPE - ARRÊT UNIFIÉ              ║" -ForegroundColor Red
Write-Host "║                     Analytics Phase 5 - v2.0                    ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

if ($Force) {
    Write-ColorMessage "Mode FORCE activé - Arrêt immédiat" "WARNING"
} else {
    Write-ColorMessage "Arrêt propre des services..." "INFO"
}

Write-Host ""

# Étape 1: Arrêt du Frontend
Write-Host "═══ ÉTAPE 1: ARRÊT DU FRONTEND ═══" -ForegroundColor Yellow
Write-Host ""

$frontendStopped = Stop-ProcessByPort $FRONTEND_PORT "Frontend Next.js"

# Arrêter tous les processus Next.js
Write-ColorMessage "Arrêt des processus Next.js..." "LOADING"
$nextProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*next*" -or $_.CommandLine -like "*frontend*" 
}

if ($nextProcesses) {
    foreach ($process in $nextProcesses) {
        try {
            if ($Verbose) {
                Write-Host "   Arrêt du processus Next.js: PID $($process.Id)" -ForegroundColor Gray
            }
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignorer les erreurs
        }
    }
    Write-ColorMessage "Processus Next.js arrêtés" "SUCCESS"
} else {
    Write-ColorMessage "Aucun processus Next.js trouvé" "INFO"
}

Write-Host ""

# Étape 2: Arrêt du Backend
Write-Host "═══ ÉTAPE 2: ARRÊT DU BACKEND ═══" -ForegroundColor Yellow
Write-Host ""

# Arrêter le backend via le fichier PID
if (Test-Path $BACKEND_PID_FILE) {
    try {
        $backendPid = Get-Content $BACKEND_PID_FILE -ErrorAction SilentlyContinue
        if ($backendPid) {
            Write-ColorMessage "Arrêt du backend via PID: $backendPid" "LOADING"
            $backendProcess = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
            if ($backendProcess) {
                if ($Force) {
                    Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
                } else {
                    $backendProcess.CloseMainWindow()
                    Start-Sleep -Seconds 3
                    if (-not $backendProcess.HasExited) {
                        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
                    }
                }
                Write-ColorMessage "Backend arrêté (PID: $backendPid)" "SUCCESS"
            } else {
                Write-ColorMessage "Processus backend non trouvé (PID: $backendPid)" "WARNING"
            }
        }
        Remove-Item $BACKEND_PID_FILE -Force -ErrorAction SilentlyContinue
    } catch {
        Write-ColorMessage "Erreur lors de l'arrêt via PID" "WARNING"
    }
}

# Arrêter le backend par port
$backendStopped = Stop-ProcessByPort $BACKEND_PORT "Backend API"

# Arrêter tous les processus backend restants
Write-ColorMessage "Arrêt des processus backend restants..." "LOADING"
$backendProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { 
    $_.CommandLine -like "*production-backend*" -or $_.CommandLine -like "*backend*" 
}

if ($backendProcesses) {
    foreach ($process in $backendProcesses) {
        try {
            if ($Verbose) {
                Write-Host "   Arrêt du processus backend: PID $($process.Id)" -ForegroundColor Gray
            }
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        } catch {
            # Ignorer les erreurs
        }
    }
    Write-ColorMessage "Processus backend arrêtés" "SUCCESS"
} else {
    Write-ColorMessage "Aucun processus backend trouvé" "INFO"
}

Write-Host ""

# Étape 3: Nettoyage des processus Node.js
Write-Host "═══ ÉTAPE 3: NETTOYAGE GÉNÉRAL ═══" -ForegroundColor Yellow
Write-Host ""

if ($Force) {
    Write-ColorMessage "Arrêt forcé de tous les processus Node.js..." "LOADING"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-ColorMessage "Tous les processus Node.js arrêtés" "SUCCESS"
} else {
    $remainingNodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($remainingNodeProcesses) {
        Write-ColorMessage "Processus Node.js restants détectés" "WARNING"
        if ($Verbose) {
            foreach ($process in $remainingNodeProcesses) {
                Write-Host "   PID: $($process.Id) - $($process.ProcessName)" -ForegroundColor Gray
            }
        }
        Write-Host "Utilisez -Force pour arrêter tous les processus Node.js" -ForegroundColor Gray
    } else {
        Write-ColorMessage "Aucun processus Node.js restant" "SUCCESS"
    }
}

# Nettoyage des fichiers temporaires
Write-ColorMessage "Nettoyage des fichiers temporaires..." "LOADING"
$tempFiles = @(".backend.pid", ".frontend.pid")
foreach ($file in $tempFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Force -ErrorAction SilentlyContinue
        if ($Verbose) {
            Write-Host "   Supprimé: $file" -ForegroundColor Gray
        }
    }
}
Write-ColorMessage "Fichiers temporaires nettoyés" "SUCCESS"

Write-Host ""

# Étape 4: Arrêt des services Docker (optionnel)
if (-not $KeepDocker) {
    Write-Host "═══ ÉTAPE 4: ARRÊT DES SERVICES DOCKER ═══" -ForegroundColor Yellow
    Write-Host ""
    
    Write-ColorMessage "Arrêt des services Docker..." "LOADING"
    try {
        docker-compose down
        if ($LASTEXITCODE -eq 0) {
            Write-ColorMessage "Services Docker arrêtés" "SUCCESS"
        } else {
            Write-ColorMessage "Erreur lors de l'arrêt des services Docker" "WARNING"
        }
    } catch {
        Write-ColorMessage "Docker non accessible" "WARNING"
    }
} else {
    Write-Host "═══ SERVICES DOCKER CONSERVÉS ═══" -ForegroundColor Yellow
    Write-Host ""
    Write-ColorMessage "Services Docker conservés (option -KeepDocker)" "INFO"
    Write-Host "Pour arrêter Docker manuellement: docker-compose down" -ForegroundColor Gray
}

Write-Host ""

# Étape 5: Vérification finale
Write-Host "═══ ÉTAPE 5: VÉRIFICATION FINALE ═══" -ForegroundColor Yellow
Write-Host ""

$frontendStillRunning = Test-Port $FRONTEND_PORT
$backendStillRunning = Test-Port $BACKEND_PORT

if (-not $frontendStillRunning -and -not $backendStillRunning) {
    Write-ColorMessage "Tous les services ont été arrêtés avec succès" "SUCCESS"
} else {
    if ($frontendStillRunning) {
        Write-ColorMessage "Frontend encore actif sur le port $FRONTEND_PORT" "WARNING"
    }
    if ($backendStillRunning) {
        Write-ColorMessage "Backend encore actif sur le port $BACKEND_PORT" "WARNING"
    }
    Write-Host "Utilisez -Force pour un arrêt forcé" -ForegroundColor Gray
}

Write-Host ""

# Résumé final
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                        ARRÊT TERMINÉ                             ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📊 RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "   Frontend (port $FRONTEND_PORT): $(if (-not $frontendStillRunning) { "ARRÊTÉ" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $frontendStillRunning) { "Green" } else { "Red" })
Write-Host "   Backend (port $BACKEND_PORT): $(if (-not $backendStillRunning) { "ARRÊTÉ" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $backendStillRunning) { "Green" } else { "Red" })
Write-Host "   Services Docker: $(if (-not $KeepDocker) { "ARRÊTÉS" } else { "CONSERVÉS" })" -ForegroundColor $(if (-not $KeepDocker) { "Green" } else { "Yellow" })
Write-Host ""

Write-Host "🔄 POUR REDÉMARRER:" -ForegroundColor Cyan
Write-Host "   .\start-app-unified.ps1" -ForegroundColor White
Write-Host ""

Write-Host "🛠️  OPTIONS D'ARRÊT:" -ForegroundColor Cyan
Write-Host "   -Force          : Arrêt forcé de tous les processus" -ForegroundColor Gray
Write-Host "   -KeepDocker     : Conserver les services Docker" -ForegroundColor Gray
Write-Host "   -Verbose        : Affichage détaillé" -ForegroundColor Gray
Write-Host ""
