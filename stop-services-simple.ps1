# Script d'arret simple et robuste
# Version: 1.0

param(
    [switch]$Force,
    [switch]$Verbose
)

# Configuration
$BackendPort = 3001
$FrontendPort = 3003
$PidDir = "pids"

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan" }
    $icons = @{ "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; "INFO" = "[INFO]" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Stop-ProcessByPid {
    param([string]$PidFile, [string]$ServiceName)
    
    if (Test-Path $PidFile) {
        try {
            $pid = Get-Content $PidFile -ErrorAction Stop
            if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
                if ($Force) {
                    Stop-Process -Id $pid -Force
                    Write-Status "$ServiceName arrete de force (PID: $pid)" "WARNING"
                } else {
                    Stop-Process -Id $pid
                    Write-Status "$ServiceName arrete proprement (PID: $pid)" "SUCCESS"
                }
            } else {
                Write-Status "$ServiceName n'etait pas en cours d'execution" "INFO"
            }
            Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Status "Erreur lors de l'arret de $ServiceName : $($_.Exception.Message)" "ERROR"
        }
    } else {
        Write-Status "Fichier PID de $ServiceName introuvable" "WARNING"
    }
}

function Stop-ProcessesByPort {
    param([int]$Port, [string]$ServiceName)
    
    try {
        $processes = netstat -ano | Select-String ":$Port " | ForEach-Object {
            $line = $_.Line.Trim() -split '\s+'
            if ($line.Length -ge 5) { $line[4] }
        } | Where-Object { $_ -and $_ -ne "0" } | Sort-Object -Unique
        
        if ($processes) {
            foreach ($pid in $processes) {
                try {
                    if ($Force) {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Status "$ServiceName (PID: $pid, Port: $Port) arrete de force" "WARNING"
                    } else {
                        Stop-Process -Id $pid -ErrorAction SilentlyContinue
                        Write-Status "$ServiceName (PID: $pid, Port: $Port) arrete proprement" "SUCCESS"
                    }
                } catch {
                    if ($Verbose) {
                        Write-Status "Erreur lors de l'arret du processus $pid : $($_.Exception.Message)" "WARNING"
                    }
                }
            }
        } else {
            Write-Status "Aucun processus trouve sur le port $Port" "INFO"
        }
    } catch {
        Write-Status "Erreur lors de la recherche de processus sur le port $Port : $($_.Exception.Message)" "ERROR"
    }
}

function Stop-AllServices {
    Write-Status "ARRET DES SERVICES" "INFO"
    
    # Arreter par fichiers PID d'abord
    $backendPidFile = Join-Path $PidDir "backend.pid"
    $frontendPidFile = Join-Path $PidDir "frontend.pid"
    
    Stop-ProcessByPid -PidFile $backendPidFile -ServiceName "Backend"
    Stop-ProcessByPid -PidFile $frontendPidFile -ServiceName "Frontend"
    
    # Attendre un peu
    Start-Sleep -Seconds 3
    
    # Arreter par ports en cas de processus restants
    Stop-ProcessesByPort -Port $BackendPort -ServiceName "Backend"
    Stop-ProcessesByPort -Port $FrontendPort -ServiceName "Frontend"
    
    Write-Status "Tous les services ont ete arretes" "SUCCESS"
}

# Execution principale
try {
    Stop-AllServices
} catch {
    Write-Status "Erreur lors de l'arret des services: $($_.Exception.Message)" "ERROR"
    exit 1
}
