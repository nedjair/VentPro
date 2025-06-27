# =============================================================================
# SCRIPT D'ARRET PRINCIPAL - GESTION COMMERCIALE TPE
# Version: 3.1 - Production Complete (Corrige)
# 
# DESCRIPTION:
# Ce script arrete proprement TOUS les composants de l'application :
# - Frontend Next.js (port 3003)
# - Backend Fastify (port 3001)
# - Services Docker (PostgreSQL + Redis + Adminer + Redis Commander)
# - Nettoyage des processus et fichiers temporaires
# 
# USAGE:
# .\stop-app-principal-fixed.ps1                     # Arret complet
# .\stop-app-principal-fixed.ps1 -KeepDocker         # Conserver Docker
# .\stop-app-principal-fixed.ps1 -Force              # Arret force
# .\stop-app-principal-fixed.ps1 -Verbose            # Affichage detaille
# =============================================================================

param(
    [switch]$KeepDocker,      # Conserver les services Docker
    [switch]$Force,           # Arret force de tous les processus
    [switch]$Verbose          # Affichage detaille
)

# Configuration
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    BackendPidFile = ".backend.pid"
    FrontendPidFile = ".frontend.pid"
    LogsDir = "logs"
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
    Write-Host "=== $Title ===" -ForegroundColor Yellow
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
        Write-Status "Arret du service $ServiceName (port $Port)..." "LOADING"
        
        try {
            $processId = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess
            if ($processId) {
                $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                if ($process) {
                    if ($Verbose) {
                        Write-Host "   Processus trouve: $($process.ProcessName) (PID: $processId)" -ForegroundColor Gray
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
                    
                    Write-Status "$ServiceName arrete" "SUCCESS"
                    return $true
                }
            }
        } catch {
            Write-Status "Erreur lors de l'arret de $ServiceName" "WARNING"
            if ($Verbose) {
                Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Gray
            }
        }
    } else {
        Write-Status "$ServiceName n'etait pas en cours d'execution" "INFO"
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
                Write-Status "Arret de $ServiceName via PID: $processId" "LOADING"
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
                    Write-Status "$ServiceName arrete (PID: $processId)" "SUCCESS"
                } else {
                    Write-Status "Processus $ServiceName non trouve (PID: $processId)" "WARNING"
                }
            }
            Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Status "Erreur lors de l'arret via PID de $ServiceName" "WARNING"
        }
    }
}

