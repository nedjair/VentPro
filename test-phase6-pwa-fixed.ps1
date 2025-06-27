# Script de test pour la Phase 6 - PWA et Mobilite
Write-Host "Tests de la Phase 6 - PWA et Mobilite" -ForegroundColor Cyan

# Fonction pour afficher les resultats de test
function Test-Feature {
    param (
        [string]$Feature,
        [bool]$Result,
        [string]$Details = ""
    )
    
    if ($Result) {
        Write-Host "  PASS: $Feature" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: $Feature" -ForegroundColor Red
        if ($Details) {
            Write-Host "     $Details" -ForegroundColor Yellow
        }
    }
}

# Verification des fichiers PWA
Write-Host "Verification des fichiers PWA..." -ForegroundColor Yellow

$manifestExists = Test-Path -Path "frontend-nextjs-production/public/manifest.json"
Test-Feature -Feature "Manifest.json" -Result $manifestExists -Details "Le fichier manifest.json est requis pour l'installation de la PWA"

$iconsExist = Test-Path -Path "frontend-nextjs-production/public/icons"
Test-Feature -Feature "Dossier d'icones" -Result $iconsExist -Details "Les icones sont necessaires pour l'installation de la PWA"

$nextConfigExists = Test-Path -Path "frontend-nextjs-production/next.config.mjs"
$nextConfigContent = Get-Content -Path "frontend-nextjs-production/next.config.mjs" -Raw
$hasPWAConfig = $nextConfigContent -match "withPWA"
Test-Feature -Feature "Configuration PWA dans next.config.mjs" -Result $hasPWAConfig -Details "La configuration PWA doit etre presente dans next.config.mjs"

# Verification des composants PWA
Write-Host "Verification des composants PWA..." -ForegroundColor Yellow

$offlineIndicatorExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/offline-indicator.tsx"
Test-Feature -Feature "Indicateur hors-ligne" -Result $offlineIndicatorExists -Details "L'indicateur hors-ligne est necessaire pour informer l'utilisateur"

$installPromptExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/install-prompt.tsx"
Test-Feature -Feature "Invite d'installation" -Result $installPromptExists -Details "L'invite d'installation est necessaire pour l'installation de la PWA"

$pwaProviderExists = Test-Path -Path "frontend-nextjs-production/src/components/pwa/pwa-provider.tsx"
Test-Feature -Feature "Provider PWA" -Result $pwaProviderExists -Details "Le provider PWA est necessaire pour la gestion du service worker"

# Verification des fonctionnalites hors-ligne
Write-Host "Verification des fonctionnalites hors-ligne..." -ForegroundColor Yellow

$offlineSyncExists = Test-Path -Path "frontend-nextjs-production/src/lib/offline-sync.ts"
Test-Feature -Feature "Synchronisation hors-ligne" -Result $offlineSyncExists -Details "La synchronisation hors-ligne est necessaire pour le mode hors-ligne"

$apiClientExists = Test-Path -Path "frontend-nextjs-production/src/lib/api-client.ts"
Test-Feature -Feature "Client API avec support hors-ligne" -Result $apiClientExists -Details "Le client API doit supporter le mode hors-ligne"

# Verification des fonctionnalites mobiles
Write-Host "Verification des fonctionnalites mobiles..." -ForegroundColor Yellow

$barcodeScannerExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/barcode-scanner.tsx"
Test-Feature -Feature "Scanner de codes-barres" -Result $barcodeScannerExists -Details "Le scanner de codes-barres est necessaire pour la gestion de stock mobile"

$geolocationExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/geolocation.tsx"
Test-Feature -Feature "Geolocalisation" -Result $geolocationExists -Details "La geolocalisation est necessaire pour les visites clients"

$mobileNavigationExists = Test-Path -Path "frontend-nextjs-production/src/components/mobile/mobile-navigation.tsx"
Test-Feature -Feature "Navigation mobile" -Result $mobileNavigationExists -Details "La navigation mobile est necessaire pour l'interface mobile"

