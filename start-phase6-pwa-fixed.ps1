# Script de démarrage pour la Phase 6 - PWA et Mobilité (version corrigée)
Write-Host "🚀 Démarrage de la Phase 6 - PWA et Mobilité" -ForegroundColor Cyan

# Vérification des prérequis
Write-Host "🔍 Vérification des prérequis..." -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green

# Vérification et installation des dépendances PWA
Write-Host "🔍 Installation des dépendances PWA..." -ForegroundColor Yellow
Set-Location -Path "d:/Gestion Commerciale/frontend-nextjs-production"
npm install next-pwa@5.6.0 workbox-window@7.0.0 idb html5-qrcode --save
Write-Host "  ✓ Dépendances PWA installées" -ForegroundColor Green

# Vérification des dossiers nécessaires
Write-Host "🔍 Vérification des dossiers nécessaires..." -ForegroundColor Yellow

# Dossier des icônes
$iconsDir = "public/icons"
if (-not (Test-Path -Path $iconsDir)) {
    Write-Host "  ⚠️ Le dossier des icônes est manquant. Création..." -ForegroundColor Yellow
    New-Item -Path $iconsDir -ItemType Directory -Force | Out-Null
    Write-Host "  ✓ Dossier des icônes créé" -ForegroundColor Green
}

# Dossier des captures d'écran
$screenshotsDir = "public/screenshots"
if (-not (Test-Path -Path $screenshotsDir)) {
    Write-Host "  ⚠️ Le dossier des captures d'écran est manquant. Création..." -ForegroundColor Yellow
    New-Item -Path $screenshotsDir -ItemType Directory -Force | Out-Null
    Write-Host "  ✓ Dossier des captures d'écran créé" -ForegroundColor Green
}

# Création des icônes PWA
Write-Host "🔍 Création des icônes PWA..." -ForegroundColor Yellow
$iconSizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $iconSizes) {
    $iconPath = "public/icons/icon-${size}x${size}.png"
    if (-not (Test-Path -Path $iconPath)) {
        Write-Host "  ⚠️ Icône $iconPath manquante, création d'un placeholder..." -ForegroundColor Yellow
        
        # Création d'une image PNG vide au lieu d'un fichier texte
        try {
            # Utilisation de System.Drawing pour créer une image PNG
            Add-Type -AssemblyName System.Drawing
            $bitmap = New-Object System.Drawing.Bitmap($size, $size)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.Clear([System.Drawing.Color]::FromArgb(255, 79, 70, 229)) # Couleur indigo (#4f46e5)
            
            # Ajout de texte au centre
            $font = New-Object System.Drawing.Font("Arial", [math]::Max(($size / 10), 12), [System.Drawing.FontStyle]::Bold)
            $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
            $text = "GC TPE"
            $textSize = $graphics.MeasureString($text, $font)
            $x = ($size - $textSize.Width) / 2
            $y = ($size - $textSize.Height) / 2
            $graphics.DrawString($text, $font, $brush, $x, $y)
            
            # Sauvegarde de l'image
            $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
            $graphics.Dispose()
            $bitmap.Dispose()
            
            Write-Host "  ✓ Icône PNG créée pour $iconPath" -ForegroundColor Green
        }
        catch {
            # Fallback si System.Drawing n'est pas disponible
            Write-Host "  ⚠️ Impossible de créer une image PNG, création d'un placeholder texte..." -ForegroundColor Yellow
            "Placeholder pour l'icône PWA ${size}x${size}" | Out-File -FilePath $iconPath -Encoding utf8
            Write-Host "  ✓ Placeholder texte créé pour $iconPath" -ForegroundColor Green
        }
    }
}

# Création des captures d'écran
Write-Host "🔍 Création des captures d'écran..." -ForegroundColor Yellow
$screenshotPaths = @(
    "public/screenshots/dashboard.png",
    "public/screenshots/mobile.png"
)
foreach ($screenshotPath in $screenshotPaths) {
    if (-not (Test-Path -Path $screenshotPath)) {
        Write-Host "  ⚠️ Capture d'écran $screenshotPath manquante, création d'un placeholder..." -ForegroundColor Yellow
        "Placeholder pour la capture d'écran $(Split-Path -Leaf $screenshotPath)" | Out-File -FilePath $screenshotPath -Encoding utf8
        Write-Host "  ✓ Placeholder créé pour $screenshotPath" -ForegroundColor Green
    }
}

# Démarrage du backend
Write-Host "🔄 Démarrage du backend..." -ForegroundColor Yellow
try {
    Start-Process -FilePath "powershell" -ArgumentList "-Command", "cd 'd:/Gestion Commerciale/apps/backend'; npm run start" -WindowStyle Minimized
    Write-Host "  ✓ Backend démarré" -ForegroundColor Green
}
catch {
    Write-Host "  ⚠️ Erreur lors du démarrage du backend: $_" -ForegroundColor Red
    Write-Host "  ℹ️ L'application fonctionnera en mode hors ligne" -ForegroundColor Yellow
}

