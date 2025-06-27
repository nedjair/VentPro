# =============================================================================
# SCRIPT DE DÉMARRAGE ROBUSTE - GESTION COMMERCIALE TPE
# Version: 3.0 - Solution aux conflits de processus
# Résout les problèmes de terminaison mutuelle des services
# =============================================================================

param(
    [switch]$Force,           # Forcer l'arrêt des processus existants
    [switch]$Verbose,         # Affichage détaillé
    [switch]$SkipDocker,      # Ignorer Docker
    [switch]$Debug            # Mode debug avec logs détaillés
)

# Configuration globale
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    BackendFile = "production-backend.js"
    FrontendDir = "frontend-nextjs-production"
    LogsDir = "logs"
    PidDir = "pids"
    MaxWaitAttempts = 30
    WaitInterval = 2
}

# Créer les répertoires nécessaires
function Initialize-Directories {
    @($Global:Config.LogsDir, $Global:Config.PidDir) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
}

# Fonctions d'affichage
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan"; "LOADING" = "Yellow"; "STEP" = "Magenta" }
    $icons = @{ "SUCCESS" = "✅"; "ERROR" = "❌"; "WARNING" = "⚠️"; "INFO" = "ℹ️"; "LOADING" = "⏳"; "STEP" = "🔄" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

# Test de port avec timeout
function Test-Port {
    param([int]$Port, [int]$TimeoutSeconds = 5)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect("localhost", $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne($TimeoutSeconds * 1000)
        
        if ($wait) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# Arrêter les processus existants de manière propre
function Stop-ExistingProcesses {
    param([switch]$Force)
    
    Write-Status "Arrêt des processus existants..." "STEP"
    
    # Arrêter les processus par port
    @($Global:Config.BackendPort, $Global:Config.FrontendPort) | ForEach-Object {
        $port = $_
        try {
            $processes = netstat -ano | Select-String ":$port " | ForEach-Object {
                $line = $_.Line.Trim() -split '\s+'
                if ($line.Length -ge 5) { $line[4] }
            } | Where-Object { $_ -and $_ -ne "0" } | Sort-Object -Unique
            
            foreach ($pid in $processes) {
                if ($Force) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Status "Processus $pid (port $port) arrêté de force" "WARNING"
                } else {
                    Stop-Process -Id $pid -ErrorAction SilentlyContinue
                    Write-Status "Processus $pid (port $port) arrêté proprement" "INFO"
                }
            }
        } catch {
            if ($Verbose) { Write-Status "Erreur lors de l'arrêt du port $port : $($_.Exception.Message)" "WARNING" }
        }
    }
    
    # Attendre que les ports se libèrent
    Start-Sleep -Seconds 3
}

# Démarrer le backend de manière isolée
function Start-Backend {
    Write-Status "Démarrage du backend (port $($Global:Config.BackendPort))..." "STEP"
    
    $backendLogFile = Join-Path $Global:Config.LogsDir "backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $backendErrorFile = Join-Path $Global:Config.LogsDir "backend-error-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $backendPidFile = Join-Path $Global:Config.PidDir "backend.pid"
    
    # Créer un script de démarrage isolé pour le backend
    $backendScript = @"
# Isolation du processus backend
`$env:NODE_ENV = "production"
`$env:PORT = "$($Global:Config.BackendPort)"
`$env:FORCE_COLOR = "0"

# Démarrer le backend avec gestion d'erreurs
try {
    Write-Host "🚀 Démarrage backend isolé sur port $($Global:Config.BackendPort)"
    node "$($Global:Config.BackendFile)" 2>&1 | Tee-Object -FilePath "$backendLogFile"
} catch {
    Write-Host "❌ Erreur backend: `$_" | Tee-Object -FilePath "$backendErrorFile"
    exit 1
}
"@
    
    $backendScriptFile = "start-backend-isolated.ps1"
    $backendScript | Out-File -FilePath $backendScriptFile -Encoding UTF8
    
    # Démarrer le backend dans un processus complètement isolé
    $backendProcess = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $backendScriptFile `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $backendLogFile `
        -RedirectStandardError $backendErrorFile
    
    # Sauvegarder le PID
    $backendProcess.Id | Out-File -FilePath $backendPidFile
    
    Write-Status "Backend démarré (PID: $($backendProcess.Id))" "SUCCESS"
    return $backendProcess
}

# Démarrer le frontend de manière isolée
function Start-Frontend {
    Write-Status "Démarrage du frontend (port $($Global:Config.FrontendPort))..." "STEP"
    
    $frontendLogFile = Join-Path $Global:Config.LogsDir "frontend-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $frontendErrorFile = Join-Path $Global:Config.LogsDir "frontend-error-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    $frontendPidFile = Join-Path $Global:Config.PidDir "frontend.pid"
    
    # Créer un script de démarrage isolé pour le frontend
    $frontendScript = @"
# Isolation du processus frontend
Set-Location "$($Global:Config.FrontendDir)"
`$env:NODE_ENV = "development"
`$env:PORT = "$($Global:Config.FrontendPort)"
`$env:FORCE_COLOR = "0"

# Démarrer le frontend avec gestion d'erreurs
try {
    Write-Host "🚀 Démarrage frontend isolé sur port $($Global:Config.FrontendPort)"
    npm run dev 2>&1 | Tee-Object -FilePath "../$frontendLogFile"
} catch {
    Write-Host "❌ Erreur frontend: `$_" | Tee-Object -FilePath "../$frontendErrorFile"
    exit 1
}
"@
    
    $frontendScriptFile = "start-frontend-isolated.ps1"
    $frontendScript | Out-File -FilePath $frontendScriptFile -Encoding UTF8
    
    # Démarrer le frontend dans un processus complètement isolé
    $frontendProcess = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-ExecutionPolicy", "Bypass", "-File", $frontendScriptFile `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $frontendLogFile `
        -RedirectStandardError $frontendErrorFile
    
    # Sauvegarder le PID
    $frontendProcess.Id | Out-File -FilePath $frontendPidFile
    
    Write-Status "Frontend démarré (PID: $($frontendProcess.Id))" "SUCCESS"
    return $frontendProcess
}

