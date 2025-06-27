# Test simple de la stratégie de ports
Write-Host "=== TEST DE LA STRATEGIE DE PORTS DEDIES ===" -ForegroundColor Cyan
Write-Host ""

# Configuration des ports dédiés - Mise à jour après suppression Express.js
$ports = @{
    3001 = "Backend Principal"
    3002 = "LIBRE (Ex-Express.js)"
    3003 = "Next.js Production"
    3004 = "Tests Isoles"
    3005 = "Developpement"
    5432 = "PostgreSQL"
    6379 = "Redis"
    6432 = "PgBouncer"
}

# Fonction pour tester un port
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

Write-Host "ETAT DES PORTS :" -ForegroundColor Yellow
Write-Host ""

foreach ($port in $ports.Keys | Sort-Object) {
    $name = $ports[$port]
    $isUsed = Test-Port $port
    $status = if ($isUsed) { "[UTILISE]" } else { "[LIBRE]" }
    $color = if ($isUsed) { "Red" } else { "Green" }
    
    Write-Host "  Port $port - $name : $status" -ForegroundColor $color
}

Write-Host ""
Write-Host "STRATEGIE DE PORTS DEDIES (MISE A JOUR) :" -ForegroundColor Cyan
Write-Host "  Port 3001 : Backend Principal (Fastify)" -ForegroundColor White
Write-Host "  Port 3002 : LIBRE (Ex-Express.js supprime)" -ForegroundColor Gray
Write-Host "  Port 3003 : Next.js Production (ACTIF)" -ForegroundColor Green
Write-Host "  Port 3004 : Tests Isoles" -ForegroundColor White
Write-Host "  Port 3005 : Developpement (Hot-reload)" -ForegroundColor White
Write-Host ""
Write-Host "SCRIPTS DISPONIBLES (MISE A JOUR) :" -ForegroundColor Yellow
Write-Host "  cd frontend-nextjs-production; npm run dev  # Next.js Production (port 3003)" -ForegroundColor Green
Write-Host "  .\start-frontend-test.ps1                   # Tests Isoles (port 3004)" -ForegroundColor White
Write-Host "  .\start-frontend-dev.ps1                    # Developpement (port 3005)" -ForegroundColor White
Write-Host "  Port 3002 : LIBRE pour usage futur" -ForegroundColor Gray
Write-Host ""
