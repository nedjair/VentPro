#!/usr/bin/env pwsh
# Script de monitoring en temps réel des performances Docker
# Créé pour surveiller les performances après optimisation

param(
    [int]$RefreshInterval = 5,
    [switch]$Export,
    [string]$ExportPath = "docker-performance-report.json"
)

Write-Host "📊 DOCKER DESKTOP - MONITORING PERFORMANCES" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Rafraîchissement toutes les $RefreshInterval secondes" -ForegroundColor Yellow
Write-Host "Appuyez sur Ctrl+C pour arrêter`n" -ForegroundColor Yellow

$performanceData = @()
$startTime = Get-Date

try {
    while ($true) {
        Clear-Host
        $currentTime = Get-Date
        $uptime = $currentTime - $startTime
        
        Write-Host "📊 DOCKER DESKTOP - MONITORING PERFORMANCES" -ForegroundColor Cyan
        Write-Host "=============================================" -ForegroundColor Cyan
        Write-Host "⏰ Temps de monitoring: $($uptime.ToString('hh\:mm\:ss'))" -ForegroundColor Green
        Write-Host "🕐 Dernière mise à jour: $($currentTime.ToString('HH:mm:ss'))`n" -ForegroundColor Green

        # 1. État des conteneurs
        Write-Host "🔍 ÉTAT DES CONTENEURS:" -ForegroundColor Yellow
        $containers = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Out-String
        Write-Host $containers

        # 2. Statistiques en temps réel
        Write-Host "📈 UTILISATION DES RESSOURCES:" -ForegroundColor Yellow
        $stats = docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.NetIO}}\t{{.BlockIO}}"
        Write-Host $stats

        # 3. Utilisation disque Docker
        Write-Host "`n💾 UTILISATION DISQUE DOCKER:" -ForegroundColor Yellow
        $diskUsage = docker system df --format "table {{.Type}}\t{{.Total}}\t{{.Active}}\t{{.Size}}\t{{.Reclaimable}}"
        Write-Host $diskUsage

        # 4. Analyse des logs critiques
        Write-Host "`n🚨 VÉRIFICATION DES ERREURS RÉCENTES:" -ForegroundColor Yellow
        $containers = @("gestion-backend", "gestion-postgres", "gestion-redis", "gestion-frontend")
        
        foreach ($container in $containers) {
            try {
                $logs = docker logs $container --since 30s --tail 5 2>&1
                if ($logs -and $logs -match "error|Error|ERROR|warning|Warning|WARN") {
                    Write-Host "⚠️  $container : Erreurs détectées dans les logs récents" -ForegroundColor Red
                    $logs | Select-String "error|Error|ERROR|warning|Warning|WARN" | ForEach-Object {
                        Write-Host "   $_" -ForegroundColor DarkRed
                    }
                }
            } catch {
                Write-Host "❌ $container : Conteneur non trouvé ou arrêté" -ForegroundColor Red
            }
        }

        # 5. Métriques de performance système
        Write-Host "`n🖥️  MÉTRIQUES SYSTÈME WINDOWS:" -ForegroundColor Yellow
        $memory = Get-CimInstance Win32_OperatingSystem
        $cpu = Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object Size, FreeSpace

        $memoryUsed = [math]::Round(($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB, 2)
        $memoryTotal = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
        $memoryPercent = [math]::Round(($memoryUsed / $memoryTotal) * 100, 1)
        
        $diskUsedGB = [math]::Round(($disk.Size - $disk.FreeSpace) / 1GB, 2)
        $diskTotalGB = [math]::Round($disk.Size / 1GB, 2)
        $diskPercent = [math]::Round(($diskUsedGB / $diskTotalGB) * 100, 1)

        Write-Host "CPU Usage: $([math]::Round($cpu.Average, 1))%" -ForegroundColor $(if($cpu.Average -gt 80) {"Red"} elseif($cpu.Average -gt 60) {"Yellow"} else {"Green"})
        Write-Host "RAM Usage: $memoryUsed GB / $memoryTotal GB ($memoryPercent%)" -ForegroundColor $(if($memoryPercent -gt 80) {"Red"} elseif($memoryPercent -gt 60) {"Yellow"} else {"Green"})
        Write-Host "Disk Usage: $diskUsedGB GB / $diskTotalGB GB ($diskPercent%)" -ForegroundColor $(if($diskPercent -gt 90) {"Red"} elseif($diskPercent -gt 80) {"Yellow"} else {"Green"})

        # 6. Recommandations en temps réel
        Write-Host "`n💡 RECOMMANDATIONS:" -ForegroundColor Green
        if ($memoryPercent -gt 80) {
            Write-Host "⚠️  Mémoire système élevée. Considérez fermer d'autres applications." -ForegroundColor Yellow
        }
        if ($cpu.Average -gt 80) {
            Write-Host "⚠️  CPU élevé. Vérifiez les processus en arrière-plan." -ForegroundColor Yellow
        }
        if ($diskPercent -gt 90) {
            Write-Host "⚠️  Espace disque faible. Nettoyez avec 'docker system prune'." -ForegroundColor Yellow
        }

        # 7. Collecte des données pour export
        if ($Export) {
            $currentData = @{
                Timestamp = $currentTime
                SystemCPU = $cpu.Average
                SystemMemoryPercent = $memoryPercent
                SystemDiskPercent = $diskPercent
                DockerContainers = docker ps --format "{{.Names}},{{.Status}}" | ConvertFrom-Csv -Header "Name","Status"
            }
            $performanceData += $currentData
        }

        # 8. Tests de connectivité rapides
        Write-Host "`n🔗 TESTS DE CONNECTIVITÉ:" -ForegroundColor Yellow
        $testResults = @()
        $endpoints = @(
            @{Name="Frontend"; URL="http://localhost:3000"},
            @{Name="Backend"; URL="http://localhost:3001/health"},
            @{Name="Database"; URL="localhost:5432"},
            @{Name="Redis"; URL="localhost:6379"}
        )

        foreach ($endpoint in $endpoints) {
            try {
                if ($endpoint.URL -like "http*") {
                    $response = Invoke-WebRequest -Uri $endpoint.URL -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
                    Write-Host "✅ $($endpoint.Name): OK ($($response.StatusCode))" -ForegroundColor Green
                } else {
                    $tcpTest = Test-NetConnection -ComputerName "localhost" -Port ($endpoint.URL -split ':')[1] -WarningAction SilentlyContinue
                    if ($tcpTest.TcpTestSucceeded) {
                        Write-Host "✅ $($endpoint.Name): OK" -ForegroundColor Green
                    } else {
                        Write-Host "❌ $($endpoint.Name): Inaccessible" -ForegroundColor Red
                    }
                }
            } catch {
                Write-Host "❌ $($endpoint.Name): Erreur" -ForegroundColor Red
            }
        }

        Write-Host "`n⏳ Prochaine mise à jour dans $RefreshInterval secondes..." -ForegroundColor Gray
        Start-Sleep -Seconds $RefreshInterval
    }
} catch {
    Write-Host "`n⏹️  Monitoring arrêté." -ForegroundColor Yellow
} finally {
    if ($Export -and $performanceData.Count -gt 0) {
        $performanceData | ConvertTo-Json -Depth 3 | Out-File -FilePath $ExportPath -Encoding UTF8
        Write-Host "📋 Données exportées vers: $ExportPath" -ForegroundColor Green
    }
}