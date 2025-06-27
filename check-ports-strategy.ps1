# Script de vérification de la stratégie de ports dédiés
# Gestion Commerciale TPE - Vérification complète des ports

param(
    [switch]$Detailed,
    [switch]$Kill,
    [string]$KillPort
)

# Configuration des ports dédiés - Mise à jour après suppression Express.js
$PortStrategy = @{
    3001 = @{ Name = "Backend Principal"; Type = "Backend"; Status = "Reserved" }
    3002 = @{ Name = "LIBRE (Ex-Express.js)"; Type = "Frontend"; Status = "Available" }
    3003 = @{ Name = "Next.js Production"; Type = "Frontend"; Status = "Dedicated" }
    3004 = @{ Name = "Tests Isolés"; Type = "Frontend"; Status = "Dedicated" }
    3005 = @{ Name = "Développement"; Type = "Frontend"; Status = "Dedicated" }
    5432 = @{ Name = "PostgreSQL"; Type = "Database"; Status = "Reserved" }
    6379 = @{ Name = "Redis"; Type = "Cache"; Status = "Reserved" }
    6432 = @{ Name = "PgBouncer"; Type = "Database"; Status = "Reserved" }
    8080 = @{ Name = "Adminer"; Type = "Admin"; Status = "Optional" }
    8081 = @{ Name = "Redis Commander"; Type = "Admin"; Status = "Optional" }
}

# Couleurs pour l'affichage
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Header { param($Message) Write-Host $Message -ForegroundColor Cyan }

# Fonction pour vérifier si un port est utilisé
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

# Fonction pour obtenir le processus utilisant un port
function Get-PortProcess {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($connection) {
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                return @{
                    PID = $process.Id
                    Name = $process.ProcessName
                    CommandLine = (Get-WmiObject Win32_Process | Where-Object {$_.ProcessId -eq $process.Id}).CommandLine
                }
            }
        }
        return $null
    } catch {
        return $null
    }
}

# Fonction pour tuer un processus sur un port
function Kill-PortProcess {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        foreach ($connection in $connections) {
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                Write-Warning "🔪 Arrêt du processus $($process.ProcessName) (PID: $($process.Id)) sur le port $Port"
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                return $true
            }
        }
        return $false
    } catch {
        Write-Error "❌ Erreur lors de l'arrêt du processus sur le port $Port"
        return $false
    }
}

