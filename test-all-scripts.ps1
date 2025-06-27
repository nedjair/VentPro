# =============================================================================
# TEST DE TOUS LES SCRIPTS - GESTION COMMERCIALE TPE
# Version: 1.0 - Test des scripts corriges
# 
# DESCRIPTION:
# Ce script teste tous les scripts de demarrage et d'arret pour s'assurer
# qu'ils fonctionnent correctement sans erreurs d'encodage
# =============================================================================

param(
    [switch]$Verbose    # Affichage detaille
)

function Write-TestResult {
    param([string]$Test, [bool]$Passed, [string]$Details = "")
    if ($Passed) {
        Write-Host "   [OK] $Test" -ForegroundColor Green
        if ($Details -and $Verbose) { Write-Host "        $Details" -ForegroundColor Gray }
    } else {
        Write-Host "   [ERR] $Test" -ForegroundColor Red
        if ($Details) { Write-Host "        $Details" -ForegroundColor Yellow }
    }
}

function Test-ScriptSyntax {
    param([string]$ScriptPath)
    
    if (-not (Test-Path $ScriptPath)) {
        return @{ Success = $false; Error = "Fichier non trouve" }
    }
    
    try {
        # Tester la syntaxe PowerShell
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $ScriptPath -Raw), [ref]$null)
        return @{ Success = $true; Error = $null }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# En-tete
Clear-Host
Write-Host "TEST DE TOUS LES SCRIPTS - GESTION COMMERCIALE TPE" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$allTestsPassed = $true

# 1. Test des scripts de demarrage
Write-Host "1. TEST DES SCRIPTS DE DEMARRAGE" -ForegroundColor Yellow

$startupScripts = @(
    "start-app-principal-fixed.ps1",
    "start-quick-simple.ps1", 
    "start-nextjs-direct.ps1",
    "start-production-backend.ps1"
)

foreach ($script in $startupScripts) {
    $result = Test-ScriptSyntax $script
    Write-TestResult "Syntaxe: $script" $result.Success $result.Error
    if (-not $result.Success) { $allTestsPassed = $false }
}

# 2. Test des scripts d'arret
Write-Host "`n2. TEST DES SCRIPTS D'ARRET" -ForegroundColor Yellow

$stopScripts = @(
    "stop-app-principal-fixed.ps1",
    "stop-nextjs-quick.ps1"
)

foreach ($script in $stopScripts) {
    $result = Test-ScriptSyntax $script
    Write-TestResult "Syntaxe: $script" $result.Success $result.Error
    if (-not $result.Success) { $allTestsPassed = $false }
}

# 3. Test des scripts de verification
Write-Host "`n3. TEST DES SCRIPTS DE VERIFICATION" -ForegroundColor Yellow

$verificationScripts = @(
    "verification-production-complete.ps1",
    "test-nextjs-hydration.ps1"
)

foreach ($script in $verificationScripts) {
    $result = Test-ScriptSyntax $script
    Write-TestResult "Syntaxe: $script" $result.Success $result.Error
    if (-not $result.Success) { $allTestsPassed = $false }
}

# 4. Test des caracteres d'encodage
Write-Host "`n4. TEST DES CARACTERES D'ENCODAGE" -ForegroundColor Yellow

$allScripts = $startupScripts + $stopScripts + $verificationScripts

foreach ($script in $allScripts) {
    if (Test-Path $script) {
        $content = Get-Content $script -Raw -Encoding UTF8
        $hasEncodingIssues = $content -match '[^\x00-\x7F]' -and $content -match 'Ã|â|ê|é|ç|à|è|ù'
        Write-TestResult "Encodage: $script" (-not $hasEncodingIssues) $(if ($hasEncodingIssues) { "Caracteres problematiques detectes" } else { "" })
        if ($hasEncodingIssues) { $allTestsPassed = $false }
    }
}

# 5. Test de la structure des fichiers
Write-Host "`n5. TEST DE LA STRUCTURE DES FICHIERS" -ForegroundColor Yellow

$requiredFiles = @(
    "production-backend.js",
    "frontend-nextjs-production",
    "docker-compose.yml",
    "package.json"
)

foreach ($file in $requiredFiles) {
    $exists = Test-Path $file
    Write-TestResult "Fichier requis: $file" $exists $(if (-not $exists) { "Fichier manquant" } else { "" })
    if (-not $exists) { $allTestsPassed = $false }
}

# 6. Test des ports par defaut
Write-Host "`n6. TEST DES PORTS PAR DEFAUT" -ForegroundColor Yellow

function Test-PortAvailable {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $false  # Port occupe
    } catch {
        return $true   # Port libre
    }
}

$ports = @(
    @{ Port = 3001; Name = "Backend" },
    @{ Port = 3003; Name = "Frontend Next.js" },
    @{ Port = 5432; Name = "PostgreSQL" },
    @{ Port = 6379; Name = "Redis" }
)

foreach ($portInfo in $ports) {
    $available = Test-PortAvailable $portInfo.Port
    $status = if ($available) { "Libre" } else { "Occupe" }
    Write-TestResult "Port $($portInfo.Port) ($($portInfo.Name))" $true $status
}

# Resume final
Write-Host "`n" + "="*60 -ForegroundColor Cyan
if ($allTestsPassed) {
    Write-Host "TOUS LES TESTS REUSSIS" -ForegroundColor Green
    Write-Host "======================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tous les scripts sont prets a l'utilisation:" -ForegroundColor Green
    Write-Host ""
    Write-Host "DEMARRAGE:" -ForegroundColor Cyan
    Write-Host "   .\start-app-principal-fixed.ps1    # Backend complet" -ForegroundColor White
    Write-Host "   .\start-quick-simple.ps1           # Backend + Frontend" -ForegroundColor White
    Write-Host "   .\start-nextjs-direct.ps1          # Frontend seul" -ForegroundColor White
    Write-Host ""
    Write-Host "ARRET:" -ForegroundColor Cyan
    Write-Host "   .\stop-app-principal-fixed.ps1     # Arret complet" -ForegroundColor White
    Write-Host "   .\stop-nextjs-quick.ps1            # Arret Next.js" -ForegroundColor White
    Write-Host ""
    Write-Host "VERIFICATION:" -ForegroundColor Cyan
    Write-Host "   .\verification-production-complete.ps1  # Tests complets" -ForegroundColor White
    Write-Host "   .\test-nextjs-hydration.ps1             # Tests hydratation" -ForegroundColor White
    
} else {
    Write-Host "CERTAINS TESTS ONT ECHOUE" -ForegroundColor Red
    Write-Host "=========================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Verifiez les erreurs ci-dessus et corrigez les scripts" -ForegroundColor Yellow
    Write-Host "avant de les utiliser en production." -ForegroundColor Yellow
}

Write-Host "`nTest termine." -ForegroundColor White
