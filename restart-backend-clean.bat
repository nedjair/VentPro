@echo off
echo 🔄 REDÉMARRAGE PROPRE DU BACKEND
echo.

echo 1️⃣ Arrêt de tous les processus Node.js...
taskkill /F /IM node.exe >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Processus Node.js arrêtés
) else (
    echo    ℹ️ Aucun processus Node.js à arrêter
)

echo.
echo 2️⃣ Vérification du port 3001...
netstat -ano | findstr :3001 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ⚠️ Port 3001 encore utilisé, tentative de libération...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        echo    🔫 Arrêt du processus PID %%a...
        taskkill /F /PID %%a >nul 2>&1
    )
) else (
    echo    ✅ Port 3001 libre
)

echo.
echo 3️⃣ Attente de 3 secondes...
timeout /t 3 /nobreak >nul

echo.
echo 4️⃣ Démarrage du serveur backend...
cd /d "d:\Gestion Commerciale\apps\backend"
echo    📁 Répertoire: %CD%
echo    🚀 Lancement de npm run dev...
echo.

start "Backend Server" cmd /k "npm run dev"

echo ✅ REDÉMARRAGE TERMINÉ !
echo 🔍 Une nouvelle fenêtre de terminal s'est ouverte avec le serveur backend
echo 📊 Vérifiez que le serveur démarre sans erreur
pause
