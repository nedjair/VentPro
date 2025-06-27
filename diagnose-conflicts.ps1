# =============================================================================
# SCRIPT DE DIAGNOSTIC DES CONFLITS - GESTION COMMERCIALE TPE
# Version: 1.0 - Identification des causes de conflits entre processus
# =============================================================================

param(
    [switch]$Detailed,        # Diagnostic détaillé
    [switch]$Export           # Exporter le rapport
)

# Configuration
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    DatabasePort = 5432
    RedisPort = 6379
}

# Fonctions d'affichage
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $colors = @{ "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow"; "INFO" = "Cyan"; "HEADER" = "Magenta" }
    $icons = @{ "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; "INFO" = "[INFO]"; "HEADER" = "[DIAG]" }
    Write-Host "$($icons[$Type]) $Message" -ForegroundColor $colors[$Type]
}

# Diagnostic des ports
function Test-PortConflicts {
    Write-Status "DIAGNOSTIC DES PORTS" "HEADER"
    
    $ports = @($Global:Config.BackendPort, $Global:Config.FrontendPort, $Global:Config.DatabasePort, $Global:Config.RedisPort)
    $conflicts = @()
    
    foreach ($port in $ports) {
        try {
            $processes = netstat -ano | Select-String ":$port " | ForEach-Object {
                $line = $_.Line.Trim() -split '\s+'
                if ($line.Length -ge 5) {
                    @{
                        Protocol = $line[0]
                        LocalAddress = $line[1]
                        State = $line[3]
                        PID = $line[4]
                    }
                }
            }
            
            if ($processes) {
                foreach ($proc in $processes) {
                    try {
                        $processInfo = Get-Process -Id $proc.PID -ErrorAction SilentlyContinue
                        if ($processInfo) {
                            $conflicts += @{
                                Port = $port
                                PID = $proc.PID
                                ProcessName = $processInfo.ProcessName
                                StartTime = $processInfo.StartTime
                                WorkingSet = [math]::Round($processInfo.WorkingSet64 / 1MB, 2)
                            }
                            Write-Status "Port $port utilisé par $($processInfo.ProcessName) (PID: $($proc.PID))" "WARNING"
                        }
                    } catch {
                        Write-Status "Port $port utilisé par processus inconnu (PID: $($proc.PID))" "WARNING"
                    }
                }
            } else {
                Write-Status "Port $port libre" "SUCCESS"
            }
        } catch {
            Write-Status "Erreur lors du test du port $port : $($_.Exception.Message)" "ERROR"
        }
    }
    
    return $conflicts
}

# Diagnostic des processus Node.js
function Test-NodeProcesses {
    Write-Status "DIAGNOSTIC DES PROCESSUS NODE.JS" "HEADER"
    
    try {
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
        
        if ($nodeProcesses) {
            foreach ($proc in $nodeProcesses) {
                try {
                    $commandLine = (Get-WmiObject Win32_Process -Filter "ProcessId = $($proc.Id)").CommandLine
                    Write-Status "Node.js PID: $($proc.Id) | Mémoire: $([math]::Round($proc.WorkingSet64 / 1MB, 2)) MB | Démarré: $($proc.StartTime)" "INFO"
                    if ($Detailed -and $commandLine) {
                        Write-Status "  Commande: $commandLine" "INFO"
                    }
                } catch {
                    Write-Status "Node.js PID: $($proc.Id) | Informations limitées" "WARNING"
                }
            }
        } else {
            Write-Status "Aucun processus Node.js en cours d'exécution" "INFO"
        }
        
        return $nodeProcesses
    } catch {
        Write-Status "Erreur lors de l'analyse des processus Node.js : $($_.Exception.Message)" "ERROR"
        return @()
    }
}

# Diagnostic des ressources système
function Test-SystemResources {
    Write-Status "DIAGNOSTIC DES RESSOURCES SYSTÈME" "HEADER"
    
    try {
        # Mémoire
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
        $usedMemory = $totalMemory - $freeMemory
        $memoryUsage = [math]::Round(($usedMemory / $totalMemory) * 100, 2)
        
        Write-Status "Mémoire totale: $totalMemory GB" "INFO"
        Write-Status "Mémoire utilisée: $usedMemory GB ($memoryUsage%)" "INFO"
        Write-Status "Mémoire libre: $freeMemory GB" "INFO"
        
        if ($memoryUsage -gt 80) {
            Write-Status "Utilisation memoire elevee detectee" "WARNING"
        }
        
        # CPU
        $cpu = Get-WmiObject -Class Win32_Processor
        Write-Status "Processeur: $($cpu.Name)" "INFO"
        Write-Status "Cœurs: $($cpu.NumberOfCores) | Threads: $($cpu.NumberOfLogicalProcessors)" "INFO"
        
        # Disque
        $disk = Get-WmiObject -Class Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskFree = [math]::Round($disk.FreeSpace / 1GB, 2)
        $diskTotal = [math]::Round($disk.Size / 1GB, 2)
        $diskUsage = [math]::Round((($diskTotal - $diskFree) / $diskTotal) * 100, 2)
        
        Write-Status "Disque C: $diskFree GB libres sur $diskTotal GB (${diskUsage}% utilise)" "INFO"

        if ($diskUsage -gt 90) {
            Write-Status "Espace disque faible detecte" "WARNING"
        }
        
    } catch {
        Write-Status "Erreur lors de l'analyse des ressources système : $($_.Exception.Message)" "ERROR"
    }
}

