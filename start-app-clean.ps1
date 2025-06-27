# =============================================================================
# SCRIPT PRINCIPAL DE DEMARRAGE - GESTION COMMERCIALE TPE
# Version: 3.0 - Production Complete (Sans caracteres speciaux)
# 
# DESCRIPTION:
# Ce script demarre automatiquement TOUS les composants necessaires :
# - Services Docker (PostgreSQL 16 + Redis 7 + Adminer + Redis Commander)
# - Backend Fastify (production-backend.js sur port 3001)
# - Frontend Next.js (frontend-nextjs-production sur port 3003)
# - Configuration automatique de la base de donnees
# - Tests de connectivite et health checks
# 
# USAGE:
# .\start-app-clean.ps1                        # Demarrage complet
# .\start-app-clean.ps1 -Quick                 # Demarrage rapide (skip tests)
# .\start-app-clean.ps1 -SkipDocker            # Sans Docker (services externes)
# .\start-app-clean.ps1 -Verbose               # Affichage detaille
# =============================================================================

param(
    [switch]$Quick,           # Demarrage rapide sans tests approfondis
    [switch]$SkipDocker,      # Ignorer le demarrage Docker
    [switch]$Verbose,         # Affichage detaille
    [switch]$Force            # Forcer le redemarrage
)

# Configuration globale
$Global:Config = @{
    BackendPort = 3001
    FrontendPort = 3003
    BackendFile = "production-backend.js"
    FrontendDir = "frontend-nextjs-production"
    MaxWaitAttempts = 20
    WaitInterval = 3
    LogsDir = "logs"
}

