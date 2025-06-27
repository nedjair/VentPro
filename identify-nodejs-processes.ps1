#!/usr/bin/env pwsh

# Script d'identification des processus Node.js
# Gestion Commerciale TPE

Write-Host "🔍 Identification des Processus Node.js" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Fonction pour formater la durée
function Format-Duration {
    param([DateTime]$StartTime)
    $duration = (Get-Date) - $StartTime
    if ($duration.Days -gt 0) {
        return "$($duration.Days)j $($duration.Hours)h $($duration.Minutes)m"
    } elseif ($duration.Hours -gt 0) {
        return "$($duration.Hours)h $($duration.Minutes)m $($duration.Seconds)s"
    } else {
        return "$($duration.Minutes)m $($duration.Seconds)s"
    }
}

# 1. Lister tous les processus Node.js
Write-Host "`n📋 Processus Node.js détectés:" -ForegroundColor Yellow

$nodeProcesses = Get-WmiObject Win32_Process | Where-Object {$_.Name -eq "node.exe"}

if ($nodeProcesses) {
    $processCount = 0
    foreach ($process in $nodeProcesses) {
        $processCount++
        $pid = $process.ProcessId
        $commandLine = $process.CommandLine
        $creationDate = [Management.ManagementDateTimeConverter]::ToDateTime($process.CreationDate)
        $duration = Format-Duration -StartTime $creationDate
        
        Write-Host "`n🟢 Processus #$processCount" -ForegroundColor Green
        Write-Host "   PID: $pid" -ForegroundColor White
        Write-Host "   Commande: $commandLine" -ForegroundColor Cyan
        Write-Host "   Démarré: $($creationDate.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Gray
        Write-Host "   Durée: $duration" -ForegroundColor Gray
        
        # Identifier le type de processus
        if ($commandLine -like "*production-backend*") {
            Write-Host "   Type: 🚀 BACKEND DE PRODUCTION" -ForegroundColor Green
        } elseif ($commandLine -like "*backend*") {
            Write-Host "   Type: 🔧 Backend" -ForegroundColor Yellow
        } elseif ($commandLine -like "*next*") {
            Write-Host "   Type: 🌐 Frontend Next.js" -ForegroundColor Blue
        } elseif ($commandLine -like "*frontend*") {
            Write-Host "   Type: 🖥️ Frontend" -ForegroundColor Blue
        } else {
            Write-Host "   Type: ❓ Processus Node.js générique" -ForegroundColor Gray
        }
        
        # Vérifier les ports utilisés par ce processus
        Write-Host "   Ports:" -ForegroundColor Yellow
        $ports = netstat -ano | Select-String $pid | ForEach-Object {
            if ($_ -match ":(\d+)\s") {
                $matches[1]
            }
        } | Sort-Object -Unique
        
        if ($ports) {
            foreach ($port in $ports) {
                Write-Host "     - Port $port" -ForegroundColor Cyan
            }
        } else {
            Write-Host "     - Aucun port détecté" -ForegroundColor Gray
        }
    }
    
    Write-Host "`n📊 Résumé: $processCount processus Node.js trouvé(s)" -ForegroundColor Cyan
    
} else {
    Write-Host "❌ Aucun processus Node.js trouvé" -ForegroundColor Red
}

# 2. Vérifier les ports de l'application
Write-Host "`n🌐 Vérification des Ports de l'Application:" -ForegroundColor Yellow

$appPorts = @(
    @{Port=3001; Service="Backend API"; Expected=$true},
    @{Port=3003; Service="Frontend Next.js"; Expected=$false},
    @{Port=5432; Service="PostgreSQL"; Expected=$true},
    @{Port=6379; Service="Redis"; Expected=$true}
)

foreach ($portInfo in $appPorts) {
    $port = $portInfo.Port
    $service = $portInfo.Service
    $expected = $portInfo.Expected
    
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            $status = if ($expected) { "✅" } else { "🟡" }
            Write-Host "   $status Port $port ($service): OUVERT" -ForegroundColor Green
        } else {
            $status = if ($expected) { "❌" } else { "⚪" }
            $color = if ($expected) { "Red" } else { "Gray" }
            Write-Host "   $status Port $port ($service): FERMÉ" -ForegroundColor $color
        }
    } catch {
        Write-Host "   ❌ Port $port ($service): ERREUR" -ForegroundColor Red
    }
}

# 3. Test de connectivité des services
Write-Host "`n🔗 Test de Connectivité des Services:" -ForegroundColor Yellow

# Test Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Backend (3001): ACCESSIBLE" -ForegroundColor Green
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "      Status: $($healthData.status)" -ForegroundColor Cyan
        Write-Host "      Uptime: $([math]::Round($healthData.uptime, 1))s" -ForegroundColor Cyan
        Write-Host "      Database: $($healthData.database)" -ForegroundColor Cyan
        Write-Host "      Redis: $($healthData.redis)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "   ❌ Backend (3001): INACCESSIBLE" -ForegroundColor Red
}

# Test Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Frontend (3003): ACCESSIBLE" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Frontend (3003): INACCESSIBLE" -ForegroundColor Red
}

# 4. Recommandations
Write-Host "`n💡 Recommandations:" -ForegroundColor Yellow

if ($nodeProcesses) {
    $backendRunning = $nodeProcesses | Where-Object {$_.CommandLine -like "*production-backend*"}
    $frontendRunning = $nodeProcesses | Where-Object {$_.CommandLine -like "*next*"}
    
    if ($backendRunning) {
        Write-Host "   ✅ Backend de production détecté et fonctionnel" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Aucun backend de production détecté" -ForegroundColor Yellow
        Write-Host "      Commande: node production-backend.js" -ForegroundColor Cyan
    }
    
    if (-not $frontendRunning) {
        Write-Host "   ⚠️ Aucun frontend Next.js détecté" -ForegroundColor Yellow
        Write-Host "      Commande: .\start-frontend-3003.ps1" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠️ Aucun processus Node.js détecté" -ForegroundColor Yellow
    Write-Host "      Démarrer l'application: .\start-app-principal-fixed.ps1" -ForegroundColor Cyan
}

Write-Host "`n🎯 URLs d'Accès:" -ForegroundColor Yellow
Write-Host "   Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend Next.js: http://localhost:3003" -ForegroundColor Cyan
Write-Host "   Interface Simple: file:///D:/Gestion%20Commerciale/frontend-simple.html" -ForegroundColor Cyan
Write-Host "   Health Check: http://localhost:3001/health" -ForegroundColor Cyan

Write-Host "`n✅ Analyse terminée" -ForegroundColor Green
