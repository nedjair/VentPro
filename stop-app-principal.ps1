# =============================================================================
# 🛑 SCRIPT D'ARRÊT PRINCIPAL - GESTION COMMERCIALE TPE
# Version: 3.0 - Production Complete
# 
# DESCRIPTION:
# Ce script arrête proprement TOUS les composants de l'application :
# - Frontend Next.js (port 3003)
# - Backend Fastify (port 3001)
# - Services Docker (PostgreSQL + Redis + Adminer + Redis Commander)
# - Nettoyage des processus et fichiers temporaires
# 
# USAGE:
# .\stop-app-principal.ps1                     # Arrêt complet
# .\stop-app-principal.ps1 -KeepDocker         # Conserver Docker
# .\stop-app-principal.ps1 -Force              # Arrêt forcé
# .\stop-app-principal.ps1 -Verbose            # Affichage détaillé
# =============================================================================

param(
    [switch]$KeepDocker,      # Conserver les services Docker
    [switch]$Force,           # Arrêt forcé de tous les processus
    [switch]$Verbose          # Affichage détaillé
)

# Configuration
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    BackendPidFile = ".backend.pid"
    FrontendPidFile = ".frontend.pid"
}

# Fonctions d'affichage
function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("SUCCESS", "ERROR", "WARNING", "INFO", "LOADING")]
        [string]$Type = "INFO"
    )
    
    $icons = @{
        "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]";
        "INFO" = "[INFO]"; "LOADING" = "[...]"
    }
    
    $colors = @{
        "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow";
        "INFO" = "Cyan"; "LOADING" = "Yellow"
    }
    
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══ $Title ═══" -ForegroundColor Yellow
    Write-Host ""
}

function Test-ServicePort {
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

function Stop-ServiceByPort {
    param(
        [int]$Port,
        [string]$ServiceName
    )
    
    if (Test-ServicePort $Port) {
        Write-Status "Arrêt du service $ServiceName (port $Port)..." "LOADING"
        
        try {
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
                    
                    Write-Status "$ServiceName arrêté" "SUCCESS"
                    return $true
                }
            }
        } catch {
            Write-Status "Erreur lors de l'arrêt de $ServiceName" "WARNING"
            if ($Verbose) {
                Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Status "$ServiceName n'était pas en cours d'exécution" "INFO"
        return $true
    }
    
    return $false
}

function Stop-ProcessByPid {
    param(
        [string]$PidFile,
        [string]$ServiceName
    )
    
    if (Test-Path $PidFile) {
        try {
            $processId = Get-Content $PidFile -ErrorAction SilentlyContinue
            if ($processId) {
                Write-Status "Arrêt de $ServiceName via PID: $processId" "LOADING"
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    if ($Force) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                    } else {
                        $process.CloseMainWindow()
                        Start-Sleep -Seconds 3
                        if (-not $process.HasExited) {
                            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        }
                    }
                    Write-Status "$ServiceName arrêté (PID: $processId)" "SUCCESS"
                } else {
                    Write-Status "Processus $ServiceName non trouvé (PID: $processId)" "WARNING"
                }
            }
            Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Status "Erreur lors de l'arrêt via PID de $ServiceName" "WARNING"
        }
    }
}

function Stop-NodeProcesses {
    param([string]$Filter = "")
    
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($Filter) {
        $processes = $processes | Where-Object { $_.CommandLine -like "*$Filter*" }
    }
    
    if ($processes) {
        foreach ($process in $processes) {
            try {
                if ($Verbose) {
                    Write-Host "   Arrêt du processus Node.js: PID $($process.Id)" -ForegroundColor Gray
                }
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            } catch {
                # Ignorer les erreurs
            }
        }
        return $processes.Count
    }
    return 0
}