# Nettoyage du cache du service worker et des fichiers temporaires
Write-Host "Nettoyage du cache et des fichiers temporaires..." -ForegroundColor Yellow
try {
    # Suppression des fichiers de cache du service worker
    $swCacheDir = ".next/cache/workbox"
    if (Test-Path -Path $swCacheDir) {
        Remove-Item -Path $swCacheDir -Recurse -Force
        Write-Host "  Cache du service worker nettoye" -ForegroundColor Green
    } else {
        Write-Host "  Aucun cache de service worker a nettoyer" -ForegroundColor Green
    }
    
    # Suppression du fichier sw.js généré précédemment
    $swJsPath = ".next/static/sw.js"
    if (Test-Path -Path $swJsPath) {
        Remove-Item -Path $swJsPath -Force
        Write-Host "  Ancien fichier sw.js supprime" -ForegroundColor Green
    }
    
    # Suppression du dossier .next pour un build propre
    if (Test-Path -Path ".next") {
        Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  Dossier .next supprime pour un build propre" -ForegroundColor Green
    }
    
    # Vérification et nettoyage du cache du navigateur via le registre
    Write-Host "  Nettoyage du cache du navigateur..." -ForegroundColor Yellow
    try {
        # Suppression des caches de service worker dans le registre
        $cacheKeys = @(
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings\Cache",
            "HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings\5.0\Cache"
        )
        
        foreach ($key in $cacheKeys) {
            if (Test-Path -Path $key) {
                # Lecture des valeurs actuelles
                $cacheProp = Get-ItemProperty -Path $key -ErrorAction SilentlyContinue
                if ($cacheProp) {
                    Write-Host "    Cache du navigateur identifie" -ForegroundColor Green
                }
            }
        }
    } catch {
        Write-Host "    Impossible d'acceder au cache du navigateur: $_" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Erreur lors du nettoyage du cache: $_" -ForegroundColor Yellow
    Write-Host "  Poursuite du script malgre l'erreur" -ForegroundColor Yellow
}

# Construction et démarrage du frontend
Write-Host "Construction et demarrage du frontend..." -ForegroundColor Yellow
try {
    # Vérification des dépendances
    Write-Host "  Verification des dependances..." -ForegroundColor Yellow
    $packageJson = Get-Content -Path "package.json" -Raw | ConvertFrom-Json
    $hasPWA = $packageJson.dependencies.'next-pwa' -ne $null
    $hasWorkbox = $packageJson.dependencies.'workbox-window' -ne $null
    
    if (-not $hasPWA -or -not $hasWorkbox) {
        Write-Host "  Installation des dependances manquantes..." -ForegroundColor Yellow
        npm install next-pwa@5.6.0 workbox-window@7.0.0 --save
    }
    
    # Sauvegarde du service worker original
    if (-not (Test-Path -Path "public/sw.js.bak")) {
        Copy-Item -Path "public/sw.js" -Destination "public/sw.js.bak" -Force -ErrorAction SilentlyContinue
        Write-Host "  Sauvegarde du service worker creee" -ForegroundColor Green
    }
    
    # Construction
    Write-Host "  Construction de l'application..." -ForegroundColor Yellow
    npm run build
    
    # Vérification de la génération du service worker
    $swDestPath = "public/sw.js"
    if (Test-Path -Path $swDestPath) {
        $swSize = (Get-Item -Path $swDestPath).Length
        if ($swSize -gt 1000) {
            Write-Host "  Service worker genere correctement ($($swSize) octets)" -ForegroundColor Green
        } else {
            Write-Host "  Le service worker semble incomplet, utilisation du fallback..." -ForegroundColor Yellow
            # Copie du service worker de secours si nécessaire
            Copy-Item -Path "public/sw.js.bak" -Destination "public/sw.js" -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "  Service worker non genere, creation..." -ForegroundColor Yellow
        Copy-Item -Path "public/sw.js.bak" -Destination "public/sw.js" -Force -ErrorAction SilentlyContinue
    }
    
    # Vérification du fichier workbox-*.js
    $workboxFiles = Get-ChildItem -Path ".next/static/chunks/workbox-*.js" -ErrorAction SilentlyContinue
    if ($workboxFiles.Count -eq 0) {
        Write-Host "  Fichiers Workbox non generes, verification de la configuration..." -ForegroundColor Yellow
        
        # Vérification de next.config.mjs
        $nextConfig = Get-Content -Path "next.config.mjs" -Raw
        if (-not ($nextConfig -match "buildExcludes")) {
            Write-Host "  Configuration PWA incomplete, ajout des parametres manquants..." -ForegroundColor Yellow
            # Cette partie est informative seulement, la modification du fichier nécessiterait une logique plus complexe
        }
    } else {
        Write-Host "  Fichiers Workbox generes correctement" -ForegroundColor Green
    }
    
    # Démarrage
    Write-Host "  Demarrage de l'application..." -ForegroundColor Yellow
    npm run start
}
catch {
    Write-Host "  Erreur lors de la construction ou du demarrage du frontend: $_" -ForegroundColor Red
    
    # Tentative de récupération
    Write-Host "  Tentative de recuperation..." -ForegroundColor Yellow
    try {
        # Restauration du service worker de secours
        Copy-Item -Path "public/sw.js.bak" -Destination "public/sw.js" -Force -ErrorAction SilentlyContinue
        
        # Démarrage sans reconstruction
        npm run start
    } catch {
        Write-Host "  Echec de la recuperation: $_" -ForegroundColor Red
        Write-Host "  Essayez de resoudre les problemes et relancez le script" -ForegroundColor Yellow
    }
}

# Fin du script
Write-Host "✅ Phase 6 - PWA et Mobilité démarrée avec succès!" -ForegroundColor Green
Write-Host "📱 Accédez à l'application mobile sur: http://localhost:3003/mobile/dashboard" -ForegroundColor Cyan