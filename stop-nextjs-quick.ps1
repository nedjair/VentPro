# Script d'arret rapide pour Next.js
# Arrete uniquement le frontend Next.js

param(
    [switch]$Force,     # Arret force
    [switch]$Verbose    # Affichage detaille
)

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan"; "LOADING" = "Yellow" }
    $icons = @{ "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; "INFO" = "[INFO]"; "LOADING" = "[...]" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
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

Write-Host "ARRET RAPIDE - FRONTEND NEXT.JS" -ForegroundColor Red
Write-Host "===============================" -ForegroundColor Red
Write-Host ""

$FrontendPort = 3003
$stopped = $false

# Methode 1: Arret par port
if (Test-ServicePort $FrontendPort) {
    Write-Status "Arret du service Next.js (port $FrontendPort)..." "LOADING"
    
    try {
        $processId = (Get-NetTCPConnection -LocalPort $FrontendPort -ErrorAction SilentlyContinue).OwningProcess
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
                
                Write-Status "Next.js arrete (PID: $processId)" "SUCCESS"
                $stopped = $true
            }
        }
    } catch {
        Write-Status "Erreur lors de l'arret par port" "WARNING"
    }
}

# Methode 2: Arret par fichier PID
$pidFile = "frontend-nextjs-production\.frontend.pid"
if (Test-Path $pidFile) {
    try {
        $processId = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($processId) {
            Write-Status "Arret via fichier PID: $processId" "LOADING"
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Status "Next.js arrete via PID" "SUCCESS"
                $stopped = $true
            }
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Status "Erreur lors de l'arret via PID" "WARNING"
    }
}

# Methode 3: Arret de tous les processus Next.js
Write-Status "Recherche des processus Next.js restants..." "LOADING"
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
        $stopped = $true
    } catch {
        # Ignorer les erreurs
    }
}

if ($count -gt 0) {
    Write-Status "$count processus Next.js supplementaires arretes" "SUCCESS"
}

# Methode 4: Arret force si demande
if ($Force -and -not $stopped) {
    Write-Status "Arret force de tous les processus Node.js..." "LOADING"
    $allProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    $forceCount = 0
    foreach ($process in $allProcesses) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $forceCount++
        } catch {
            # Ignorer les erreurs
        }
    }
    if ($forceCount -gt 0) {
        Write-Status "$forceCount processus Node.js arretes en mode force" "SUCCESS"
        $stopped = $true
    }
}

# Verification finale
Start-Sleep -Seconds 2
if (-not (Test-ServicePort $FrontendPort)) {
    Write-Status "Next.js arrete avec succes" "SUCCESS"
    Write-Host ""
    Write-Host "Frontend Next.js arrete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Pour redemarrer:" -ForegroundColor Cyan
    Write-Host "   .\start-nextjs-direct.ps1" -ForegroundColor White
    Write-Host "   .\start-quick-simple.ps1" -ForegroundColor White
} else {
    Write-Status "Next.js encore actif sur le port $FrontendPort" "WARNING"
    Write-Host ""
    Write-Host "Essayez avec -Force pour un arret force" -ForegroundColor Yellow
}

Write-Host ""