# Attendre qu'un service soit prêt
function Wait-ForService {
    param([int]$Port, [string]$ServiceName, [int]$MaxAttempts = 30)
    
    Write-Status "Attente de $ServiceName (port $Port)..." "LOADING"
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        if (Test-Port -Port $Port) {
            Write-Status "$ServiceName est prêt !" "SUCCESS"
            return $true
        }
        
        if ($Verbose) {
            Write-Status "Tentative $i/$MaxAttempts pour $ServiceName..." "INFO"
        }
        
        Start-Sleep -Seconds $Global:Config.WaitInterval
    }
    
    Write-Status "$ServiceName n'a pas démarré dans les temps" "ERROR"
    return $false
}

# Fonction principale
function Start-Services {
    Write-Status "🚀 DÉMARRAGE ROBUSTE DES SERVICES" "STEP"
    Write-Status "Backend: port $($Global:Config.BackendPort) | Frontend: port $($Global:Config.FrontendPort)" "INFO"
    
    # Initialiser les répertoires
    Initialize-Directories
    
    # Arrêter les processus existants
    Stop-ExistingProcesses -Force:$Force
    
    # Démarrer le backend
    $backendProcess = Start-Backend
    if (-not (Wait-ForService -Port $Global:Config.BackendPort -ServiceName "Backend")) {
        Write-Status "Échec du démarrage du backend" "ERROR"
        return $false
    }
    
    # Attendre un peu avant de démarrer le frontend
    Start-Sleep -Seconds 5
    
    # Démarrer le frontend
    $frontendProcess = Start-Frontend
    if (-not (Wait-ForService -Port $Global:Config.FrontendPort -ServiceName "Frontend")) {
        Write-Status "Échec du démarrage du frontend" "ERROR"
        return $false
    }
    
    Write-Status "🎉 TOUS LES SERVICES SONT OPÉRATIONNELS !" "SUCCESS"
    Write-Status "Backend: http://localhost:$($Global:Config.BackendPort)" "INFO"
    Write-Status "Frontend: http://localhost:$($Global:Config.FrontendPort)" "INFO"
    Write-Status "Logs: $($Global:Config.LogsDir)/" "INFO"
    Write-Status "PIDs: $($Global:Config.PidDir)/" "INFO"
    
    return $true
}

# Exécution principale
try {
    if (Start-Services) {
        Write-Status "Services démarrés avec succès. Appuyez sur Ctrl+C pour arrêter." "SUCCESS"
        
        # Garder le script en vie pour surveiller les processus
        while ($true) {
            Start-Sleep -Seconds 30
            
            # Vérifier que les services sont toujours en vie
            if (-not (Test-Port -Port $Global:Config.BackendPort)) {
                Write-Status "⚠️ Backend non accessible, redémarrage..." "WARNING"
                Start-Backend | Out-Null
            }
            
            if (-not (Test-Port -Port $Global:Config.FrontendPort)) {
                Write-Status "⚠️ Frontend non accessible, redémarrage..." "WARNING"
                Start-Frontend | Out-Null
            }
        }
    } else {
        Write-Status "Échec du démarrage des services" "ERROR"
        exit 1
    }
} catch {
    Write-Status "Erreur critique: $($_.Exception.Message)" "ERROR"
    exit 1
}
