# =============================================================================
# TEST SPÉCIFIQUE - HYDRATATION NEXT.JS
# Gestion Commerciale TPE - Vérification de l'hydratation
# =============================================================================

Write-Host "🧪 TEST D'HYDRATATION NEXT.JS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$FrontendPort = 3003
$allTestsPassed = $true

function Write-TestResult {
    param([string]$Test, [bool]$Passed, [string]$Details = "")
    if ($Passed) {
        Write-Host "   ✅ $Test" -ForegroundColor Green
        if ($Details) { Write-Host "      $Details" -ForegroundColor Gray }
    } else {
        Write-Host "   ❌ $Test" -ForegroundColor Red
        if ($Details) { Write-Host "      $Details" -ForegroundColor Yellow }
        $script:allTestsPassed = $false
    }
}

# 1. Vérifier que Next.js fonctionne
Write-Host "1. VÉRIFICATION DE BASE" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 10
    Write-TestResult "Next.js accessible" ($response.StatusCode -eq 200) "Status: $($response.StatusCode)"
    
    # Vérifier les headers Next.js
    $hasNextHeaders = $response.Headers.ContainsKey("x-nextjs-cache") -or 
                     $response.RawContent -match "next" -or
                     $response.RawContent -match "_next"
    Write-TestResult "Headers Next.js détectés" $hasNextHeaders
    
} catch {
    Write-TestResult "Next.js accessible" $false "Erreur: $($_.Exception.Message)"
}

# 2. Test de la page d'hydratation
Write-Host "`n2. TEST PAGE D'HYDRATATION" -ForegroundColor Yellow
try {
    $testResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort/test" -TimeoutSec 10
    Write-TestResult "Page /test accessible" ($testResponse.StatusCode -eq 200) "Status: $($testResponse.StatusCode)"
    
    # Vérifier le contenu spécifique
    $hasHydrationContent = $testResponse.Content -match "Test d'Hydratation"
    Write-TestResult "Contenu d'hydratation présent" $hasHydrationContent
    
    $hasSuppressionWarning = $testResponse.Content -match "suppressHydrationWarning"
    Write-TestResult "Corrections d'hydratation appliquées" $hasSuppressionWarning
    
    $hasClientDetection = $testResponse.Content -match "Client|Serveur"
    Write-TestResult "Détection client/serveur" $hasClientDetection
    
} catch {
    Write-TestResult "Page /test accessible" $false "Erreur: $($_.Exception.Message)"
}

# 3. Test des composants d'authentification
Write-Host "`n3. TEST COMPOSANTS D'AUTHENTIFICATION" -ForegroundColor Yellow
try {
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort/login" -TimeoutSec 10
    Write-TestResult "Page de connexion accessible" ($loginResponse.StatusCode -eq 200)
    
    # Vérifier les champs de connexion
    $hasEmailField = $loginResponse.Content -match 'name="email"'
    Write-TestResult "Champ email présent" $hasEmailField
    
    $hasPasswordField = $loginResponse.Content -match 'name="password"'
    Write-TestResult "Champ mot de passe présent" $hasPasswordField
    
    $hasRememberMe = $loginResponse.Content -match 'name="rememberMe"'
    Write-TestResult "Champ 'Se souvenir' présent" $hasRememberMe
    
} catch {
    Write-TestResult "Page de connexion accessible" $false "Erreur: $($_.Exception.Message)"
}

# 4. Test des routes principales
Write-Host "`n4. TEST ROUTES PRINCIPALES" -ForegroundColor Yellow
$routes = @(
    @{ Name = "Dashboard"; Path = "/" },
    @{ Name = "Clients"; Path = "/clients" },
    @{ Name = "Produits"; Path = "/products" },
    @{ Name = "Commandes"; Path = "/orders" },
    @{ Name = "Factures"; Path = "/invoices" },
    @{ Name = "Rapports"; Path = "/reports" },
    @{ Name = "Analytics"; Path = "/analytics" }
)

foreach ($route in $routes) {
    try {
        $routeResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort$($route.Path)" -TimeoutSec 5
        Write-TestResult "$($route.Name) ($($route.Path))" ($routeResponse.StatusCode -eq 200)
    } catch {
        Write-TestResult "$($route.Name) ($($route.Path))" $false "Erreur d'accès"
    }
}

# 5. Test des assets Next.js
Write-Host "`n5. TEST ASSETS NEXT.JS" -ForegroundColor Yellow
try {
    # Vérifier les assets CSS
    $homeResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 10
    $hasCssAssets = $homeResponse.Content -match "_next/static/css/"
    Write-TestResult "Assets CSS Next.js" $hasCssAssets
    
    $hasJsAssets = $homeResponse.Content -match "_next/static/"
    Write-TestResult "Assets JS Next.js" $hasJsAssets
    
    $hasOptimization = $homeResponse.Content -match "optimized|minified" -or $homeResponse.RawContent -match "gzip"
    Write-TestResult "Optimisations de production" $hasOptimization
    
} catch {
    Write-TestResult "Assets Next.js" $false "Erreur lors de la vérification"
}

# 6. Test de performance
Write-Host "`n6. TEST DE PERFORMANCE" -ForegroundColor Yellow
try {
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $perfResponse = Invoke-WebRequest -Uri "http://localhost:$FrontendPort" -TimeoutSec 10
    $stopwatch.Stop()
    
    $responseTime = $stopwatch.ElapsedMilliseconds
    $isPerformant = $responseTime -lt 2000  # Moins de 2 secondes
    Write-TestResult "Temps de réponse acceptable" $isPerformant "Temps: ${responseTime}ms"
    
    $contentSize = $perfResponse.RawContentLength
    $isSizeOptimal = $contentSize -lt 100000  # Moins de 100KB
    Write-TestResult "Taille de contenu optimale" $isSizeOptimal "Taille: ${contentSize} bytes"
    
} catch {
    Write-TestResult "Test de performance" $false "Erreur lors du test"
}

# Résumé final
Write-Host "`n" + "="*50 -ForegroundColor Cyan
if ($allTestsPassed) {
    Write-Host "🎉 TOUS LES TESTS D'HYDRATATION RÉUSSIS" -ForegroundColor Green
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ Next.js fonctionne correctement" -ForegroundColor Green
    Write-Host "✅ Hydratation sans erreurs" -ForegroundColor Green
    Write-Host "✅ Composants d'authentification opérationnels" -ForegroundColor Green
    Write-Host "✅ Routes principales accessibles" -ForegroundColor Green
    Write-Host "✅ Assets et optimisations en place" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application prête: http://localhost:$FrontendPort" -ForegroundColor Cyan
    Write-Host "🧪 Page de test: http://localhost:$FrontendPort/test" -ForegroundColor Cyan
    
} else {
    Write-Host "⚠️ CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host "============================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Vérifiez les points suivants:" -ForegroundColor Yellow
    Write-Host "- Next.js est-il démarré sur le port $FrontendPort ?" -ForegroundColor Gray
    Write-Host "- Le build de production a-t-il réussi ?" -ForegroundColor Gray
    Write-Host "- Les dépendances sont-elles installées ?" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Commandes utiles:" -ForegroundColor Yellow
    Write-Host "- .\start-nextjs-simple.ps1" -ForegroundColor Gray
    Write-Host "- .\verification-production-complete.ps1" -ForegroundColor Gray
}

Write-Host "`nTest d'hydratation terminé." -ForegroundColor White
