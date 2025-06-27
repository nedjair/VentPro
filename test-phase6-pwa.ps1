# Script de test pour la Phase 6 - PWA et Mobilité
Write-Host "🧪 Tests de la Phase 6 - PWA et Mobilité" -ForegroundColor Cyan

# Fonction pour afficher les résultats de test
function Test-Feature {
    param (
        [string]$Feature,
        [bool]$Result,
        [string]$Details = ""
    )
    
    if ($Result) {
        Write-Host "  ✅ $Feature" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $Feature" -ForegroundColor Red
        if ($Details) {
            Write-Host "     $Details" -ForegroundColor Yellow
        }
    }
}

# Vérification des fichiers PWA
Write-Host "🔍 Vérification des fichiers PWA..." -ForegroundColor Yellow

$manifestExists = Test-Path -Path "frontend-nextjs-production/public/manifest.json"
Test-Feature -Feature "Manifest.json" -Result $manifestExists -Details "Le fichier manifest.json est requis pour l'installation de la PWA"

$iconsExist = Test-Path -Path "frontend-nextjs-production/public/icons"
Test-Feature -Feature "Dossier d'icônes" -Result $iconsExist -Details "Les icônes sont nécessaires pour l'installation de la PWA"

$nextConfigExists = Test-Path -Path "frontend-nextjs-production/next.config.mjs"
$nextConfigContent = Get-Content -Path "frontend-nextjs-production/next.config.mjs" -Raw
$hasPWAConfig = $nextConfigContent -match "withPWA"
Test-Feature -Feature "Configuration PWA dans next.config.mjs" -Result $hasPWAConfig -Details "La configuration PWA doit être présente dans next.config.mjs"

# Vérification des composants PWA
Write-Host "🔍 Vérification des composants PWA..." -ForegroundColor Yellow

$offlineIndicatorExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/offline-indicator.tsx"
Test-Feature -Feature "Indicateur hors-ligne" -Result $offlineIndicatorExists -Details "L'indicateur hors-ligne est nécessaire pour informer l'utilisateur"

$installPromptExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/install-prompt.tsx"
Test-Feature -Feature "Invite d'installation" -Result $installPromptExists -Details "L'invite d'installation est nécessaire pour l'installation de la PWA"

$pwaProviderExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/pwa-provider.tsx"
Test-Feature -Feature "Provider PWA" -Result $pwaProviderExists -Details "Le provider PWA est nécessaire pour la gestion du service worker"

# Vérification des fonctionnalités hors-ligne
Write-Host "🔍 Vérification des fonctionnalités hors-ligne..." -ForegroundColor Yellow

$offlineSyncExists = Test-Path -Path "frontend-nextjs-production/src/lib/offline-sync.ts"
Test-Feature -Feature "Synchronisation hors-ligne" -Result $offlineSyncExists -Details "La synchronisation hors-ligne est nécessaire pour le mode hors-ligne"

$apiClientExists = Test-Path -Path "frontend-nextjs-production/src/lib/api-client.ts"
Test-Feature -Feature "Client API avec support hors-ligne" -Result $apiClientExists -Details "Le client API doit supporter le mode hors-ligne"

# Vérification des fonctionnalités mobiles
Write-Host "🔍 Vérification des fonctionnalités mobiles..." -ForegroundColor Yellow

$barcodeScannerExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/barcode-scanner.tsx"
Test-Feature -Feature "Scanner de codes-barres" -Result $barcodeScannerExists -Details "Le scanner de codes-barres est nécessaire pour la gestion de stock mobile"

$geolocationExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/geolocation.tsx"
Test-Feature -Feature "Géolocalisation" -Result $geolocationExists -Details "La géolocalisation est nécessaire pour les visites clients"

$mobileNavigationExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/mobile-navigation.tsx"
Test-Feature -Feature "Navigation mobile" -Result $mobileNavigationExists -Details "La navigation mobile est nécessaire pour l'interface mobile"

