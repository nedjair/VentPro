Write-Host "🔍 Vérification de l'état de l'application" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Vérifier Docker
Write-Host "`n📦 Services Docker:" -ForegroundColor Yellow
try {
    $dockerPs = docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host $dockerPs -ForegroundColor White
} catch {
    Write-Host "❌ Docker non accessible" -ForegroundColor Red
}

# Vérifier les processus Node.js
Write-Host "`n🟢 Processus Node.js:" -ForegroundColor Yellow
try {
    $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        foreach ($proc in $nodeProcesses) {
            Write-Host "✅ Node.js PID: $($proc.Id)" -ForegroundColor Green
        }
    } else {
        Write-Host "❌ Aucun processus Node.js trouvé" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur lors de la vérification des processus" -ForegroundColor Red
}

# Vérifier les ports
Write-Host "`n🌐 Ports utilisés:" -ForegroundColor Yellow
$ports = @(3001, 3003, 3004, 5432, 6379)
foreach ($port in $ports) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            Write-Host "✅ Port $port : OUVERT" -ForegroundColor Green
        } else {
            Write-Host "❌ Port $port : FERMÉ" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Port $port : ERREUR" -ForegroundColor Red
    }
}

# Tester les endpoints
Write-Host "`n🔗 Test des endpoints:" -ForegroundColor Yellow

# Backend Health
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend Health: OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Backend Health: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Backend Health: INACCESSIBLE" -ForegroundColor Red
}

# Frontend Next.js
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Next.js (3003): OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Frontend Next.js (3003): $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend Next.js (3003): INACCESSIBLE" -ForegroundColor Red
}

# Frontend Next.js port 3004
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3004" -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Frontend Next.js (3004): OK" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Frontend Next.js (3004): $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Frontend Next.js (3004): INACCESSIBLE" -ForegroundColor Red
}

Write-Host "`n📋 Résumé:" -ForegroundColor Cyan
Write-Host "- Backend API: http://localhost:3001" -ForegroundColor White
Write-Host "- Frontend Next.js: http://localhost:3003 (PORT PRINCIPAL)" -ForegroundColor White
Write-Host "- Interface Simple: file:///D:/Gestion%20Commerciale/frontend-simple.html" -ForegroundColor White
Write-Host "- Identifiants: admin@demo-tpe.fr / demo123" -ForegroundColor White
Write-Host "- Port 3004: LIBRE" -ForegroundColor Green
