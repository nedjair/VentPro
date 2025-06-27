# =============================================================================
# SCRIPT DE TEST DES SCRIPTS UNIFIÉS - GESTION COMMERCIALE TPE
# Version: 2.0 - Analytics Phase 5
# Test de validation des scripts de démarrage/arrêt unifiés
# =============================================================================

param(
    [switch]$Quick,
    [switch]$Verbose
)

# Configuration
$BACKEND_PORT = 3001
$FRONTEND_PORT = 3003
$TEST_TIMEOUT = 30

# Couleurs pour l'affichage
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$Type = "INFO"
    )
    
    switch ($Type) {
        "SUCCESS" { Write-Host "✅ $Message" -ForegroundColor Green }
        "ERROR" { Write-Host "❌ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "⚠️  $Message" -ForegroundColor Yellow }
        "INFO" { Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
        "LOADING" { Write-Host "⏳ $Message" -ForegroundColor Yellow }
        "TEST" { Write-Host "🧪 $Message" -ForegroundColor Magenta }
        default { Write-Host "$Message" -ForegroundColor White }
    }
}

# Fonction de test de port
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

# Fonction de test HTTP
function Test-HttpEndpoint {
    param(
        [string]$Url,
        [hashtable]$Headers = @{},
        [int]$TimeoutSec = 10
    )
    try {
        $response = Invoke-WebRequest -Uri $Url -Headers $Headers -UseBasicParsing -TimeoutSec $TimeoutSec
        return @{ Success = $true; StatusCode = $response.StatusCode; Content = $response.Content }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# En-tête
Clear-Host
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║            TEST DES SCRIPTS UNIFIÉS - GESTION COMMERCIALE        ║" -ForegroundColor Magenta
Write-Host "║                     Analytics Phase 5 - v2.0                    ║" -ForegroundColor Magenta
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

if ($Quick) {
    Write-ColorMessage "Mode QUICK activé - Tests essentiels uniquement" "INFO"
} else {
    Write-ColorMessage "Mode COMPLET - Tests exhaustifs" "INFO"
}

Write-Host ""

# Test 1: Vérification des fichiers de scripts
Write-Host "═══ TEST 1: VÉRIFICATION DES FICHIERS ═══" -ForegroundColor Yellow
Write-Host ""

$requiredFiles = @(
    "start-app-unified.ps1",
    "stop-app-unified.ps1",
    "start-app-unified.sh",
    "stop-app-unified.sh",
    "production-backend.js",
    "frontend-nextjs-production"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-ColorMessage "Fichier trouvé: $file" "SUCCESS"
    } else {
        Write-ColorMessage "Fichier manquant: $file" "ERROR"
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    Write-ColorMessage "Tous les fichiers requis sont présents" "SUCCESS"
} else {
    Write-ColorMessage "Certains fichiers sont manquants" "ERROR"
    exit 1
}

Write-Host ""

# Test 2: Vérification des prérequis
Write-Host "═══ TEST 2: VÉRIFICATION DES PRÉREQUIS ═══" -ForegroundColor Yellow
Write-Host ""

# Node.js
try {
    $nodeVersion = node --version
    Write-ColorMessage "Node.js: $nodeVersion" "SUCCESS"
} catch {
    Write-ColorMessage "Node.js non disponible" "ERROR"
    exit 1
}

# Yarn
try {
    $yarnVersion = yarn --version
    Write-ColorMessage "Yarn: v$yarnVersion" "SUCCESS"
} catch {
    Write-ColorMessage "Yarn non disponible" "WARNING"
}

# Docker
try {
    $dockerVersion = docker --version
    Write-ColorMessage "Docker: $dockerVersion" "SUCCESS"
    
    docker ps | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorMessage "Docker en cours d'exécution" "SUCCESS"
    } else {
        Write-ColorMessage "Docker non démarré" "WARNING"
    }
} catch {
    Write-ColorMessage "Docker non disponible" "WARNING"
}

Write-Host ""

# Test 3: Test de l'état initial
Write-Host "═══ TEST 3: ÉTAT INITIAL ═══" -ForegroundColor Yellow
Write-Host ""

$backendInitiallyRunning = Test-Port $BACKEND_PORT
$frontendInitiallyRunning = Test-Port $FRONTEND_PORT

Write-ColorMessage "Backend (port $BACKEND_PORT): $(if ($backendInitiallyRunning) { 'ACTIF' } else { 'INACTIF' })" "INFO"
Write-ColorMessage "Frontend (port $FRONTEND_PORT): $(if ($frontendInitiallyRunning) { 'ACTIF' } else { 'INACTIF' })" "INFO"

if ($backendInitiallyRunning -or $frontendInitiallyRunning) {
    Write-ColorMessage "Arrêt des services existants..." "LOADING"
    & ".\stop-app-unified.ps1" -Force
    Start-Sleep -Seconds 5
}

Write-Host ""

# Test 4: Test du script de démarrage
Write-Host "═══ TEST 4: TEST DU SCRIPT DE DÉMARRAGE ═══" -ForegroundColor Yellow
Write-Host ""

Write-ColorMessage "Démarrage du script unifié..." "TEST"

# Démarrer le script en arrière-plan (simulation)
$startScriptJob = Start-Job -ScriptBlock {
    param($ScriptPath, $Verbose)
    if ($Verbose) {
        & $ScriptPath -Verbose -SkipDocker
    } else {
        & $ScriptPath -SkipDocker
    }
} -ArgumentList (Resolve-Path ".\start-app-unified.ps1"), $Verbose

# Attendre un peu pour que le script démarre
Start-Sleep -Seconds 10

# Vérifier si les services démarrent
Write-ColorMessage "Vérification du démarrage des services..." "LOADING"

$backendStarted = $false
$frontendStarted = $false
$attempts = 0
$maxAttempts = 15

while ($attempts -lt $maxAttempts -and (-not $backendStarted -or -not $frontendStarted)) {
    Start-Sleep -Seconds 2
    $attempts++
    
    if (-not $backendStarted -and (Test-Port $BACKEND_PORT)) {
        $healthTest = Test-HttpEndpoint "http://localhost:$BACKEND_PORT/health"
        if ($healthTest.Success) {
            Write-ColorMessage "Backend démarré et opérationnel" "SUCCESS"
            $backendStarted = $true
        }
    }
    
    if (-not $frontendStarted -and (Test-Port $FRONTEND_PORT)) {
        Write-ColorMessage "Frontend démarré" "SUCCESS"
        $frontendStarted = $true
    }
    
    if ($Verbose) {
        Write-Host "   Tentative $attempts/$maxAttempts..." -ForegroundColor Gray
    }
}

# Arrêter le job du script de démarrage
Stop-Job $startScriptJob -ErrorAction SilentlyContinue
Remove-Job $startScriptJob -ErrorAction SilentlyContinue

if ($backendStarted) {
    Write-ColorMessage "Test de démarrage du backend: RÉUSSI" "SUCCESS"
} else {
    Write-ColorMessage "Test de démarrage du backend: ÉCHEC" "ERROR"
}

Write-Host ""

# Test 5: Test des endpoints (si backend démarré)
if ($backendStarted -and -not $Quick) {
    Write-Host "═══ TEST 5: TEST DES ENDPOINTS ═══" -ForegroundColor Yellow
    Write-Host ""
    
    # Test d'authentification
    Write-ColorMessage "Test d'authentification..." "TEST"
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $authTest = Test-HttpEndpoint "http://localhost:$BACKEND_PORT/auth/login" -Headers @{ "Content-Type" = "application/json" }
    
    if ($authTest.Success) {
        Write-ColorMessage "Endpoint d'authentification: ACCESSIBLE" "SUCCESS"
        
        # Extraire le token si possible
        try {
            $authData = $authTest.Content | ConvertFrom-Json
            if ($authData.success) {
                $token = $authData.data.token
                Write-ColorMessage "Token d'authentification obtenu" "SUCCESS"
                
                # Test des endpoints Analytics
                $analyticsEndpoints = @(
                    "/analytics/kpi",
                    "/analytics/sales",
                    "/dashboard/stats"
                )
                
                foreach ($endpoint in $analyticsEndpoints) {
                    $endpointTest = Test-HttpEndpoint "http://localhost:$BACKEND_PORT$endpoint" -Headers @{ "Authorization" = "Bearer $token" }
                    if ($endpointTest.Success) {
                        Write-ColorMessage "Endpoint $endpoint: OPÉRATIONNEL" "SUCCESS"
                    } else {
                        Write-ColorMessage "Endpoint $endpoint: ÉCHEC" "WARNING"
                    }
                }
            }
        } catch {
            Write-ColorMessage "Erreur lors du parsing de la réponse d'auth" "WARNING"
        }
    } else {
        Write-ColorMessage "Endpoint d'authentification: INACCESSIBLE" "ERROR"
    }
    
    Write-Host ""
}

# Test 6: Test du script d'arrêt
Write-Host "═══ TEST 6: TEST DU SCRIPT D'ARRÊT ═══" -ForegroundColor Yellow
Write-Host ""

Write-ColorMessage "Exécution du script d'arrêt..." "TEST"

& ".\stop-app-unified.ps1" -Force

Start-Sleep -Seconds 5

# Vérifier que les services sont arrêtés
$backendStopped = -not (Test-Port $BACKEND_PORT)
$frontendStopped = -not (Test-Port $FRONTEND_PORT)

if ($backendStopped) {
    Write-ColorMessage "Backend arrêté: RÉUSSI" "SUCCESS"
} else {
    Write-ColorMessage "Backend arrêté: ÉCHEC" "ERROR"
}

if ($frontendStopped) {
    Write-ColorMessage "Frontend arrêté: RÉUSSI" "SUCCESS"
} else {
    Write-ColorMessage "Frontend arrêté: ÉCHEC" "ERROR"
}

Write-Host ""

# Résumé final
Write-Host "═══ RÉSUMÉ DES TESTS ═══" -ForegroundColor Yellow
Write-Host ""

$testsResults = @{
    "Fichiers requis" = $allFilesExist
    "Démarrage backend" = $backendStarted
    "Arrêt backend" = $backendStopped
    "Arrêt frontend" = $frontendStopped
}

$successCount = 0
$totalTests = $testsResults.Count

foreach ($test in $testsResults.GetEnumerator()) {
    if ($test.Value) {
        Write-ColorMessage "$($test.Key): RÉUSSI" "SUCCESS"
        $successCount++
    } else {
        Write-ColorMessage "$($test.Key): ÉCHEC" "ERROR"
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor $(if ($successCount -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "║                        RÉSULTATS FINAUX                          ║" -ForegroundColor $(if ($successCount -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor $(if ($successCount -eq $totalTests) { "Green" } else { "Yellow" })
Write-Host ""

Write-Host "📊 SCORE: $successCount/$totalTests tests réussis" -ForegroundColor $(if ($successCount -eq $totalTests) { "Green" } else { "Yellow" })

if ($successCount -eq $totalTests) {
    Write-ColorMessage "🎉 TOUS LES TESTS SONT RÉUSSIS!" "SUCCESS"
    Write-ColorMessage "Les scripts unifiés sont prêts à être utilisés" "SUCCESS"
} else {
    Write-ColorMessage "⚠️  CERTAINS TESTS ONT ÉCHOUÉ" "WARNING"
    Write-ColorMessage "Vérifiez les erreurs ci-dessus avant utilisation" "WARNING"
}

Write-Host ""
Write-ColorMessage "Pour utiliser les scripts:" "INFO"
Write-Host "   Démarrage: .\start-app-unified.ps1" -ForegroundColor Cyan
Write-Host "   Arrêt: .\stop-app-unified.ps1" -ForegroundColor Cyan
Write-Host ""
