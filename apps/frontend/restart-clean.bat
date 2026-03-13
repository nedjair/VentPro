@echo off
echo 🔄 Redémarrage propre de l'application Next.js...
echo ======================================================================

echo.
echo 🛑 Arrêt des processus existants...
taskkill /f /im node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Processus Node.js arrêtés
) else (
    echo    ℹ️ Aucun processus à arrêter
)

echo.
echo 🧹 Nettoyage des caches...
if exist ".next" (
    rmdir /s /q ".next" >nul 2>&1
    echo    ✅ .next supprimé
) else (
    echo    ℹ️ .next n'existe pas
)

if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache" >nul 2>&1
    echo    ✅ node_modules\.cache supprimé
) else (
    echo    ℹ️ node_modules\.cache n'existe pas
)

echo.
echo 🔧 Vérification de la configuration...
if exist "next.config.mjs" (
    echo    ✅ Configuration Next.js trouvée
) else (
    echo    ⚠️ Configuration Next.js manquante
)

if exist "package.json" (
    echo    ✅ package.json trouvé
) else (
    echo    ❌ package.json manquant
    pause
    exit /b 1
)

echo.
echo 🚀 Redémarrage de l'application...
echo    📡 Démarrage du serveur de développement...
echo    🌐 L'application sera disponible sur http://localhost:3002
echo.
echo ======================================================================
echo ✅ REDÉMARRAGE TERMINÉ
echo ======================================================================
echo.

npm run dev
