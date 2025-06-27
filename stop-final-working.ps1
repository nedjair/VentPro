# =============================================================================
# Script d'Arrêt Final - Gestion Commerciale TPE
# =============================================================================
Write-Host "🛑 ARRET APPLICATION FINALE GESTION COMMERCIALE TPE" -ForegroundColor Red
Write-Host "====================================================" -ForegroundColor Red
Write-Host ""

function Write-Step {
    param([string]$Message)
    Write-Host "▶️  $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

# 1. Arrêter le backend final
Write-Step "Arrêt du backend Fastify final..."
if (Test-Path ".backend-final.pid") {
    try {
        $backendPid = Get-Content ".backend-final.pid"
        Stop-Process -Id $backendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".backend-final.pid" -ErrorAction SilentlyContinue
        Write-Success "Backend Fastify final arrêté"
    }
    catch {
        Write-Host "⚠️  Erreur lors de l'arrêt du backend" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Aucun PID backend final trouvé" -ForegroundColor Gray
}

# 2. Arrêter le frontend final
Write-Step "Arrêt du frontend final..."
if (Test-Path ".frontend-final.pid") {
    try {
        $frontendPid = Get-Content ".frontend-final.pid"
        Stop-Process -Id $frontendPid -Force -ErrorAction SilentlyContinue
        Remove-Item ".frontend-final.pid" -ErrorAction SilentlyContinue
        Write-Success "Frontend final arrêté"
    }
    catch {
        Write-Host "⚠️  Erreur lors de l'arrêt du frontend" -ForegroundColor Yellow
    }
} else {
    Write-Host "ℹ️  Aucun PID frontend final trouvé" -ForegroundColor Gray
}

# 3. Arrêter tous les processus Node.js restants
Write-Step "Nettoyage des processus Node.js..."
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Success "Processus Node.js nettoyés"
} else {
    Write-Host "ℹ️  Aucun processus Node.js trouvé" -ForegroundColor Gray
}

# 4. Arrêter Docker Compose
Write-Step "Arrêt des services Docker..."
try {
    docker-compose down
    Write-Success "Services Docker arrêtés"
}
catch {
    Write-Host "⚠️  Erreur lors de l'arrêt de Docker Compose" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ APPLICATION FINALE COMPLETEMENT ARRETEE" -ForegroundColor Green
Write-Host ""

Write-Host "📊 VERIFICATION DES PORTS :" -ForegroundColor Cyan
Write-Host "  Port 3001 (Backend)  : $(if (Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet) { '🔴 Occupé' } else { '✅ Libre' })" -ForegroundColor White
Write-Host "  Port 3002 (Frontend) : $(if (Test-NetConnection -ComputerName localhost -Port 3002 -InformationLevel Quiet) { '🔴 Occupé' } else { '✅ Libre' })" -ForegroundColor White
Write-Host "  Port 5432 (PostgreSQL): $(if (Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet) { '🔴 Occupé' } else { '✅ Libre' })" -ForegroundColor White
Write-Host "  Port 6379 (Redis)    : $(if (Test-NetConnection -ComputerName localhost -Port 6379 -InformationLevel Quiet) { '🔴 Occupé' } else { '✅ Libre' })" -ForegroundColor White
Write-Host ""