# Fonction principale de vérification
function Check-PortStrategy {
    Write-Header "🔍 VÉRIFICATION DE LA STRATÉGIE DE PORTS DÉDIÉS"
    Write-Header "================================================"
    Write-Host ""
    
    $results = @()
    $conflicts = @()
    $available = @()
    
    foreach ($port in $PortStrategy.Keys | Sort-Object) {
        $config = $PortStrategy[$port]
        $isUsed = Test-Port $port
        $process = if ($isUsed) { Get-PortProcess $port } else { $null }
        
        $result = @{
            Port = $port
            Name = $config.Name
            Type = $config.Type
            Status = $config.Status
            IsUsed = $isUsed
            Process = $process
        }
        
        $results += $result
        
        if ($isUsed) {
            if ($config.Status -eq "Optional") {
                # Port optionnel utilisé - OK
            } elseif ($config.Status -eq "Reserved" -and $process -and ($process.Name -eq "postgres" -or $process.Name -eq "redis-server" -or $process.Name -eq "node")) {
                # Port réservé utilisé par le bon service - OK
            } elseif ($config.Status -eq "Dedicated") {
                # Port dédié utilisé - vérifier si c'est le bon service
                $conflicts += $result
            } else {
                $conflicts += $result
            }
        } else {
            $available += $result
        }
    }
    
    # Affichage des résultats
    Write-Info "📊 ÉTAT DES PORTS :"
    Write-Host ""
    
    foreach ($result in $results) {
        $statusIcon = if ($result.IsUsed) { "[USED]" } else { "[FREE]" }
        $typeIcon = switch ($result.Type) {
            "Backend" { "[BE]" }
            "Frontend" { "[FE]" }
            "Database" { "[DB]" }
            "Cache" { "[CA]" }
            "Admin" { "[AD]" }
            default { "[??]" }
        }
        
        $line = "  $statusIcon $typeIcon Port $($result.Port) - $($result.Name)"
        
        if ($result.IsUsed) {
            if ($result.Process) {
                $line += " (PID: $($result.Process.PID), $($result.Process.Name))"
            }
            
            if ($result.Status -eq "Reserved") {
                Write-Success $line
            } elseif ($result.Status -eq "Dedicated") {
                Write-Warning $line
            } else {
                Write-Info $line
            }
        } else {
            Write-Host $line -ForegroundColor Gray
        }
        
        if ($Detailed -and $result.Process -and $result.Process.CommandLine) {
            Write-Host "     Command: $($result.Process.CommandLine)" -ForegroundColor DarkGray
        }
    }
    
    Write-Host ""
    
    # Résumé
    $usedPorts = ($results | Where-Object { $_.IsUsed }).Count
    $totalPorts = $results.Count
    $availablePorts = $totalPorts - $usedPorts
    
    Write-Header "📈 RÉSUMÉ :"
    Write-Host "  Total des ports surveillés : $totalPorts" -ForegroundColor White
    Write-Host "  Ports utilisés : $usedPorts" -ForegroundColor Yellow
    Write-Host "  Ports disponibles : $availablePorts" -ForegroundColor Green
    
    if ($conflicts.Count -gt 0) {
        Write-Host ""
        Write-Warning "⚠️  CONFLITS DÉTECTÉS :"
        foreach ($conflict in $conflicts) {
            Write-Host "  - Port $($conflict.Port) ($($conflict.Name)) utilisé par un processus non identifié" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Header "🎯 STRATÉGIE DE PORTS DÉDIÉS (MISE À JOUR) :"
    Write-Host "  🚀 Port 3001 : Backend Principal (Fastify)" -ForegroundColor White
    Write-Host "  ⚪ Port 3002 : LIBRE (Ex-Express.js supprimé)" -ForegroundColor Gray
    Write-Host "  🌐 Port 3003 : Frontend Next.js Production" -ForegroundColor Green
    Write-Host "  🔬 Port 3004 : Tests Frontend Isolés" -ForegroundColor White
    Write-Host "  🔥 Port 3005 : Développement Frontend (Hot-reload)" -ForegroundColor White
    Write-Host ""
    
    return $results
}

# Fonction pour afficher l'aide
function Show-Help {
    Write-Header "🔍 SCRIPT DE VÉRIFICATION DES PORTS DÉDIÉS"
    Write-Header "==========================================="
    Write-Host ""
    Write-Info "UTILISATION :"
    Write-Host "  .\check-ports-strategy.ps1                    # Vérification standard" -ForegroundColor White
    Write-Host "  .\check-ports-strategy.ps1 -Detailed          # Vérification détaillée" -ForegroundColor White
    Write-Host "  .\check-ports-strategy.ps1 -Kill              # Arrêter tous les processus sur les ports dédiés" -ForegroundColor White
    Write-Host "  .\check-ports-strategy.ps1 -KillPort 3002     # Arrêter le processus sur un port spécifique" -ForegroundColor White
    Write-Host ""
    Write-Info "STRATÉGIE DE PORTS :"
    Write-Host "  3001 - Backend Principal (Fastify)" -ForegroundColor White
    Write-Host "  3002 - Express.js Production" -ForegroundColor White
    Write-Host "  3003 - Next.js Tests" -ForegroundColor White
    Write-Host "  3004 - Tests Isolés" -ForegroundColor White
    Write-Host "  3005 - Développement (Hot-reload)" -ForegroundColor White
    Write-Host ""
}

# Traitement des paramètres
if ($KillPort) {
    $portNum = [int]$KillPort
    if ($PortStrategy.ContainsKey($portNum)) {
        Write-Info "🔪 Arrêt du processus sur le port $portNum..."
        if (Kill-PortProcess $portNum) {
            Write-Success "✅ Processus arrêté sur le port $portNum"
        } else {
            Write-Warning "⚠️  Aucun processus trouvé sur le port $portNum"
        }
    } else {
        Write-Error "❌ Port $portNum non géré par la stratégie de ports dédiés"
    }
    exit 0
}

if ($Kill) {
    Write-Warning "🔪 ARRÊT DE TOUS LES PROCESSUS SUR LES PORTS DÉDIÉS"
    Write-Warning "=================================================="
    Write-Host ""
    
    $frontendPorts = @(3002, 3003, 3004, 3005)
    $killedAny = $false
    
    foreach ($port in $frontendPorts) {
        if (Test-Port $port) {
            Write-Info "Arrêt du processus sur le port $port..."
            if (Kill-PortProcess $port) {
                Write-Success "✅ Processus arrêté sur le port $port"
                $killedAny = $true
            }
        }
    }
    
    if (-not $killedAny) {
        Write-Info "ℹ️  Aucun processus frontend trouvé sur les ports dédiés"
    }
    
    Write-Host ""
    Write-Info "Vérification après nettoyage..."
    Start-Sleep -Seconds 2
}

# Vérification principale
$results = Check-PortStrategy

# Scripts recommandés
Write-Host ""
Write-Header "🚀 SCRIPTS DE DÉMARRAGE RECOMMANDÉS :"
Write-Host "  Express.js Production : .\start-frontend-express.ps1" -ForegroundColor White
Write-Host "  Next.js Tests        : .\start-frontend-nextjs-test.ps1" -ForegroundColor White
Write-Host "  Tests Isolés         : .\start-frontend-test.ps1" -ForegroundColor White
Write-Host "  Développement        : .\start-frontend-dev.ps1" -ForegroundColor White
Write-Host ""

Write-Info "Utilisez -Detailed pour plus d'informations sur les processus"
Write-Info "Utilisez -Kill pour arreter tous les processus frontend"
Write-Info "Utilisez -KillPort [numero] pour arreter un processus specifique"
