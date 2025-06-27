# Script de diagnostic simple pour les conflits de processus
# Version: 1.0

param([switch]$Verbose)

# Configuration
$BackendPort = 3001
$FrontendPort = 3003

function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan" }
    $icons = @{ "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; "INFO" = "[INFO]" }
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

Write-Status "=== DIAGNOSTIC DES CONFLITS ===" "INFO"

# Test des ports
Write-Status "Test des ports..." "INFO"
if (Test-Port -Port $BackendPort) {
    Write-Status "Port $BackendPort (Backend): OCCUPE" "WARNING"
} else {
    Write-Status "Port $BackendPort (Backend): LIBRE" "SUCCESS"
}

if (Test-Port -Port $FrontendPort) {
    Write-Status "Port $FrontendPort (Frontend): OCCUPE" "WARNING"
} else {
    Write-Status "Port $FrontendPort (Frontend): LIBRE" "SUCCESS"
}

# Test des processus Node.js
Write-Status "Processus Node.js actifs..." "INFO"
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        Write-Status "Nombre de processus Node.js: $($nodeProcesses.Count)" "INFO"
        foreach ($proc in $nodeProcesses) {
            $memory = [math]::Round($proc.WorkingSet64 / 1MB, 2)
            Write-Status "  PID: $($proc.Id) | Memoire: $memory MB | Debut: $($proc.StartTime)" "INFO"
        }
    } else {
        Write-Status "Aucun processus Node.js detecte" "SUCCESS"
    }
} catch {
    Write-Status "Erreur lors de la verification des processus Node.js" "ERROR"
}

# Test des processus sur les ports specifiques
Write-Status "Processus utilisant les ports..." "INFO"
try {
    $netstatOutput = netstat -ano | Select-String ":$BackendPort |:$FrontendPort "
    if ($netstatOutput) {
        foreach ($line in $netstatOutput) {
            Write-Status "  $line" "WARNING"
        }
    } else {
        Write-Status "Aucun processus detecte sur les ports cibles" "SUCCESS"
    }
} catch {
    Write-Status "Erreur lors de la verification netstat" "ERROR"
}

# Recommandations
Write-Status "=== RECOMMANDATIONS ===" "INFO"
$hasConflicts = (Test-Port -Port $BackendPort) -or (Test-Port -Port $FrontendPort)

if ($hasConflicts) {
    Write-Status "CONFLITS DETECTES - Actions recommandees:" "WARNING"
    Write-Status "1. Executer: .\stop-services-robust.ps1 -Force" "INFO"
    Write-Status "2. Attendre 10 secondes" "INFO"
    Write-Status "3. Executer: .\start-services-robust.ps1" "INFO"
} else {
    Write-Status "Aucun conflit detecte - Vous pouvez demarrer les services" "SUCCESS"
    Write-Status "Executer: .\start-services-robust.ps1" "INFO"
}

Write-Status "Diagnostic termine" "SUCCESS"
