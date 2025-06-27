# =============================================================================
# SCRIPT D'ARRÊT ROBUSTE - GESTION COMMERCIALE TPE
# Version: 3.0 - Arrêt propre des services
# =============================================================================

param(
    [switch]$Force,           # Arrêt forcé
    [switch]$Verbose          # Affichage détaillé
)

# Configuration
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    PidDir = "pids"
    LogsDir = "logs"
}

# Fonctions d'affichage
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan" }
    $icons = @{ "SUCCESS" = "✅"; "ERROR" = "❌"; "WARNING" = "⚠️"; "INFO" = "ℹ️" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

# Arrêter un processus par PID
function Stop-ProcessByPid {
    param([string]$PidFile, [string]$ServiceName)
    
    if (Test-Path $PidFile) {
        try {
            $pid = Get-Content $PidFile -ErrorAction Stop
            if ($pid -and (Get-Process -Id $pid -ErrorAction SilentlyContinue)) {
                if ($Force) {
                    Stop-Process -Id $pid -Force
                    Write-Status "$ServiceName arrêté de force (PID: $pid)" "WARNING"
                } else {
                    Stop-Process -Id $pid
                    Write-Status "$ServiceName arrêté proprement (PID: $pid)" "SUCCESS"
                }
            } else {
                Write-Status "$ServiceName n'était pas en cours d'exécution" "INFO"
            }
            Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
        } catch {
            Write-Status "Erreur lors de l'arrêt de $ServiceName : $($_.Exception.Message)" "ERROR"
        }
    } else {
        Write-Status "Fichier PID de $ServiceName introuvable" "WARNING"
    }
}

# Arrêter les processus par port
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
                        Write-Status "$ServiceName (PID: $pid, Port: $Port) arrêté de force" "WARNING"
                    } else {
                        Stop-Process -Id $pid -ErrorAction SilentlyContinue
                        Write-Status "$ServiceName (PID: $pid, Port: $Port) arrêté proprement" "SUCCESS"
                    }
                } catch {
                    if ($Verbose) {
                        Write-Status "Erreur lors de l'arrêt du processus $pid : $($_.Exception.Message)" "WARNING"
                    }
                }
            }
        } else {
            Write-Status "Aucun processus trouvé sur le port $Port" "INFO"
        }
    } catch {
        Write-Status "Erreur lors de la recherche de processus sur le port $Port : $($_.Exception.Message)" "ERROR"
    }
}

# Nettoyer les fichiers temporaires
function Clean-TempFiles {
    Write-Status "Nettoyage des fichiers temporaires..." "INFO"
    
    # Supprimer les scripts de démarrage isolés
    @("start-backend-isolated.ps1", "start-frontend-isolated.ps1") | ForEach-Object {
        if (Test-Path $_) {
            Remove-Item $_ -Force -ErrorAction SilentlyContinue
            if ($Verbose) { Write-Status "Supprimé: $_" "INFO" }
        }
    }
    
    # Nettoyer les anciens logs (garder les 5 derniers)
    if (Test-Path $Global:Config.LogsDir) {
        Get-ChildItem $Global:Config.LogsDir -Filter "*.log" | 
            Sort-Object LastWriteTime -Descending | 
            Select-Object -Skip 5 | 
            Remove-Item -Force -ErrorAction SilentlyContinue
    }
}

# Fonction principale d'arrêt
function Stop-AllServices {
    Write-Status "🛑 ARRÊT DES SERVICES" "INFO"
    
    # Arrêter par fichiers PID d'abord
    $backendPidFile = Join-Path $Global:Config.PidDir "backend.pid"
    $frontendPidFile = Join-Path $Global:Config.PidDir "frontend.pid"
    
    Stop-ProcessByPid -PidFile $backendPidFile -ServiceName "Backend"
    Stop-ProcessByPid -PidFile $frontendPidFile -ServiceName "Frontend"
    
    # Attendre un peu
    Start-Sleep -Seconds 3
    
    # Arrêter par ports en cas de processus restants
    Stop-ProcessesByPort -Port $Global:Config.BackendPort -ServiceName "Backend"
    Stop-ProcessesByPort -Port $Global:Config.FrontendPort -ServiceName "Frontend"
    
    # Nettoyer les fichiers temporaires
    Clean-TempFiles
    
    Write-Status "✅ Tous les services ont été arrêtés" "SUCCESS"
}

# Exécution principale
try {
    Stop-AllServices
} catch {
    Write-Status "Erreur lors de l'arrêt des services: $($_.Exception.Message)" "ERROR"
    exit 1
}
