Write-Host "Identification des Processus Node.js" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# 1. Lister les processus Node.js
Write-Host "`nProcessus Node.js detectes:" -ForegroundColor Yellow

$nodeProcesses = Get-WmiObject Win32_Process | Where-Object {$_.Name -eq "node.exe"}

if ($nodeProcesses) {
    $processCount = 0
    foreach ($process in $nodeProcesses) {
        $processCount++
        $pid = $process.ProcessId
        $commandLine = $process.CommandLine
        $creationDate = [Management.ManagementDateTimeConverter]::ToDateTime($process.CreationDate)
        
        Write-Host "`nProcessus #$processCount" -ForegroundColor Green
        Write-Host "  PID: $pid" -ForegroundColor White
        Write-Host "  Commande: $commandLine" -ForegroundColor Cyan
        Write-Host "  Demarre: $($creationDate.ToString('dd/MM/yyyy HH:mm:ss'))" -ForegroundColor Gray
        
        # Identifier le type
        if ($commandLine -like "*production-backend*") {
            Write-Host "  Type: BACKEND DE PRODUCTION" -ForegroundColor Green
        } elseif ($commandLine -like "*backend*") {
            Write-Host "  Type: Backend" -ForegroundColor Yellow
        } elseif ($commandLine -like "*next*") {
            Write-Host "  Type: Frontend Next.js" -ForegroundColor Blue
        } else {
            Write-Host "  Type: Processus Node.js generique" -ForegroundColor Gray
        }
    }
    
    Write-Host "`nResume: $processCount processus Node.js trouve(s)" -ForegroundColor Cyan
    
} else {
    Write-Host "Aucun processus Node.js trouve" -ForegroundColor Red
}

# 2. Verifier les ports
Write-Host "`nVerification des Ports:" -ForegroundColor Yellow

$ports = @(3001, 3003, 5432, 6379)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "  Port $port : OUVERT" -ForegroundColor Green
        } else {
            Write-Host "  Port $port : FERME" -ForegroundColor Red
        }
    } catch {
        Write-Host "  Port $port : ERREUR" -ForegroundColor Red
    }
}

# 3. Test des services
Write-Host "`nTest des Services:" -ForegroundColor Yellow

# Backend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  Backend (3001): ACCESSIBLE" -ForegroundColor Green
    }
} catch {
    Write-Host "  Backend (3001): INACCESSIBLE" -ForegroundColor Red
}

# Frontend
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "  Frontend (3003): ACCESSIBLE" -ForegroundColor Green
    }
} catch {
    Write-Host "  Frontend (3003): INACCESSIBLE" -ForegroundColor Red
}

Write-Host "`nURLs d'Acces:" -ForegroundColor Yellow
Write-Host "  Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host "  Frontend Next.js: http://localhost:3003" -ForegroundColor Cyan
Write-Host "  Interface Simple: file:///D:/Gestion%20Commerciale/frontend-simple.html" -ForegroundColor Cyan

Write-Host "`nAnalyse terminee" -ForegroundColor Green