# Verification des pages mobiles
Write-Host "Verification des pages mobiles..." -ForegroundColor Yellow

$mobileDashboardExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/dashboard/page.tsx"
Test-Feature -Feature "Dashboard mobile" -Result $mobileDashboardExists -Details "Le dashboard mobile est necessaire pour l'interface mobile"

$mobileInventoryExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/inventory/page.tsx"
Test-Feature -Feature "Gestion de stock mobile" -Result $mobileInventoryExists -Details "La gestion de stock mobile est necessaire pour le scan de codes-barres"

$mobileVisitsExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/visits/page.tsx"
Test-Feature -Feature "Visites clients mobile" -Result $mobileVisitsExists -Details "Les visites clients mobiles sont necessaires pour la geolocalisation"

$mobileSettingsExists = Test-Path -Path "frontend-nextjs-production/src/app/mobile/settings/page.tsx"
Test-Feature -Feature "Parametres mobiles" -Result $mobileSettingsExists -Details "Les parametres mobiles sont necessaires pour la configuration de la PWA"

# Verification des notifications
Write-Host "Verification des notifications..." -ForegroundColor Yellow

$notificationsExists = Test-Path -Path "frontend-nextjs-production/src/lib/notifications.ts"
Test-Feature -Feature "Systeme de notifications" -Result $notificationsExists -Details "Le systeme de notifications est necessaire pour les alertes"

$useNotificationsExists = Test-Path -Path "frontend-nextjs-production/src/hooks/use-notifications.ts"
Test-Feature -Feature "Hook de notifications" -Result $useNotificationsExists -Details "Le hook de notifications est necessaire pour l'utilisation des notifications"

# Verification de la documentation
Write-Host "Verification de la documentation..." -ForegroundColor Yellow

$phase6DocExists = Test-Path -Path "PHASE6_PWA_COMPLETE.md"
Test-Feature -Feature "Documentation Phase 6" -Result $phase6DocExists -Details "La documentation de la Phase 6 est necessaire pour les utilisateurs"

$startScriptExists = Test-Path -Path "start-phase6-pwa.ps1"
Test-Feature -Feature "Script de demarrage" -Result $startScriptExists -Details "Le script de demarrage est necessaire pour le lancement de la Phase 6"

# Resume des tests
Write-Host "Resume des tests" -ForegroundColor Cyan

$allTests = @(
    $manifestExists, $iconsExist, $hasPWAConfig,
    $offlineIndicatorExists, $installPromptExists, $pwaProviderExists,
    $offlineSyncExists, $apiClientExists,
    $barcodeScannerExists, $geolocationExists, $mobileNavigationExists,
    $mobileDashboardExists, $mobileInventoryExists, $mobileVisitsExists, $mobileSettingsExists,
    $notificationsExists, $useNotificationsExists,
    $phase6DocExists, $startScriptExists
)
$totalTests = $allTests.Count
$passedTests = $allTests | Where-Object { $_ -eq $true } | Measure-Object | Select-Object -ExpandProperty Count

$passRate = [math]::Round(($passedTests / $totalTests) * 100)

Write-Host "Tests reussis: $passedTests / $totalTests ($passRate%)" -ForegroundColor $(if ($passRate -eq 100) { "Green" } elseif ($passRate -ge 80) { "Yellow" } else { "Red" })

# Conclusion
if ($passRate -eq 100) {
    Write-Host "Tous les tests sont passes! La Phase 6 - PWA et Mobilite est prete." -ForegroundColor Green
    Write-Host "Vous pouvez demarrer l'application avec: .\start-phase6-pwa.ps1" -ForegroundColor Cyan
} elseif ($passRate -ge 80) {
    Write-Host "La plupart des tests sont passes, mais certains ont echoue. Veuillez corriger les problemes avant de deployer." -ForegroundColor Yellow
} else {
    Write-Host "Plusieurs tests ont echoue. La Phase 6 - PWA et Mobilite n'est pas prete pour le deploiement." -ForegroundColor Red
}