# Couleurs et affichage
function Write-Status {
    param(
        [string]$Message,
        [ValidateSet("SUCCESS", "ERROR", "WARNING", "INFO", "LOADING", "STEP")]
        [string]$Type = "INFO"
    )
    
    $icons = @{
        "SUCCESS" = "[OK]"; "ERROR" = "[ERR]"; "WARNING" = "[WARN]"; 
        "INFO" = "[INFO]"; "LOADING" = "[...]"; "STEP" = "[STEP]"
    }
    
    $colors = @{
        "SUCCESS" = "Green"; "ERROR" = "Red"; "WARNING" = "Yellow";
        "INFO" = "Cyan"; "LOADING" = "Yellow"; "STEP" = "Magenta"
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

function Stop-ExistingServices {
    if ($Force) {
        Write-Status "Arret force des services existants..." "LOADING"
        Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
        Write-Status "Services arretes" "SUCCESS"
    }
}

function Test-Prerequisites {
    Write-Header "VERIFICATION DES PREREQUIS"
    
    # Node.js
    try {
        $nodeVersion = node --version
        Write-Status "Node.js: $nodeVersion" "SUCCESS"
    } catch {
        Write-Status "Node.js non installe" "ERROR"
        Write-Host "Installez Node.js 20+ depuis: https://nodejs.org/" -ForegroundColor Gray
        exit 1
    }
    
    # Yarn
    try {
        $yarnVersion = yarn --version
        Write-Status "Yarn: v$yarnVersion" "SUCCESS"
    } catch {
        Write-Status "Installation de Yarn..." "LOADING"
        npm install -g yarn
        Write-Status "Yarn installe" "SUCCESS"
    }
    
    # Docker (si requis)
    if (-not $SkipDocker) {
        try {
            $dockerVersion = docker --version
            Write-Status "Docker: $dockerVersion" "SUCCESS"
            
            docker ps | Out-Null
            if ($LASTEXITCODE -ne 0) {
                Write-Status "Docker non demarre" "ERROR"
                Write-Host "Demarrez Docker Desktop et reessayez" -ForegroundColor Gray
                exit 1
            }
        } catch {
            Write-Status "Docker non installe" "ERROR"
            Write-Host "Installez Docker Desktop ou utilisez -SkipDocker" -ForegroundColor Gray
            exit 1
        }
    }
    
    # Fichiers requis
    if (-not (Test-Path $Global:Config.BackendFile)) {
        Write-Status "Fichier backend manquant: $($Global:Config.BackendFile)" "ERROR"
        exit 1
    }
    
    if (-not (Test-Path $Global:Config.FrontendDir)) {
        Write-Status "Dossier frontend manquant: $($Global:Config.FrontendDir)" "ERROR"
        exit 1
    }
    
    Write-Status "Tous les prerequis sont satisfaits" "SUCCESS"
}

function Start-DockerServices {
    if ($SkipDocker) {
        Write-Status "Services Docker ignores (option -SkipDocker)" "INFO"
        return
    }
    
    Write-Header "SERVICES DOCKER"
    
    # Verifier si les services sont deja actifs
    $runningServices = docker-compose ps --services --filter "status=running" 2>$null
    if ($runningServices -and $runningServices.Count -gt 0) {
        Write-Status "Services Docker deja actifs" "SUCCESS"
        return
    }
    
    Write-Status "Demarrage des services Docker..." "LOADING"
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Status "Services Docker demarres" "SUCCESS"
        Write-Status "Attente de l'initialisation (20s)..." "LOADING"
        Start-Sleep -Seconds 20
        
        # Verifier la sante des services
        $healthyServices = docker-compose ps --filter "health=healthy" 2>$null
        if ($healthyServices) {
            Write-Status "Services Docker operationnels" "SUCCESS"
        } else {
            Write-Status "Services en cours d'initialisation..." "WARNING"
        }
    } else {
        Write-Status "Echec du demarrage Docker" "ERROR"
        exit 1
    }
}

function Install-Dependencies {
    Write-Header "INSTALLATION DES DEPENDANCES"
    
    # Dependances racine
    if (Test-Path "package.json") {
        if (-not (Test-Path "node_modules")) {
            Write-Status "Installation des dependances racine..." "LOADING"
            yarn install --silent
            Write-Status "Dependances racine installees" "SUCCESS"
        } else {
            Write-Status "Dependances racine deja installees" "SUCCESS"
        }
    }
    
    # Dependances frontend
    Set-Location $Global:Config.FrontendDir
    if (-not (Test-Path "node_modules")) {
        Write-Status "Installation des dependances frontend..." "LOADING"
        yarn install --silent
        Write-Status "Dependances frontend installees" "SUCCESS"
    } else {
        Write-Status "Dependances frontend deja installees" "SUCCESS"
    }
    
    # Verifier Recharts pour Analytics
    if (-not (Test-Path "node_modules/recharts")) {
        Write-Status "Installation de Recharts (Analytics)..." "LOADING"
        yarn add recharts --silent
        Write-Status "Recharts installe" "SUCCESS"
    }
    
    Set-Location ..
}

function Start-Backend {
    Write-Header "DEMARRAGE DU BACKEND"
    
    # Verifier si deja actif
    if (Test-ServicePort $Global:Config.BackendPort) {
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/health" -UseBasicParsing -TimeoutSec 3
            if ($healthResponse.StatusCode -eq 200) {
                Write-Status "Backend deja operationnel" "SUCCESS"
                return $true
            }
        } catch {
            Write-Status "Port occupe - Nettoyage..." "WARNING"
            $processId = (Get-NetTCPConnection -LocalPort $Global:Config.BackendPort -ErrorAction SilentlyContinue).OwningProcess
            if ($processId) {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 2
            }
        }
    }
    
    # Creer le dossier logs
    if (-not (Test-Path $Global:Config.LogsDir)) {
        New-Item -ItemType Directory -Path $Global:Config.LogsDir | Out-Null
    }
    
    Write-Status "Demarrage du backend de production..." "LOADING"
    
    # Demarrer le backend
    $backendProcess = Start-Process -FilePath "node" -ArgumentList $Global:Config.BackendFile -PassThru -WindowStyle Hidden -RedirectStandardOutput "$($Global:Config.LogsDir)\backend.log" -RedirectStandardError "$($Global:Config.LogsDir)\backend-error.log"
    
    if ($backendProcess) {
        Write-Status "Backend demarre: PID $($backendProcess.Id)" "SUCCESS"
        $backendProcess.Id | Out-File -FilePath ".backend.pid"
        
        # Attendre l'initialisation
        Write-Status "Attente de l'initialisation du backend..." "LOADING"
        $attempt = 0
        $backendReady = $false
        
        while ($attempt -lt $Global:Config.MaxWaitAttempts -and -not $backendReady) {
            Start-Sleep -Seconds $Global:Config.WaitInterval
            try {
                $healthResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/health" -UseBasicParsing -TimeoutSec 3
                if ($healthResponse.StatusCode -eq 200) {
                    $backendReady = $true
                    Write-Status "Backend operationnel" "SUCCESS"
                }
            } catch {
                $attempt++
                if ($Verbose) {
                    Write-Host "   Tentative $attempt/$($Global:Config.MaxWaitAttempts)..." -ForegroundColor Gray
                }
            }
        }
        
        if (-not $backendReady) {
            Write-Status "Echec de l'initialisation du backend" "ERROR"
            Write-Host "Verifiez les logs: Get-Content $($Global:Config.LogsDir)\backend-error.log" -ForegroundColor Gray
            return $false
        }
        
        return $true
    } else {
        Write-Status "Echec du demarrage du backend" "ERROR"
        return $false
    }
}

