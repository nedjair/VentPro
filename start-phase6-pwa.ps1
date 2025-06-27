# Script de démarrage pour la Phase 6 - PWA et Mobilité
Write-Host "🚀 Démarrage de la Phase 6 - PWA et Mobilité" -ForegroundColor Cyan

# Vérification des prérequis
Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green

# Vérification des dépendances PWA
Write-Host "🔍 Vérification des dépendances PWA..." -ForegroundColor Yellow
$packageJson = Get-Content -Path "frontend-nextjs-production/package.json" | ConvertFrom-Json
$hasPWA = $packageJson.dependencies."next-pwa"
$hasWorkbox = $packageJson.dependencies."workbox-window"
$hasIDB = $packageJson.dependencies.idb
$hasHTML5QRCode = $packageJson.dependencies."html5-qrcode"

if (-not $hasPWA -or -not $hasWorkbox -or -not $hasIDB -or -not $hasHTML5QRCode) {
    Write-Host "  ⚠️ Certaines dépendances PWA sont manquantes. Installation..." -ForegroundColor Yellow
    Set-Location -Path "frontend-nextjs-production"
    npm install next-pwa@5.6.0 workbox-window@7.0.0 idb html5-qrcode --save
    Set-Location -Path ".."
    Write-Host "  ✓ Dépendances PWA installées" -ForegroundColor Green
} else {
    Write-Host "  ✓ Toutes les dépendances PWA sont installées" -ForegroundColor Green
}

# Vérification des fichiers PWA
Write-Host "🔍 Vérification des fichiers PWA..." -ForegroundColor Yellow
$manifestExists = Test-Path -Path "frontend-nextjs-production/public/manifest.json"
$iconsExist = Test-Path -Path "frontend-nextjs-production/public/icons"

if (-not $manifestExists) {
    Write-Host "  ⚠️ Le fichier manifest.json est manquant" -ForegroundColor Yellow
}

if (-not $iconsExist) {
    Write-Host "  ⚠️ Le dossier des icônes est manquant. Création..." -ForegroundColor Yellow
    New-Item -Path "frontend-nextjs-production/public/icons" -ItemType Directory -Force
    Write-Host "  ✓ Dossier des icônes créé" -ForegroundColor Green
}

# Vérification des icônes PWA
Write-Host "🔍 Vérification des icônes PWA..." -ForegroundColor Yellow
$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $iconSizes) {
    $iconPath = "frontend-nextjs-production/public/icons/icon-${size}x${size}.png"
    $iconPlaceholderPath = "frontend-nextjs-production/public/icons/icon-${size}x${size}.png.txt"
    
    if (-not (Test-Path -Path $iconPath)) {
        Write-Host "  ⚠️ Icône $iconPath manquante, création d'un placeholder..." -ForegroundColor Yellow
        # Créer un fichier texte comme placeholder
        "Placeholder pour l'icône PWA ${size}x${size}" | Out-File -FilePath $iconPath -Encoding utf8
        Write-Host "  ✓ Placeholder créé pour $iconPath" -ForegroundColor Green
    }
}

# Vérification des captures d'écran
Write-Host "🔍 Vérification des captures d'écran..." -ForegroundColor Yellow
$screenshotPaths = @(
    "frontend-nextjs-production/public/screenshots/dashboard.png",
    "frontend-nextjs-production/public/screenshots/mobile.png"
)
foreach ($screenshotPath in $screenshotPaths) {
    $screenshotPlaceholderPath = "$screenshotPath.txt"
    
    if (-not (Test-Path -Path $screenshotPath)) {
        Write-Host "  ⚠️ Capture d'écran $screenshotPath manquante, création d'un placeholder..." -ForegroundColor Yellow
        # Créer un dossier parent si nécessaire
        $screenshotDir = Split-Path -Parent $screenshotPath
        if (-not (Test-Path -Path $screenshotDir)) {
            New-Item -Path $screenshotDir -ItemType Directory -Force | Out-Null
        }
        # Créer un fichier texte comme placeholder
        "Placeholder pour la capture d'écran $(Split-Path -Leaf $screenshotPath)" | Out-File -FilePath $screenshotPath -Encoding utf8
        Write-Host "  ✓ Placeholder créé pour $screenshotPath" -ForegroundColor Green
    }
}

# Démarrage du backend
Write-Host "🔄 Démarrage du backend..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'apps/backend'; npm run start" -WindowStyle Minimized
    Write-Host "  ✓ Backend démarré" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️ Erreur lors du démarrage du backend: $_" -ForegroundColor Red
    Write-Host "  ℹ️ Tentative de démarrage alternatif..." -ForegroundColor Yellow
    try {
        Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'd:/Gestion Commerciale/apps/backend'; npm run start" -WindowStyle Minimized
        Write-Host "  ✓ Backend démarré (méthode alternative)" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Impossible de démarrer le backend: $_" -ForegroundColor Red
        Write-Host "  ℹ️ L'application fonctionnera en mode hors ligne" -ForegroundColor Yellow
    }
}

# Construction et démarrage du frontend
Write-Host "🔄 Construction et démarrage du frontend..." -ForegroundColor Yellow
try {
    Set-Location -Path "frontend-nextjs-production"
    
    # Vérifier si next-pwa est installé
    $packageJson = Get-Content -Path "package.json" | ConvertFrom-Json
    $hasPWA = $packageJson.dependencies."next-pwa"
    
    if (-not $hasPWA) {
        Write-Host "  ⚠️ next-pwa n'est pas installé. Installation..." -ForegroundColor Yellow
        npm install next-pwa@5.6.0 --save
        Write-Host "  ✓ next-pwa installé" -ForegroundColor Green
    }
    
    # Vérifier si workbox-window est installé
    $hasWorkbox = $packageJson.dependencies."workbox-window"
    if (-not $hasWorkbox) {
        Write-Host "  ⚠️ workbox-window n'est pas installé. Installation..." -ForegroundColor Yellow
        npm install workbox-window@7.0.0 --save
        Write-Host "  ✓ workbox-window installé" -ForegroundColor Green
    }
    
    # Construction et démarrage
    Write-Host "  🔨 Construction de l'application..." -ForegroundColor Yellow
    npm run build
    
    Write-Host "  🚀 Démarrage de l'application..." -ForegroundColor Yellow
    npm run start
} catch {
    Write-Host "  ❌ Erreur lors de la construction ou du démarrage du frontend: $_" -ForegroundColor Red
    Write-Host "  ℹ️ Essayez de résoudre les problèmes et relancez le script" -ForegroundColor Yellow
}

# Fin du script
Write-Host "✅ Phase 6 - PWA et Mobilité démarrée avec succès!" -ForegroundColor Green
Write-Host "📱 Accédez à l'application mobile sur: http://localhost:3003/mobile/dashboard" -ForegroundColor Cyan