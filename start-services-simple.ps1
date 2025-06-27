# Script de demarrage simple et robuste
# Version: 1.0 - Sans emojis pour compatibilite

param(
    [switch]$Force,
    [switch]$Verbose
)

# Configuration
$BackendPort = 3001
$FrontendPort = 3003
$BackendFile = "production-backend.js"
$FrontendDir = "frontend-nextjs-production"
$LogsDir = "logs"
$PidDir = "pids"

# Creer les repertoires
if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null }
if (-not (Test-Path $PidDir)) { New-Item -ItemType Directory -Path $PidDir -Force | Out-Null }

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan"; "STEP" = "Magenta" }
    $icons = @{ "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; "INFO" = "[INFO]"; "STEP" = "[STEP]" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

function Test-Port {
    param([int]$Port)
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $Port)
        $tcpClient.Close()
        return $true
    } catch {
        return $false
    }
}

function Stop-ExistingProcesses {
    Write-Status "Arret des processus existants..." "STEP"
    
    # Arreter par ports
    @($BackendPort, $FrontendPort) | ForEach-Object {
        $port = $_
        try {
            $processes = netstat -ano | Select-String ":$port " | ForEach-Object {
                $line = $_.Line.Trim() -split '\s+'
                if ($line.Length -ge 5) { $line[4] }
            } | Where-Object { $_ -and $_ -ne "0" } | Sort-Object -Unique
            
            foreach ($pid in $processes) {
                if ($Force) {
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Status "Processus $pid (port $port) arrete de force" "WARNING"
                } else {
                    Stop-Process -Id $pid -ErrorAction SilentlyContinue
                    Write-Status "Processus $pid (port $port) arrete proprement" "INFO"
                }
            }
        } catch {
            if ($Verbose) { Write-Status "Erreur arret port $port : $($_.Exception.Message)" "WARNING" }
        }
    }
    
    Start-Sleep -Seconds 3
}

function Start-Backend {
    Write-Status "Demarrage du backend (port $BackendPort)..." "STEP"
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $logFile = Join-Path $LogsDir "backend-$timestamp.log"
    $errorFile = Join-Path $LogsDir "backend-error-$timestamp.log"
    $pidFile = Join-Path $PidDir "backend.pid"
    
    # Demarrer le backend
    $process = Start-Process -FilePath "node" `
        -ArgumentList $BackendFile `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errorFile
    
    # Sauvegarder le PID
    $process.Id | Out-File -FilePath $pidFile
    
    Write-Status "Backend demarre (PID: $($process.Id))" "SUCCESS"
    return $process
}

function Start-Frontend {
    Write-Status "Demarrage du frontend (port $FrontendPort)..." "STEP"
    
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $logFile = Join-Path $LogsDir "frontend-$timestamp.log"
    $errorFile = Join-Path $LogsDir "frontend-error-$timestamp.log"
    $pidFile = Join-Path $PidDir "frontend.pid"
    
    # Demarrer le frontend
    $process = Start-Process -FilePath "powershell.exe" `
        -ArgumentList "-Command", "cd $FrontendDir; npm run dev" `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $logFile `
        -RedirectStandardError $errorFile
    
    # Sauvegarder le PID
    $process.Id | Out-File -FilePath $pidFile
    
    Write-Status "Frontend demarre (PID: $($process.Id))" "SUCCESS"
    return $process
}

function Wait-ForService {
    param([int]$Port, [string]$ServiceName, [int]$MaxAttempts = 30)
    
    Write-Status "Attente de $ServiceName (port $Port)..." "INFO"
    
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        if (Test-Port -Port $Port) {
            Write-Status "$ServiceName est pret !" "SUCCESS"
            return $true
        }
        
        if ($Verbose) {
            Write-Status "Tentative $i/$MaxAttempts pour $ServiceName..." "INFO"
        }
        
        Start-Sleep -Seconds 2
    }
    
    Write-Status "$ServiceName n'a pas demarre dans les temps" "ERROR"
    return $false
}

# Fonction principale
function Start-Services {
    Write-Status "DEMARRAGE DES SERVICES" "STEP"
    Write-Status "Backend: port $BackendPort | Frontend: port $FrontendPort" "INFO"
    
    # Arreter les processus existants
    Stop-ExistingProcesses
    
    # Demarrer le backend
    $backendProcess = Start-Backend
    if (-not (Wait-ForService -Port $BackendPort -ServiceName "Backend")) {
        Write-Status "Echec du demarrage du backend" "ERROR"
        return $false
    }
    
    # Attendre avant de demarrer le frontend
    Start-Sleep -Seconds 5
    
    # Demarrer le frontend
    $frontendProcess = Start-Frontend
    if (-not (Wait-ForService -Port $FrontendPort -ServiceName "Frontend")) {
        Write-Status "Echec du demarrage du frontend" "ERROR"
        return $false
    }
    
    Write-Status "TOUS LES SERVICES SONT OPERATIONNELS !" "SUCCESS"
    Write-Status "Backend: http://localhost:$BackendPort" "INFO"
    Write-Status "Frontend: http://localhost:$FrontendPort" "INFO"
    Write-Status "Logs: $LogsDir/" "INFO"
    Write-Status "PIDs: $PidDir/" "INFO"
    
    return $true
}

# Execution principale
try {
    if (Start-Services) {
        Write-Status "Services demarres avec succes." "SUCCESS"
        Write-Status "Utilisez stop-services-simple.ps1 pour arreter." "INFO"
    } else {
        Write-Status "Echec du demarrage des services" "ERROR"
        exit 1
    }
} catch {
    Write-Status "Erreur critique: $($_.Exception.Message)" "ERROR"
    exit 1
}