# Diagnostic des fichiers de configuration
function Test-ConfigurationFiles {
    Write-Status "DIAGNOSTIC DES FICHIERS DE CONFIGURATION" "HEADER"
    
    $files = @(
        @{ Path = "production-backend.js"; Type = "Backend" },
        @{ Path = "frontend-nextjs-production/package.json"; Type = "Frontend Package" },
        @{ Path = "frontend-nextjs-production/next.config.mjs"; Type = "Frontend Config" },
        @{ Path = "package.json"; Type = "Root Package" }
    )
    
    foreach ($file in $files) {
        if (Test-Path $file.Path) {
            $fileInfo = Get-Item $file.Path
            Write-Status "$($file.Type): OK ($($fileInfo.Length) bytes, modifie: $($fileInfo.LastWriteTime))" "SUCCESS"
            
            if ($Detailed) {
                # Vérifier les ports dans les fichiers de configuration
                $content = Get-Content $file.Path -Raw -ErrorAction SilentlyContinue
                if ($content) {
                    if ($content -match "port.*(\d{4})") {
                        Write-Status "  Port détecté: $($matches[1])" "INFO"
                    }
                }
            }
        } else {
            Write-Status "$($file.Type): MANQUANT Fichier manquant" "ERROR"
        }
    }
}

# Diagnostic des services externes
function Test-ExternalServices {
    Write-Status "DIAGNOSTIC DES SERVICES EXTERNES" "HEADER"
    
    # PostgreSQL
    try {
        $pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
        if ($pgService) {
            Write-Status "PostgreSQL: $($pgService.Status)" "INFO"
        } else {
            Write-Status "PostgreSQL: Service non trouvé" "WARNING"
        }
    } catch {
        Write-Status "PostgreSQL: Erreur de vérification" "ERROR"
    }
    
    # Test de connectivité base de données
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $Global:Config.DatabasePort)
        $tcpClient.Close()
        Write-Status "Base de données: Accessible sur port $($Global:Config.DatabasePort)" "SUCCESS"
    } catch {
        Write-Status "Base de données: Non accessible sur port $($Global:Config.DatabasePort)" "ERROR"
    }
}

# Générer un rapport
function Generate-Report {
    param($Conflicts, $NodeProcesses)
    
    $report = @"
# RAPPORT DE DIAGNOSTIC - $(Get-Date)

## Résumé
- Conflits de ports détectés: $($Conflicts.Count)
- Processus Node.js actifs: $($NodeProcesses.Count)

## Recommandations
"@
    
    if ($Conflicts.Count -eq 0) {
        $report += "`n[OK] Aucun conflit de port detecte"
    } else {
        $report += "`n[WARN] Conflits detectes - Utilisez stop-services-robust.ps1 pour nettoyer"
    }

    if ($NodeProcesses.Count -gt 2) {
        $report += "`n[WARN] Trop de processus Node.js - Redemarrage recommande"
    }
    
    $report += "`n`n## Actions suggérées"
    $report += "`n1. Exécuter: .\stop-services-robust.ps1 -Force"
    $report += "`n2. Attendre 10 secondes"
    $report += "`n3. Exécuter: .\start-services-robust.ps1"
    
    if ($Export) {
        $reportFile = "diagnostic-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        $report | Out-File -FilePath $reportFile -Encoding UTF8
        Write-Status "Rapport exporté: $reportFile" "SUCCESS"
    }
    
    return $report
}

# Exécution principale
function Start-Diagnosis {
    Write-Status "DIAGNOSTIC DES CONFLITS DE PROCESSUS" "HEADER"
    Write-Status "Analyse en cours..." "INFO"
    
    $conflicts = Test-PortConflicts
    $nodeProcesses = Test-NodeProcesses
    Test-SystemResources
    Test-ConfigurationFiles
    Test-ExternalServices
    
    Write-Status "GÉNÉRATION DU RAPPORT" "HEADER"
    $report = Generate-Report -Conflicts $conflicts -NodeProcesses $nodeProcesses
    
    Write-Host "`n$report" -ForegroundColor White
    
    Write-Status "Diagnostic terminé" "SUCCESS"
}

# Exécution
try {
    Start-Diagnosis
} catch {
    Write-Status "Erreur lors du diagnostic: $($_.Exception.Message)" "ERROR"
    exit 1
}
