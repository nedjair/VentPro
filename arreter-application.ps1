#!/usr/bin/env pwsh

# =============================================================================
# 🛑 SCRIPT D'ARRÊT - APPLICATION GESTION COMMERCIALE
# =============================================================================
# Ce script arrête proprement tous les services de l'application
# =============================================================================

param(
    [switch]$Force,
    [switch]$KeepDocker
)

# Couleurs pour l'affichage
function Write-Status {
    param([string]$Message, [string]$Type = "INFO")
    $timestamp = Get-Date -Format "HH:mm:ss"
    switch ($Type) {
        "SUCCESS" { Write-Host "[$timestamp] ✅ $Message" -ForegroundColor Green }
        "ERROR"   { Write-Host "[$timestamp] ❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "[$timestamp] ⚠️ $Message" -ForegroundColor Yellow }
        default   { Write-Host "[$timestamp] ℹ️ $Message" -ForegroundColor Cyan }
    }
}

# En-tête
Clear-Host
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Red
Write-Host "║            🛑 GESTION COMMERCIALE TPE - ARRÊT                   ║" -ForegroundColor Red
Write-Host "║                     Arrêt de l'application                       ║" -ForegroundColor Red
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Red
Write-Host ""

Write-Status "Arrêt de l'application en cours..." "INFO"

# Arrêter tous les processus Node.js
Write-Status "Arrêt des processus Node.js..." "INFO"
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    foreach ($process in $nodeProcesses) {
        try {
            if ($Force) {
                Stop-Process -Id $process.Id -Force
            } else {
                $process.CloseMainWindow()
                Start-Sleep -Seconds 2
                if (-not $process.HasExited) {
                    Stop-Process -Id $process.Id -Force
                }
            }
            Write-Status "Processus Node.js arrêté (PID: $($process.Id))" "SUCCESS"
        } catch {
            Write-Status "Erreur lors de l'arrêt du processus $($process.Id)" "WARNING"
        }
    }
} else {
    Write-Status "Aucun processus Node.js en cours d'exécution" "INFO"
}

# Arrêter les processus npm/npx
Write-Status "Arrêt des processus npm/npx..." "INFO"
$npmProcesses = Get-Process -Name "npm", "npx" -ErrorAction SilentlyContinue

if ($npmProcesses) {
    foreach ($process in $npmProcesses) {
        try {
            Stop-Process -Id $process.Id -Force
            Write-Status "Processus npm/npx arrêté (PID: $($process.Id))" "SUCCESS"
        } catch {
            Write-Status "Erreur lors de l'arrêt du processus npm/npx $($process.Id)" "WARNING"
        }
    }
}

# Libérer les ports
Write-Status "Vérification des ports..." "INFO"

$ports = @(3000, 3001)
foreach ($port in $ports) {
    try {
        $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($connections) {
            foreach ($connection in $connections) {
                $processId = $connection.OwningProcess
                if ($processId -and $processId -ne 0) {
                    try {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        Write-Status "Port $port libéré (processus $processId arrêté)" "SUCCESS"
                    } catch {
                        Write-Status "Impossible d'arrêter le processus utilisant le port $port" "WARNING"
                    }
                }
            }
        } else {
            Write-Status "Port $port déjà libre" "SUCCESS"
        }
    } catch {
        Write-Status "Port $port déjà libre" "SUCCESS"
    }
}

# Arrêter Docker (optionnel)
if (-not $KeepDocker) {
    Write-Status "Arrêt des services Docker..." "INFO"
    try {
        docker-compose down
        Write-Status "Services Docker arrêtés" "SUCCESS"
    } catch {
        Write-Status "Erreur lors de l'arrêt des services Docker" "WARNING"
    }
} else {
    Write-Status "Services Docker conservés (option -KeepDocker)" "INFO"
}

# Nettoyer les fichiers temporaires
Write-Status "Nettoyage des fichiers temporaires..." "INFO"

$tempDirs = @("temp", "logs")
foreach ($dir in $tempDirs) {
    if (Test-Path $dir) {
        try {
            Get-ChildItem $dir -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) } | Remove-Item -Force
            Write-Status "Fichiers temporaires nettoyés dans $dir" "SUCCESS"
        } catch {
            Write-Status "Erreur lors du nettoyage de $dir" "WARNING"
        }
    }
}

# Supprimer les fichiers PID
$pidFiles = @(".backend.pid", ".frontend.pid", "backend.pid", "frontend.pid")
foreach ($pidFile in $pidFiles) {
    if (Test-Path $pidFile) {
        try {
            Remove-Item $pidFile -Force
            Write-Status "Fichier PID supprimé: $pidFile" "SUCCESS"
        } catch {
            Write-Status "Erreur lors de la suppression de $pidFile" "WARNING"
        }
    }
}

Write-Host ""
Write-Host "🎉 ARRÊT TERMINÉ" -ForegroundColor Green
Write-Host "================" -ForegroundColor Green

Write-Host "`n📊 Résumé:" -ForegroundColor Yellow
Write-Host "  ✅ Processus Node.js arrêtés" -ForegroundColor Green
Write-Host "  ✅ Ports 3000 et 3001 libérés" -ForegroundColor Green

if (-not $KeepDocker) {
    Write-Host "  ✅ Services Docker arrêtés" -ForegroundColor Green
} else {
    Write-Host "  ℹ️ Services Docker conservés" -ForegroundColor Cyan
}

Write-Host "  ✅ Fichiers temporaires nettoyés" -ForegroundColor Green

Write-Host "`n🔄 Pour redémarrer l'application:" -ForegroundColor Yellow
Write-Host "  .\demarrer-application.ps1" -ForegroundColor Cyan

Write-Host "`n✅ Application arrêtée avec succès!" -ForegroundColor Green
