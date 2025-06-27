# =============================================================================
# 🔍 SCRIPT DE VÉRIFICATION - GESTION COMMERCIALE TPE
# Version: 3.0 - Diagnostic Complet
# 
# DESCRIPTION:
# Vérifie l'état de tous les composants de l'application et fournit
# un diagnostic complet avec recommandations.
# 
# USAGE:
# .\check-app-status.ps1                       # Vérification standard
# .\check-app-status.ps1 -Detailed             # Diagnostic détaillé
# .\check-app-status.ps1 -Fix                  # Tentative de correction automatique
# =============================================================================

param(
    [switch]$Detailed,        # Diagnostic détaillé
    [switch]$Fix              # Tentative de correction automatique
)

# Configuration
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    PostgreSQLPort = 5432
    RedisPort = 6379
    AdminerPort = 8080
    RedisCommanderPort = 8081
    BackendFile = "production-backend.js"
    FrontendDir = "frontend-nextjs-production"
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
        "INFO" = "[INFO]"; "LOADING" = "[CHECK]"
    }
    
    $colors = @{
        "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow";
        "INFO" = "Cyan"; "LOADING" = "Blue"
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
    param([int]$Port, [string]$ServiceName = "")
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return @{ Status = $true; Message = "Actif" }
    } catch {
        return @{ Status = $false; Message = "Inactif" }
    }
}

function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutSec = 5)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec
        return @{ 
            Status = $true
            StatusCode = $response.StatusCode
            Message = "Opérationnel"
        }
    } catch {
        return @{ 
            Status = $false
            StatusCode = $null
            Message = $_.Exception.Message
        }
    }
}

function Get-ProcessInfo {
    param([string]$ProcessName)
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        return @{
            Status = $true
            Count = $processes.Count
            PIDs = $processes.Id -join ", "
            Memory = [math]::Round(($processes | Measure-Object WorkingSet -Sum).Sum / 1MB, 2)
        }
    } else {
        return @{
            Status = $false
            Count = 0
            PIDs = ""
            Memory = 0
        }
    }
}

function Test-FileExists {
    param([string]$Path, [string]$Description)
    if (Test-Path $Path) {
        $item = Get-Item $Path
        return @{
            Status = $true
            Size = if ($item.PSIsContainer) { "Dossier" } else { [math]::Round($item.Length / 1KB, 2).ToString() + " KB" }
            LastModified = $item.LastWriteTime.ToString("dd/MM/yyyy HH:mm")
        }
    } else {
        return @{
            Status = $false
            Size = "N/A"
            LastModified = "N/A"
        }
    }
}

function Check-Prerequisites {
    Write-Header "VÉRIFICATION DES PRÉREQUIS"
    
    # Node.js
    try {
        $nodeVersion = node --version
        Write-Status "Node.js: $nodeVersion" "SUCCESS"
    } catch {
        Write-Status "Node.js: Non installé" "ERROR"
        if ($Fix) {
            Write-Status "Veuillez installer Node.js 20+ depuis https://nodejs.org/" "INFO"
        }
    }
    
    # Yarn
    try {
        $yarnVersion = yarn --version
        Write-Status "Yarn: v$yarnVersion" "SUCCESS"
    } catch {
        Write-Status "Yarn: Non installé" "WARNING"
        if ($Fix) {
            Write-Status "Installation de Yarn..." "LOADING"
            try {
                npm install -g yarn
                Write-Status "Yarn installé avec succès" "SUCCESS"
            } catch {
                Write-Status "Échec de l'installation de Yarn" "ERROR"
            }
        }
    }
    
    # Docker
    try {
        $dockerVersion = docker --version
        Write-Status "Docker: $dockerVersion" "SUCCESS"
        
        docker ps | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Docker: Service actif" "SUCCESS"
        } else {
            Write-Status "Docker: Service inactif" "WARNING"
        }
    } catch {
        Write-Status "Docker: Non installé ou non accessible" "WARNING"
    }
}

function Check-Files {
    Write-Header "VÉRIFICATION DES FICHIERS"
    
    # Fichiers principaux
    $files = @(
        @{ Path = $Global:Config.BackendFile; Description = "Backend principal" },
        @{ Path = $Global:Config.FrontendDir; Description = "Dossier frontend" },
        @{ Path = "docker-compose.yml"; Description = "Configuration Docker" },
        @{ Path = "package.json"; Description = "Configuration racine" },
        @{ Path = "$($Global:Config.FrontendDir)\package.json"; Description = "Configuration frontend" }
    )
    
    foreach ($file in $files) {
        $result = Test-FileExists $file.Path $file.Description
        if ($result.Status) {
            Write-Status "$($file.Description): Présent ($($result.Size))" "SUCCESS"
            if ($Detailed) {
                Write-Host "   Dernière modification: $($result.LastModified)" -ForegroundColor Gray
            }
        } else {
            Write-Status "$($file.Description): Manquant" "ERROR"
        }
    }
    
    # Dossiers de logs
    $logsResult = Test-FileExists "logs" "Dossier logs"
    if ($logsResult.Status) {
        Write-Status "Dossier logs: Présent" "SUCCESS"
    } else {
        Write-Status "Dossier logs: Manquant" "WARNING"
        if ($Fix) {
            New-Item -ItemType Directory -Path "logs" -Force | Out-Null
            Write-Status "Dossier logs créé" "SUCCESS"
        }
    }
}

