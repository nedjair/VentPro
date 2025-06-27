#!/usr/bin/env pwsh

# Script d'arrêt complet - PRODUCTION UNIQUEMENT
# Gestion Commerciale TPE

param(
    [switch]$KeepDocker,
    [switch]$Force
)

Write-Host "🛑 ARRÊT PRODUCTION COMPLET" -ForegroundColor Red
Write-Host "===========================" -ForegroundColor Red

# Fonction de logging
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

# 1. Arrêter tous les processus Node.js
Write-Status "Arrêt des processus Node.js..."

$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($process in $nodeProcesses) {
        try {
            Write-Status "Arrêt du processus Node.js (PID: $($process.Id))" "INFO"
            $process.Kill()
            $process.WaitForExit(5000)
            Write-Status "Processus $($process.Id) arrêté" "SUCCESS"
        } catch {
            Write-Status "Erreur lors de l'arrêt du processus $($process.Id)" "ERROR"
            if ($Force) {
                taskkill /PID $process.Id /F
            }
        }
    }
} else {
    Write-Status "Aucun processus Node.js trouvé" "INFO"
}

# 2. Nettoyer les ports
Write-Status "Vérification des ports..."

$ports = @(3001, 3003)
foreach ($port in $ports) {
    $portCheck = netstat -ano | Select-String ":$port"
    if ($portCheck) {
        $pid = ($portCheck -split '\s+')[-1]
        Write-Status "Port $port encore utilisé par PID $pid" "WARNING"
        if ($Force) {
            try {
                taskkill /PID $pid /F
                Write-Status "Processus $pid arrêté de force" "SUCCESS"
            } catch {
                Write-Status "Impossible d'arrêter le processus $pid" "ERROR"
            }
        }
    } else {
        Write-Status "Port $port libéré" "SUCCESS"
    }
}

# 3. Nettoyer les fichiers temporaires
Write-Status "Nettoyage des fichiers temporaires..."

if (Test-Path "frontend-nextjs-production\.next") {
    Remove-Item -Recurse -Force "frontend-nextjs-production\.next" -ErrorAction SilentlyContinue
    Write-Status "Cache Next.js nettoyé" "SUCCESS"
}

# 4. Arrêter Docker (optionnel)
if (-not $KeepDocker) {
    Write-Status "Arrêt des services Docker..."
    try {
        docker-compose down
        Write-Status "Services Docker arrêtés" "SUCCESS"
    } catch {
        Write-Status "Erreur lors de l'arrêt de Docker: $($_.Exception.Message)" "ERROR"
    }
} else {
    Write-Status "Services Docker conservés" "INFO"
}

# 5. Vérification finale
Write-Status "Vérification finale..."

$remainingNodes = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($remainingNodes) {
    Write-Status "$($remainingNodes.Count) processus Node.js encore actifs" "WARNING"
    if ($Force) {
        $remainingNodes | Stop-Process -Force
        Write-Status "Tous les processus Node.js arrêtés de force" "SUCCESS"
    }
} else {
    Write-Status "Tous les processus Node.js arrêtés" "SUCCESS"
}

Write-Host "`n✅ ARRÊT TERMINÉ" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green

Write-Host "`nPour redémarrer l'application:" -ForegroundColor Yellow
Write-Host "  .\start-production-complete.ps1" -ForegroundColor Cyan
