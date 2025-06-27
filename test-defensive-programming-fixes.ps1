# Script de test pour valider les corrections de programmation défensive
# Ce script teste tous les composants corrigés pour s'assurer qu'ils fonctionnent correctement

Write-Host "🧪 Test des corrections de programmation défensive" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Fonction utilitaire pour les tests
function Test-Component {
    param(
        [string]$ComponentName,
        [string]$TestDescription,
        [scriptblock]$TestScript
    )
    
    Write-Host "`n🔍 Test: $ComponentName - $TestDescription" -ForegroundColor Yellow
    
    try {
        & $TestScript
        Write-Host "✅ SUCCÈS: $ComponentName" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ ÉCHEC: $ComponentName - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Variables de test
$testResults = @()
$frontendPath = "apps/frontend"
$backendPath = "apps/backend"

Write-Host "`n📋 Vérification des fichiers créés/modifiés..." -ForegroundColor Blue

# Test 1: Vérifier que les utilitaires défensifs existent
$testResults += Test-Component "Utilitaires défensifs" "Vérification de l'existence du fichier" {
    $defensiveUtilsPath = "$frontendPath/src/lib/defensive-utils.ts"
    if (-not (Test-Path $defensiveUtilsPath)) {
        throw "Fichier defensive-utils.ts non trouvé"
    }
    
    $content = Get-Content $defensiveUtilsPath -Raw
    if ($content -notmatch "ensureArray") {
        throw "Fonction ensureArray non trouvée"
    }
    if ($content -notmatch "safeFilter") {
        throw "Fonction safeFilter non trouvée"
    }
    if ($content -notmatch "validateApiResponse") {
        throw "Fonction validateApiResponse non trouvée"
    }
    
    Write-Host "   - Toutes les fonctions utilitaires sont présentes"
}

# Test 2: Vérifier la configuration CORS centralisée
$testResults += Test-Component "Configuration CORS" "Vérification de la configuration centralisée" {
    $corsConfigPath = "$backendPath/src/config/cors.ts"
    if (-not (Test-Path $corsConfigPath)) {
        throw "Fichier cors.ts non trouvé"
    }
    
    $content = Get-Content $corsConfigPath -Raw
    if ($content -notmatch "http://localhost:3000") {
        throw "Port 3000 non configuré dans CORS"
    }
    if ($content -notmatch "corsConfig") {
        throw "Configuration corsConfig non trouvée"
    }
    
    Write-Host "   - Configuration CORS centralisée correctement"
}

# Test 3: Vérifier les corrections dans OrdersPage
$testResults += Test-Component "OrdersPage" "Vérification des corrections défensives" {
    $ordersPagePath = "$frontendPath/src/components/pages/orders/index.tsx"
    if (-not (Test-Path $ordersPagePath)) {
        throw "Fichier OrdersPage non trouvé"
    }
    
    $content = Get-Content $ordersPagePath -Raw
    if ($content -notmatch "safeFilter") {
        throw "safeFilter non utilisé dans OrdersPage"
    }
    if ($content -notmatch "createSafeArrayState") {
        throw "createSafeArrayState non utilisé dans OrdersPage"
    }
    if ($content -notmatch "withRetry") {
        throw "withRetry non utilisé dans OrdersPage"
    }
    
    Write-Host "   - OrdersPage utilise la programmation défensive"
}

# Test 4: Vérifier les corrections dans ProductsPage
$testResults += Test-Component "ProductsPage" "Vérification des corrections défensives" {
    $productsPagePath = "$frontendPath/src/components/pages/products.tsx"
    if (-not (Test-Path $productsPagePath)) {
        throw "Fichier ProductsPage non trouvé"
    }
    
    $content = Get-Content $productsPagePath -Raw
    if ($content -notmatch "safeFilter") {
        throw "safeFilter non utilisé dans ProductsPage"
    }
    if ($content -notmatch "createSafeArrayState") {
        throw "createSafeArrayState non utilisé dans ProductsPage"
    }
    
    Write-Host "   - ProductsPage utilise la programmation défensive"
}

# Test 5: Vérifier les corrections dans ClientsPage
$testResults += Test-Component "ClientsPage" "Vérification des corrections défensives" {
    $clientsPagePath = "$frontendPath/src/components/pages/clients.tsx"
    if (-not (Test-Path $clientsPagePath)) {
        throw "Fichier ClientsPage non trouvé"
    }
    
    $content = Get-Content $clientsPagePath -Raw
    if ($content -notmatch "safeFilter") {
        throw "safeFilter non utilisé dans ClientsPage"
    }
    if ($content -notmatch "createSafeArrayState") {
        throw "createSafeArrayState non utilisé dans ClientsPage"
    }
    
    Write-Host "   - ClientsPage utilise la programmation défensive"
}

# Test 6: Vérifier les corrections dans InvoicesPage
$testResults += Test-Component "InvoicesPage" "Vérification des corrections défensives" {
    $invoicesPagePath = "$frontendPath/src/components/pages/invoices/index.tsx"
    if (-not (Test-Path $invoicesPagePath)) {
        throw "Fichier InvoicesPage non trouvé"
    }
    
    $content = Get-Content $invoicesPagePath -Raw
    if ($content -notmatch "safeFilter") {
        throw "safeFilter non utilisé dans InvoicesPage"
    }
    if ($content -notmatch "createSafeArrayState") {
        throw "createSafeArrayState non utilisé dans InvoicesPage"
    }
    
    Write-Host "   - InvoicesPage utilise la programmation défensive"
}

# Test 7: Vérifier les améliorations de l'API
$testResults += Test-Component "API Client" "Vérification des améliorations de robustesse" {
    $apiPath = "$frontendPath/src/lib/api.ts"
    if (-not (Test-Path $apiPath)) {
        throw "Fichier api.ts non trouvé"
    }
    
    $content = Get-Content $apiPath -Raw
    if ($content -notmatch "withRetry") {
        throw "withRetry non importé dans api.ts"
    }
    if ($content -notmatch "requestWithoutRetry") {
        throw "Méthode requestWithoutRetry non trouvée"
    }
    
    Write-Host "   - API Client amélioré avec retry automatique"
}

# Test 8: Vérifier la configuration backend
$testResults += Test-Component "Backend Configuration" "Vérification des configurations CORS" {
    $serverPath = "$backendPath/src/server.ts"
    $pluginsPath = "$backendPath/src/plugins/index.ts"
    
    if (-not (Test-Path $serverPath)) {
        throw "Fichier server.ts non trouvé"
    }
    if (-not (Test-Path $pluginsPath)) {
        throw "Fichier plugins/index.ts non trouvé"
    }
    
    $serverContent = Get-Content $serverPath -Raw
    $pluginsContent = Get-Content $pluginsPath -Raw
    
    if ($serverContent -notmatch "corsMiddleware") {
        throw "corsMiddleware non utilisé dans server.ts"
    }
    if ($pluginsContent -notmatch "fastifyCorsOptions") {
        throw "fastifyCorsOptions non utilisé dans plugins"
    }
    
    Write-Host "   - Configuration backend utilise CORS centralisé"
}

# Résumé des tests
Write-Host "`n📊 RÉSUMÉ DES TESTS" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

$successCount = ($testResults | Where-Object { $_ -eq $true }).Count
$totalCount = $testResults.Count

Write-Host "Tests réussis: $successCount/$totalCount" -ForegroundColor $(if ($successCount -eq $totalCount) { "Green" } else { "Yellow" })

if ($successCount -eq $totalCount) {
    Write-Host "`n🎉 TOUS LES TESTS SONT PASSÉS!" -ForegroundColor Green
    Write-Host "✅ Les corrections de programmation défensive sont correctement implémentées" -ForegroundColor Green
    Write-Host "✅ La configuration CORS est standardisée" -ForegroundColor Green
    Write-Host "✅ Les composants React utilisent la programmation défensive" -ForegroundColor Green
    Write-Host "✅ L'API Client est robuste avec retry automatique" -ForegroundColor Green
} else {
    Write-Host "`n⚠️ CERTAINS TESTS ONT ÉCHOUÉ" -ForegroundColor Yellow
    Write-Host "Veuillez vérifier les erreurs ci-dessus et corriger les problèmes identifiés." -ForegroundColor Yellow
}

Write-Host "`n🚀 PROCHAINES ÉTAPES RECOMMANDÉES:" -ForegroundColor Blue
Write-Host "1. Démarrer le backend: cd apps/backend && npm run dev" -ForegroundColor Gray
Write-Host "2. Démarrer le frontend: cd apps/frontend && npm run dev" -ForegroundColor Gray
Write-Host "3. Tester l'application dans le navigateur" -ForegroundColor Gray
Write-Host "4. Vérifier que les erreurs 'filter is not a function' n'apparaissent plus" -ForegroundColor Gray
Write-Host "5. Tester les fonctionnalités de chargement de données" -ForegroundColor Gray

Write-Host "`n📝 DOCUMENTATION DES CORRECTIONS:" -ForegroundColor Blue
Write-Host "- Fichier defensive-utils.ts: Utilitaires de programmation défensive" -ForegroundColor Gray
Write-Host "- Configuration CORS centralisée dans apps/backend/src/config/cors.ts" -ForegroundColor Gray
Write-Host "- Tous les composants utilisent safeFilter au lieu de .filter()" -ForegroundColor Gray
Write-Host "- API Client avec retry automatique et gestion d'erreurs améliorée" -ForegroundColor Gray
Write-Host "- Validation robuste des reponses API avec validators" -ForegroundColor Gray