function Check-Services {
    Write-Header "VÉRIFICATION DES SERVICES"
    
    # Services principaux
    $services = @(
        @{ Port = $Global:Config.BackendPort; Name = "Backend API"; Url = "http://localhost:$($Global:Config.BackendPort)/health" },
        @{ Port = $Global:Config.FrontendPort; Name = "Frontend Next.js"; Url = $null },
        @{ Port = $Global:Config.PostgreSQLPort; Name = "PostgreSQL"; Url = $null },
        @{ Port = $Global:Config.RedisPort; Name = "Redis"; Url = $null },
        @{ Port = $Global:Config.AdminerPort; Name = "Adminer"; Url = "http://localhost:$($Global:Config.AdminerPort)" },
        @{ Port = $Global:Config.RedisCommanderPort; Name = "Redis Commander"; Url = "http://localhost:$($Global:Config.RedisCommanderPort)" }
    )
    
    foreach ($service in $services) {
        $portResult = Test-ServicePort $service.Port
        if ($portResult.Status) {
            Write-Status "$($service.Name) (port $($service.Port)): Actif" "SUCCESS"
            
            # Test HTTP si URL fournie
            if ($service.Url -and $Detailed) {
                $httpResult = Test-HttpEndpoint $service.Url
                if ($httpResult.Status) {
                    Write-Host "   HTTP Status: $($httpResult.StatusCode) - $($httpResult.Message)" -ForegroundColor Green
                } else {
                    Write-Host "   HTTP Error: $($httpResult.Message)" -ForegroundColor Red
                }
            }
        } else {
            Write-Status "$($service.Name) (port $($service.Port)): Inactif" "ERROR"
        }
    }
}

function Check-Processes {
    Write-Header "VÉRIFICATION DES PROCESSUS"
    
    # Processus Node.js
    $nodeInfo = Get-ProcessInfo "node"
    if ($nodeInfo.Status) {
        Write-Status "Processus Node.js: $($nodeInfo.Count) actifs" "SUCCESS"
        if ($Detailed) {
            Write-Host "   PIDs: $($nodeInfo.PIDs)" -ForegroundColor Gray
            Write-Host "   Mémoire totale: $($nodeInfo.Memory) MB" -ForegroundColor Gray
        }
    } else {
        Write-Status "Processus Node.js: Aucun actif" "WARNING"
    }
    
    # Processus Docker
    try {
        $dockerContainers = docker ps --format "table {{.Names}}\t{{.Status}}" 2>$null
        if ($dockerContainers) {
            $containerCount = ($dockerContainers | Measure-Object).Count - 1  # Exclure l'en-tête
            Write-Status "Conteneurs Docker: $containerCount actifs" "SUCCESS"
            if ($Detailed) {
                Write-Host "   Conteneurs:" -ForegroundColor Gray
                $dockerContainers | Select-Object -Skip 1 | ForEach-Object {
                    Write-Host "     $_" -ForegroundColor Gray
                }
            }
        } else {
            Write-Status "Conteneurs Docker: Aucun actif" "WARNING"
        }
    } catch {
        Write-Status "Docker: Non accessible" "ERROR"
    }
}

function Check-Dependencies {
    Write-Header "VÉRIFICATION DES DÉPENDANCES"
    
    # Dépendances racine
    if (Test-Path "node_modules") {
        Write-Status "Dépendances racine: Installées" "SUCCESS"
    } else {
        Write-Status "Dépendances racine: Manquantes" "ERROR"
        if ($Fix) {
            Write-Status "Installation des dépendances racine..." "LOADING"
            yarn install --silent
            Write-Status "Dépendances racine installées" "SUCCESS"
        }
    }
    
    # Dépendances frontend
    if (Test-Path "$($Global:Config.FrontendDir)\node_modules") {
        Write-Status "Dépendances frontend: Installées" "SUCCESS"
        
        # Vérifier Recharts pour Analytics
        if (Test-Path "$($Global:Config.FrontendDir)\node_modules\recharts") {
            Write-Status "Recharts (Analytics): Installé" "SUCCESS"
        } else {
            Write-Status "Recharts (Analytics): Manquant" "WARNING"
            if ($Fix) {
                Set-Location $Global:Config.FrontendDir
                yarn add recharts --silent
                Set-Location ..
                Write-Status "Recharts installé" "SUCCESS"
            }
        }
    } else {
        Write-Status "Dépendances frontend: Manquantes" "ERROR"
        if ($Fix) {
            Write-Status "Installation des dépendances frontend..." "LOADING"
            Set-Location $Global:Config.FrontendDir
            yarn install --silent
            Set-Location ..
            Write-Status "Dépendances frontend installées" "SUCCESS"
        }
    }
}