function Stop-Application {
    # En-tête
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
    Write-Host "║            🛑 GESTION COMMERCIALE TPE - ARRÊT PRINCIPAL          ║" -ForegroundColor Red
    Write-Host "║                        Version 3.0 - Production                 ║" -ForegroundColor Red
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
    Write-Host ""
    
    if ($Force) {
        Write-Status "Mode FORCE activé - Arrêt immédiat de tous les processus" "WARNING"
    } else {
        Write-Status "Arrêt propre des services..." "INFO"
    }
    
    # Étape 1: Arrêt du Frontend
    Write-Header "ARRÊT DU FRONTEND"
    
    Stop-ProcessByPid $Global:Config.FrontendPidFile "Frontend Next.js"
    Stop-ServiceByPort $Global:Config.FrontendPort "Frontend Next.js"
    
    # Arrêter tous les processus Next.js
    Write-Status "Arrêt des processus Next.js..." "LOADING"
    $nextCount = Stop-NodeProcesses "next"
    if ($nextCount -gt 0) {
        Write-Status "$nextCount processus Next.js arrêtés" "SUCCESS"
    } else {
        Write-Status "Aucun processus Next.js trouvé" "INFO"
    }
    
    # Étape 2: Arrêt du Backend
    Write-Header "ARRÊT DU BACKEND"
    
    Stop-ProcessByPid $Global:Config.BackendPidFile "Backend Fastify"
    Stop-ServiceByPort $Global:Config.BackendPort "Backend API"
    
    # Arrêter tous les processus backend
    Write-Status "Arrêt des processus backend..." "LOADING"
    $backendCount = Stop-NodeProcesses "production-backend"
    if ($backendCount -gt 0) {
        Write-Status "$backendCount processus backend arrêtés" "SUCCESS"
    } else {
        Write-Status "Aucun processus backend trouvé" "INFO"
    }
    
    # Étape 3: Nettoyage général
    Write-Header "NETTOYAGE GÉNÉRAL"
    
    if ($Force) {
        Write-Status "Arrêt forcé de tous les processus Node.js..." "LOADING"
        $allNodeCount = Stop-NodeProcesses
        if ($allNodeCount -gt 0) {
            Write-Status "$allNodeCount processus Node.js arrêtés" "SUCCESS"
        } else {
            Write-Status "Aucun processus Node.js trouvé" "INFO"
        }
    } else {
        $remainingProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Status "$($remainingProcesses.Count) processus Node.js restants détectés" "WARNING"
            Write-Host "Utilisez -Force pour arrêter tous les processus Node.js" -ForegroundColor Gray
        } else {
            Write-Status "Aucun processus Node.js restant" "SUCCESS"
        }
    }
    
    # Nettoyage des fichiers temporaires
    Write-Status "Nettoyage des fichiers temporaires..." "LOADING"
    $tempFiles = @($Global:Config.BackendPidFile, $Global:Config.FrontendPidFile)
    $cleanedCount = 0
    foreach ($file in $tempFiles) {
        if (Test-Path $file) {
            Remove-Item $file -Force -ErrorAction SilentlyContinue
            $cleanedCount++
            if ($Verbose) {
                Write-Host "   Supprimé: $file" -ForegroundColor Gray
            }
        }
    }
    if ($cleanedCount -gt 0) {
        Write-Status "$cleanedCount fichiers temporaires nettoyés" "SUCCESS"
    } else {
        Write-Status "Aucun fichier temporaire à nettoyer" "INFO"
    }
    
    # Étape 4: Services Docker
    if (-not $KeepDocker) {
        Write-Header "ARRÊT DES SERVICES DOCKER"
        
        Write-Status "Arrêt des services Docker..." "LOADING"
        try {
            docker-compose down
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Services Docker arrêtés" "SUCCESS"
            } else {
                Write-Status "Erreur lors de l'arrêt des services Docker" "WARNING"
            }
        } catch {
            Write-Status "Docker non accessible" "WARNING"
        }
    } else {
        Write-Header "SERVICES DOCKER CONSERVÉS"
        Write-Status "Services Docker conservés (option -KeepDocker)" "INFO"
        Write-Host "Pour arrêter Docker manuellement: docker-compose down" -ForegroundColor Gray
    }
    
    # Étape 5: Vérification finale
    Write-Header "VÉRIFICATION FINALE"
    
    $frontendStillRunning = Test-ServicePort $Global:Config.FrontendPort
    $backendStillRunning = Test-ServicePort $Global:Config.BackendPort
    
    if (-not $frontendStillRunning -and -not $backendStillRunning) {
        Write-Status "Tous les services ont été arrêtés avec succès" "SUCCESS"
    } else {
        if ($frontendStillRunning) {
            Write-Status "Frontend encore actif sur le port $($Global:Config.FrontendPort)" "WARNING"
        }
        if ($backendStillRunning) {
            Write-Status "Backend encore actif sur le port $($Global:Config.BackendPort)" "WARNING"
        }
        Write-Host "Utilisez -Force pour un arrêt forcé" -ForegroundColor Gray
    }
    
    # Résumé final
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║                           ARRÊT TERMINÉ                          ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 RÉSUMÉ:" -ForegroundColor Cyan
    Write-Host "   Frontend (port $($Global:Config.FrontendPort)): $(if (-not $frontendStillRunning) { "ARRÊTÉ" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $frontendStillRunning) { "Green" } else { "Red" })
    Write-Host "   Backend (port $($Global:Config.BackendPort)): $(if (-not $backendStillRunning) { "ARRÊTÉ" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $backendStillRunning) { "Green" } else { "Red" })
    Write-Host "   Services Docker: $(if (-not $KeepDocker) { "ARRÊTÉS" } else { "CONSERVÉS" })" -ForegroundColor $(if (-not $KeepDocker) { "Green" } else { "Yellow" })
    Write-Host ""
    
    Write-Host "🔄 POUR REDÉMARRER:" -ForegroundColor Cyan
    Write-Host "   .\start-app-principal.ps1" -ForegroundColor White
    Write-Host ""
    
    Write-Host "🛠️  OPTIONS D'ARRÊT:" -ForegroundColor Cyan
    Write-Host "   -Force          : Arrêt forcé de tous les processus Node.js" -ForegroundColor Gray
    Write-Host "   -KeepDocker     : Conserver les services Docker actifs" -ForegroundColor Gray
    Write-Host "   -Verbose        : Affichage détaillé des opérations" -ForegroundColor Gray
    Write-Host ""
}

# EXÉCUTION
Stop-Application