function Test-BackendEndpoints {
    if ($Quick) {
        Write-Status "Tests rapides ignores (option -Quick)" "INFO"
        return
    }
    
    Write-Header "VALIDATION DU BACKEND"
    
    # Test d'authentification
    Write-Status "Test d'authentification..." "LOADING"
    try {
        $loginBody = @{
            email = "admin@demo-tpe.fr"
            password = "demo123"
        } | ConvertTo-Json
        
        $authResponse = Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)/auth/login" -Method POST -ContentType "application/json" -Body $loginBody -UseBasicParsing
        $authData = $authResponse.Content | ConvertFrom-Json
        
        if ($authData.success) {
            Write-Status "Authentification reussie" "SUCCESS"
            
            # Test des endpoints principaux
            $headers = @{ Authorization = "Bearer $($authData.data.token)" }
            $endpoints = @(
                @{ Name = "Dashboard Stats"; Url = "/dashboard/stats" },
                @{ Name = "Analytics KPI"; Url = "/analytics/kpi" },
                @{ Name = "Clients"; Url = "/clients" },
                @{ Name = "Products"; Url = "/products" }
            )
            
            foreach ($endpoint in $endpoints) {
                try {
                    Invoke-WebRequest -Uri "http://localhost:$($Global:Config.BackendPort)$($endpoint.Url)" -Headers $headers -UseBasicParsing -TimeoutSec 5 | Out-Null
                    Write-Status "$($endpoint.Name): Operationnel" "SUCCESS"
                } catch {
                    Write-Status "$($endpoint.Name): Echec" "WARNING"
                }
            }
        } else {
            Write-Status "Echec de l'authentification" "ERROR"
        }
    } catch {
        Write-Status "Erreur lors des tests d'authentification" "WARNING"
    }
}

# FONCTION PRINCIPALE
function Start-Application {
    # En-tete
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "         GESTION COMMERCIALE TPE - DEMARRAGE PRINCIPAL          " -ForegroundColor Cyan
    Write-Host "                    Version 3.0 - Production                   " -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Status "Backend: $($Global:Config.BackendFile) (Port $($Global:Config.BackendPort))" "INFO"
    Write-Status "Frontend: $($Global:Config.FrontendDir) (Port $($Global:Config.FrontendPort))" "INFO"
    Write-Host ""

    # Execution sequentielle
    Stop-ExistingServices
    Test-Prerequisites
    Start-DockerServices
    Install-Dependencies

    if (Start-Backend) {
        Test-BackendEndpoints

        # Configuration du frontend
        Write-Header "CONFIGURATION DU FRONTEND"
        Set-Location $Global:Config.FrontendDir

        # Creer/Mettre a jour .env.local
        $envContent = @"
NEXT_PUBLIC_API_BASE_URL=http://localhost:$($Global:Config.BackendPort)
NEXT_PUBLIC_API_URL=http://localhost:$($Global:Config.BackendPort)
NODE_ENV=development
"@
        $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Status "Configuration frontend mise a jour" "SUCCESS"

        Set-Location ..

        # Informations finales
        Write-Header "APPLICATION PRETE"
        Write-Host ""
        Write-Host "DEMARRAGE REUSSI!" -ForegroundColor Green
        Write-Host ""
        Write-Host "FONCTIONNALITES DISPONIBLES:" -ForegroundColor Magenta
        Write-Host "   Dashboard avec KPI temps reel" -ForegroundColor White
        Write-Host "   Analytics avancees (Phase 5)" -ForegroundColor White
        Write-Host "   Gestion clients/produits/commandes" -ForegroundColor White
        Write-Host "   Facturation et rapports" -ForegroundColor White
        Write-Host "   Graphiques interactifs (Recharts)" -ForegroundColor White
        Write-Host ""
        Write-Host "URLS D'ACCES:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:$($Global:Config.FrontendPort)" -ForegroundColor White
        Write-Host "   Backend API: http://localhost:$($Global:Config.BackendPort)" -ForegroundColor White
        Write-Host "   Health Check: http://localhost:$($Global:Config.BackendPort)/health" -ForegroundColor White
        if (-not $SkipDocker) {
            Write-Host "   PostgreSQL: http://localhost:8080 (Adminer)" -ForegroundColor White
            Write-Host "   Redis: http://localhost:8081 (Redis Commander)" -ForegroundColor White
        }
        Write-Host ""
        Write-Host "IDENTIFIANTS DE TEST:" -ForegroundColor Cyan
        Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
        Write-Host "   Mot de passe: demo123" -ForegroundColor White
        Write-Host ""

        # Demarrage du frontend
        Write-Header "DEMARRAGE DU FRONTEND"
        Write-Status "Lancement de Next.js..." "LOADING"
        Write-Host ""
        Write-Host "Appuyez sur Ctrl+C pour arreter l'application" -ForegroundColor Yellow
        Write-Host "Une fois demarre, ouvrez: http://localhost:$($Global:Config.FrontendPort)" -ForegroundColor Cyan
        Write-Host ""

        # Demarrer le frontend
        Set-Location $Global:Config.FrontendDir
        try {
            yarn dev
        } catch {
            Write-Status "Echec du demarrage du frontend" "ERROR"
        } finally {
            Set-Location ..
        }
    } else {
        Write-Status "Echec du demarrage du backend - Arret" "ERROR"
        exit 1
    }
}

# EXECUTION
Start-Application