function Stop-NodeProcesses {
    param([string]$Filter = "")
    
    $processes = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($Filter) {
        # Filtrer par ligne de commande si possible
        $filteredProcesses = @()
        foreach ($process in $processes) {
            try {
                $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($process.Id)").CommandLine
                if ($commandLine -and $commandLine -like "*$Filter*") {
                    $filteredProcesses += $process
                }
            } catch {
                # Si on ne peut pas obtenir la ligne de commande, inclure le processus
                $filteredProcesses += $process
            }
        }
        $processes = $filteredProcesses
    }
    
    if ($processes) {
        foreach ($process in $processes) {
            try {
                if ($Verbose) {
                    Write-Host "   Arret du processus Node.js: PID $($process.Id)" -ForegroundColor Gray
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

function Stop-NextJSProcesses {
    Write-Status "Recherche des processus Next.js..." "LOADING"
    
    # Arreter les processus Next.js specifiques
    $nextProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
        try {
            $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
            return $commandLine -and ($commandLine -like "*next*" -or $commandLine -like "*3003*")
        } catch {
            return $false
        }
    }
    
    $count = 0
    foreach ($process in $nextProcesses) {
        try {
            if ($Verbose) {
                Write-Host "   Arret du processus Next.js: PID $($process.Id)" -ForegroundColor Gray
            }
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $count++
        } catch {
            # Ignorer les erreurs
        }
    }
    
    return $count
}

function Stop-Application {
    # En-tete
    Clear-Host
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host "            GESTION COMMERCIALE TPE - ARRET PRINCIPAL                " -ForegroundColor Red
    Write-Host "                        Version 3.1 - Production                     " -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Red
    Write-Host ""
    
    if ($Force) {
        Write-Status "Mode FORCE active - Arret immediat de tous les processus" "WARNING"
    } else {
        Write-Status "Arret propre des services..." "INFO"
    }
    
    # Etape 1: Arret du Frontend Next.js
    Write-Header "ARRET DU FRONTEND NEXT.JS"
    
    Stop-ProcessByPid $Global:Config.FrontendPidFile "Frontend Next.js"
    Stop-ServiceByPort $Global:Config.FrontendPort "Frontend Next.js"
    
    # Arreter tous les processus Next.js
    $nextCount = Stop-NextJSProcesses
    if ($nextCount -gt 0) {
        Write-Status "$nextCount processus Next.js arretes" "SUCCESS"
    } else {
        Write-Status "Aucun processus Next.js trouve" "INFO"
    }
    
    # Etape 2: Arret du Backend
    Write-Header "ARRET DU BACKEND"
    
    Stop-ProcessByPid $Global:Config.BackendPidFile "Backend Fastify"
    Stop-ServiceByPort $Global:Config.BackendPort "Backend API"
    
    # Arreter tous les processus backend
    Write-Status "Arret des processus backend..." "LOADING"
    $backendCount = Stop-NodeProcesses "production-backend"
    if ($backendCount -gt 0) {
        Write-Status "$backendCount processus backend arretes" "SUCCESS"
    } else {
        Write-Status "Aucun processus backend trouve" "INFO"
    }
    
    # Etape 3: Nettoyage general
    Write-Header "NETTOYAGE GENERAL"
    
    if ($Force) {
        Write-Status "Arret force de tous les processus Node.js..." "LOADING"
        $allNodeCount = Stop-NodeProcesses
        if ($allNodeCount -gt 0) {
            Write-Status "$allNodeCount processus Node.js arretes" "SUCCESS"
        } else {
            Write-Status "Aucun processus Node.js trouve" "INFO"
        }
    } else {
        $remainingProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        if ($remainingProcesses) {
            Write-Status "$($remainingProcesses.Count) processus Node.js restants detectes" "WARNING"
            Write-Host "Utilisez -Force pour arreter tous les processus Node.js" -ForegroundColor Gray
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
                Write-Host "   Supprime: $file" -ForegroundColor Gray
            }
        }
    }
    
    # Nettoyage des logs si demande
    if ($Force -and (Test-Path $Global:Config.LogsDir)) {
        Write-Status "Nettoyage des logs..." "LOADING"
        try {
            Remove-Item "$($Global:Config.LogsDir)\*" -Force -ErrorAction SilentlyContinue
            Write-Status "Logs nettoyes" "SUCCESS"
        } catch {
            Write-Status "Erreur lors du nettoyage des logs" "WARNING"
        }
    }
    
    if ($cleanedCount -gt 0) {
        Write-Status "$cleanedCount fichiers temporaires nettoyes" "SUCCESS"
    } else {
        Write-Status "Aucun fichier temporaire a nettoyer" "INFO"
    }
    
    # Etape 4: Services Docker
    if (-not $KeepDocker) {
        Write-Header "ARRET DES SERVICES DOCKER"
        
        Write-Status "Arret des services Docker..." "LOADING"
        try {
            docker-compose down
            if ($LASTEXITCODE -eq 0) {
                Write-Status "Services Docker arretes" "SUCCESS"
            } else {
                Write-Status "Erreur lors de l'arret des services Docker" "WARNING"
            }
        } catch {
            Write-Status "Docker non accessible" "WARNING"
        }
    } else {
        Write-Header "SERVICES DOCKER CONSERVES"
        Write-Status "Services Docker conserves (option -KeepDocker)" "INFO"
        Write-Host "Pour arreter Docker manuellement: docker-compose down" -ForegroundColor Gray
    }
    
    # Etape 5: Verification finale
    Write-Header "VERIFICATION FINALE"
    
    $frontendStillRunning = Test-ServicePort $Global:Config.FrontendPort
    $backendStillRunning = Test-ServicePort $Global:Config.BackendPort
    
    if (-not $frontendStillRunning -and -not $backendStillRunning) {
        Write-Status "Tous les services ont ete arretes avec succes" "SUCCESS"
    } else {
        if ($frontendStillRunning) {
            Write-Status "Frontend encore actif sur le port $($Global:Config.FrontendPort)" "WARNING"
        }
        if ($backendStillRunning) {
            Write-Status "Backend encore actif sur le port $($Global:Config.BackendPort)" "WARNING"
        }
        Write-Host "Utilisez -Force pour un arret force" -ForegroundColor Gray
    }
    
    # Resume final
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host "                           ARRET TERMINE                             " -ForegroundColor Green
    Write-Host "======================================================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "RESUME:" -ForegroundColor Cyan
    Write-Host "   Frontend (port $($Global:Config.FrontendPort)): $(if (-not $frontendStillRunning) { "ARRETE" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $frontendStillRunning) { "Green" } else { "Red" })
    Write-Host "   Backend (port $($Global:Config.BackendPort)): $(if (-not $backendStillRunning) { "ARRETE" } else { "ENCORE ACTIF" })" -ForegroundColor $(if (-not $backendStillRunning) { "Green" } else { "Red" })
    Write-Host "   Services Docker: $(if (-not $KeepDocker) { "ARRETES" } else { "CONSERVES" })" -ForegroundColor $(if (-not $KeepDocker) { "Green" } else { "Yellow" })
    Write-Host ""
    
    Write-Host "POUR REDEMARRER:" -ForegroundColor Cyan
    Write-Host "   .\start-app-principal-fixed.ps1" -ForegroundColor White
    Write-Host "   .\start-quick-simple.ps1" -ForegroundColor White
    Write-Host ""
    
    Write-Host "OPTIONS D'ARRET:" -ForegroundColor Cyan
    Write-Host "   -Force          : Arret force de tous les processus Node.js" -ForegroundColor Gray
    Write-Host "   -KeepDocker     : Conserver les services Docker actifs" -ForegroundColor Gray
    Write-Host "   -Verbose        : Affichage detaille des operations" -ForegroundColor Gray
    Write-Host ""
}

# EXECUTION
Stop-Application