# Vérification des pages mobiles
Write-Host "🔍 Vérification des pages mobiles..." -ForegroundColor Yellow

$mobileDashboardExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/dashboard/page.tsx"
Test-Feature -Feature "Dashboard mobile" -Result $mobileDashboardExists -Details "Le dashboard mobile est nécessaire pour l'interface mobile"

$mobileInventoryExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/inventory/page.tsx"
Test-Feature -Feature "Gestion de stock mobile" -Result $mobileInventoryExists -Details "La gestion de stock mobile est nécessaire pour le scan de codes-barres"

$mobileVisitsExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/visits/page.tsx"
Test-Feature -Feature "Visites clients mobile" -Result $mobileVisitsExists -Details "Les visites clients mobiles sont nécessaires pour la géolocalisation"

$mobileSettingsExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/settings/page.tsx"
Test-Feature -Feature "Paramètres mobiles" -Result $mobileSettingsExists -Details "Les paramètres mobiles sont nécessaires pour la configuration de la PWA"

# Vérification des notifications
Write-Host "🔍 Vérification des notifications..." -ForegroundColor Yellow

$notificationsExists = Test-Path -Path "frontend-nextjs-production/src/lib/notifications.ts"
Test-Feature -Feature "Système de notifications" -Result $notificationsExists -Details "Le système de notifications est nécessaire pour les alertes"

$useNotificationsExists = Test-Path -Path "frontend-nextjs-production/src/hooks/use-notifications.ts"
Test-Feature -Feature "Hook de notifications" -Result $useNotificationsExists -Details "Le hook de notifications est nécessaire pour l'utilisation des notifications"

# Vérification de la documentation
Write-Host "🔍 Vérification de la documentation..." -ForegroundColor Yellow

$phase6DocExists = Test-Path -Path "PHASE6_PWA_COMPLETE.md"
Test-Feature -Feature "Documentation Phase 6" -Result $phase6DocExists -Details "La documentation de la Phase 6 est nécessaire pour les utilisateurs"

$startScriptExists = Test-Path -Path "start-phase6-pwa.ps1"
Test-Feature -Feature "Script de démarrage" -Result $startScriptExists -Details "Le script de démarrage est nécessaire pour le lancement de la Phase 6"

# Résumé des tests
Write-Host "`n📊 Résumé des tests" -ForegroundColor Cyan

$totalTests = 18
$passedTests = @(
    $manifestExists, $iconsExist, $hasPWAConfig,
    $offlineIndicatorExists, $installPromptExists, $pwaProviderExists,
    $offlineSyncExists, $apiClientExists,
    $barcodeScannerExists, $geolocationExists, $mobileNavigationExists,
    $mobileDashboardExists, $mobileInventoryExists, $mobileVisitsExists, $mobileSettingsExists,
    $notificationsExists, $useNotificationsExists,
    $phase6DocExists, $startScriptExists
) | Where-Object { $_ -eq $true } | Measure-Object | Select-Object -ExpandProperty Count

$passRate = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "Tests réussis: $passedTests / $totalTests ($passRate%)" -ForegroundColor $(if ($passRate -eq 100) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })

# Conclusion
if ($passRate -eq 100) {
    Write-Host "`n🎉 Tous les tests sont passés! La Phase 6 - PWA et Mobilité est prête." -ForegroundColor Green
    Write-Host "📱 Vous pouvez démarrer l'application avec: .\start-phase6-pwa.ps1" -ForegroundColor Cyan
} elseif ($passRate -ge 80) {
    Write-Host "`n⚠️ La plupart des tests sont passés, mais certains ont échoué. Veuillez corriger les problèmes avant de déployer." -ForegroundColor Yellow
} else {
    Write-Host "`n❌ Plusieurs tests ont échoué. La Phase 6 - PWA et Mobilité n'est pas prête pour le déploiement." -ForegroundColor Red
}