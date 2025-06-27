# =============================================================================
# ⚡ SCRIPT DE DÉMARRAGE RAPIDE - GESTION COMMERCIALE TPE
# Version: 3.0 - Usage Quotidien
# 
# DESCRIPTION:
# Script optimisé pour un démarrage rapide quotidien de l'application.
# Assume que l'environnement est déjà configuré et les dépendances installées.
# 
# USAGE:
# .\start-quick.ps1                            # Démarrage rapide standard
# .\start-quick.ps1 -SkipDocker                # Sans redémarrer Docker
# .\start-quick.ps1 -Force                     # Forcer le redémarrage
# =============================================================================

param(
    [switch]$SkipDocker,      # Ignorer le démarrage Docker
    [switch]$Force            # Forcer le redémarrage
)

# Configuration
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3003
$BACKEND_FILE = "production-backend.js"
$FRONTEND_DIR = "frontend-nextjs-production"

function Write-Quick {
    param([string]$Message, [string]$Color = "White")
    Write-Host "[QUICK] $Message" -ForegroundColor $Color
}

function Test-Port {
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

# En-tête
Clear-Host
Write-Host "=== DÉMARRAGE RAPIDE - GESTION COMMERCIALE TPE ===" -ForegroundColor Yellow
Write-Host ""

# Nettoyage rapide si Force
if ($Force) {
    Write-Quick "Nettoyage des processus existants..." "Yellow"
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Vérification rapide des prérequis
if (-not (Test-Path $BACKEND_FILE)) {
    Write-Quick "[ERR] Fichier backend manquant: $BACKEND_FILE" "Red"
    exit 1
}

if (-not (Test-Path $FRONTEND_DIR)) {
    Write-Quick "[ERR] Dossier frontend manquant: $FRONTEND_DIR" "Red"
    exit 1
}

# Docker (si nécessaire)
if (-not $SkipDocker) {
    Write-Quick "Vérification des services Docker..." "Cyan"
    try {
        $runningServices = docker-compose ps --services --filter "status=running" 2>$null
        if (-not $runningServices -or $runningServices.Count -eq 0) {
            Write-Quick "Démarrage des services Docker..." "Yellow"
            docker-compose up -d
            Start-Sleep -Seconds 15
        }
        Write-Quick "[OK] Services Docker prêts" "Green"
    } catch {
        Write-Quick "[WARN] Docker non disponible - Continuons..." "Yellow"
    }
}

# Démarrage du Backend
Write-Quick "Démarrage du backend..." "Cyan"

if (Test-Port $BACKEND_PORT) {
    try {
        $health = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 3
        if ($health.StatusCode -eq 200) {
            Write-Quick "[OK] Backend déjà opérationnel" "Green"
        } else {
            throw "Backend non responsive"
        }
    } catch {
        Write-Quick "Redémarrage du backend..." "Yellow"
        $processId = (Get-NetTCPConnection -LocalPort $BACKEND_PORT -ErrorAction SilentlyContinue).OwningProcess
        if ($processId) {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
        
        # Créer logs si nécessaire
        if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
        
        # Démarrer le backend
        $backendProcess = Start-Process -FilePath "node" -ArgumentList $BACKEND_FILE -PassThru -WindowStyle Hidden -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend-error.log"
        $backendProcess.Id | Out-File -FilePath ".backend.pid"
        
        # Attendre l'initialisation (max 30 secondes)
        $attempt = 0
        while ($attempt -lt 10) {
            Start-Sleep -Seconds 3
            try {
                $health = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 3
                if ($health.StatusCode -eq 200) {
                    Write-Quick "[OK] Backend opérationnel" "Green"
                    break
                }
            } catch {
                $attempt++
                Write-Host "." -NoNewline -ForegroundColor Yellow
            }
        }

        if ($attempt -eq 10) {
            Write-Quick "[ERR] Échec du démarrage du backend" "Red"
            exit 1
        }
    }
} else {
    # Créer logs si nécessaire
    if (-not (Test-Path "logs")) { New-Item -ItemType Directory -Path "logs" | Out-Null }
    
    # Démarrer le backend
    $backendProcess = Start-Process -FilePath "node" -ArgumentList $BACKEND_FILE -PassThru -WindowStyle Hidden -RedirectStandardOutput "logs\backend.log" -RedirectStandardError "logs\backend-error.log"
    $backendProcess.Id | Out-File -FilePath ".backend.pid"
    
    # Attendre l'initialisation
    $attempt = 0
    while ($attempt -lt 10) {
        Start-Sleep -Seconds 3
        try {
            $health = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/health" -UseBasicParsing -TimeoutSec 3
            if ($health.StatusCode -eq 200) {
                Write-Quick "[OK] Backend opérationnel" "Green"
                break
            }
        } catch {
            $attempt++
            Write-Host "." -NoNewline -ForegroundColor Yellow
        }
    }

    if ($attempt -eq 10) {
        Write-Quick "[ERR] Échec du démarrage du backend" "Red"
        exit 1
    }
}

# Configuration rapide du frontend
Write-Quick "Configuration du frontend..." "Cyan"
Set-Location $FRONTEND_DIR

# Vérifier les dépendances critiques
if (-not (Test-Path "node_modules")) {
    Write-Quick "Installation rapide des dépendances..." "Yellow"
    yarn install --silent
}

# Configuration .env.local
@"
NEXT_PUBLIC_API_BASE_URL=http://localhost:$BACKEND_PORT
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT
NODE_ENV=development
"@ | Out-File -FilePath ".env.local" -Encoding UTF8

Set-Location ..

# Informations finales
Write-Host ""
Write-Quick "[OK] APPLICATION PRÊTE!" "Green"
Write-Host ""
Write-Host "ACCÈS RAPIDE:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:$FRONTEND_PORT" -ForegroundColor White
Write-Host "   Backend:  http://localhost:$BACKEND_PORT" -ForegroundColor White
Write-Host ""
Write-Host "CONNEXION:" -ForegroundColor Cyan
Write-Host "   Email: admin@demo-tpe.fr" -ForegroundColor White
Write-Host "   Mot de passe: demo123" -ForegroundColor White
Write-Host ""

# Démarrage du frontend
Write-Quick "Démarrage de Next.js..." "Cyan"
Write-Host ""
Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
Write-Host "Ouvrez: http://localhost:$FRONTEND_PORT" -ForegroundColor Cyan
Write-Host ""

Set-Location $FRONTEND_DIR
try {
    yarn dev
} catch {
    Write-Quick "[ERR] Échec du démarrage du frontend" "Red"
} finally {
    Set-Location ..
}

Write-Host ""
Write-Quick "Application arrêtée" "Yellow"
Write-Host "Pour redémarrer: .\start-quick.ps1" -ForegroundColor Cyan