function Test-Authentication {
    Write-Header "TEST D'AUTHENTIFICATION"
    
    $backendRunning = Test-ServicePort $Global:Config.BackendPort
    if (-not $backendRunning.Status) {
        Write-Status "Backend inactif - Test d'authentification ignoré" "WARNING"
        return
    }
    
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing -TimeoutSec 10
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-Status "Authentification: Réussie" "SUCCESS"
            
            if ($Detailed) {
                # Test des endpoints principaux
                $headers = @{ Authorization = "Bearer $($authData.data.token)" }
                $endpoints = @(
                    "/dashboard/stats",
                    "/analytics/kpi",
                    "/clients",
                    "/products"
                )
                
                foreach ($endpoint in $endpoints) {
                    try {
                        $response = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)$endpoint" -Headers $headers -UseBasicParsing -TimeoutSec 5
                        Write-Status "Endpoint $endpoint : Opérationnel" "SUCCESS"
                    } catch {
                        Write-Status "Endpoint $endpoint : Échec" "WARNING"
                    }
                }
            }
        } else {
            Write-Status "Authentification: Échec" "ERROR"
        }
    } catch {
        Write-Status "Authentification: Erreur de connexion" "ERROR"
        if ($Detailed) {
            Write-Host "   Erreur: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

function Show-Summary {
    Write-Header "RÉSUMÉ DU DIAGNOSTIC"
    
    $backendStatus = Test-ServicePort $Global:Config.BackendPort
    $frontendStatus = Test-ServicePort $Global:Config.FrontendPort
    $postgresStatus = Test-ServicePort $Global:Config.PostgreSQLPort
    $redisStatus = Test-ServicePort $Global:Config.RedisPort
    
    Write-Host "📊 ÉTAT DES SERVICES:" -ForegroundColor Cyan
    Write-Host "   Backend API (port $($Global:Config.BackendPort)): $(if ($backendStatus.Status) { "✅ ACTIF" } else { "❌ INACTIF" })" -ForegroundColor $(if ($backendStatus.Status) { "Green" } else { "Red" })
    Write-Host "   Frontend Next.js (port $($Global:Config.FrontendPort)): $(if ($frontendStatus.Status) { "✅ ACTIF" } else { "❌ INACTIF" })" -ForegroundColor $(if ($frontendStatus.Status) { "Green" } else { "Red" })
    Write-Host "   PostgreSQL (port $($Global:Config.PostgreSQLPort)): $(if ($postgresStatus.Status) { "✅ ACTIF" } else { "❌ INACTIF" })" -ForegroundColor $(if ($postgresStatus.Status) { "Green" } else { "Red" })
    Write-Host "   Redis (port $($Global:Config.RedisPort)): $(if ($redisStatus.Status) { "✅ ACTIF" } else { "❌ INACTIF" })" -ForegroundColor $(if ($redisStatus.Status) { "Green" } else { "Red" })
    Write-Host ""
    
    # Recommandations
    if (-not $backendStatus.Status -or -not $frontendStatus.Status) {
        Write-Host "🔧 RECOMMANDATIONS:" -ForegroundColor Yellow
        if (-not $backendStatus.Status -and -not $frontendStatus.Status) {
            Write-Host "   Démarrez l'application complète: .\start-app-principal.ps1" -ForegroundColor White
        } elseif (-not $backendStatus.Status) {
            Write-Host "   Démarrez le backend: node $($Global:Config.BackendFile)" -ForegroundColor White
        } elseif (-not $frontendStatus.Status) {
            Write-Host "   Démarrez le frontend: cd $($Global:Config.FrontendDir) && yarn dev" -ForegroundColor White
        }
        
        if (-not $postgresStatus.Status -or -not $redisStatus.Status) {
            Write-Host "   Démarrez les services Docker: docker-compose up -d" -ForegroundColor White
        }
        Write-Host ""
    } else {
        Write-Host "🎉 TOUT FONCTIONNE CORRECTEMENT!" -ForegroundColor Green
        Write-Host "   Accédez à l'application: http://localhost:$($Global:Config.FrontendPort)" -ForegroundColor Cyan
        Write-Host ""
    }
}

# FONCTION PRINCIPALE
function Check-Application {
    # En-tête
    Clear-Host
    Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Blue
    Write-Host "║            🔍 GESTION COMMERCIALE TPE - DIAGNOSTIC              ║" -ForegroundColor Blue
    Write-Host "║                        Version 3.0 - Production                 ║" -ForegroundColor Blue
    Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Blue
    Write-Host ""
    
    if ($Fix) {
        Write-Status "Mode correction automatique activé" "INFO"
    }
    if ($Detailed) {
        Write-Status "Diagnostic détaillé activé" "INFO"
    }
    
    # Exécution des vérifications
    Check-Prerequisites
    Check-Files
    Check-Services
    Check-Processes
    Check-Dependencies
    
    if ($Detailed) {
        Test-Authentication
    }
    
    Show-Summary
}

# EXÉCUTION
Check-Application
