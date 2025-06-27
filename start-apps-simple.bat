@echo off
echo 🚀 DÉMARRAGE SIMPLE DES APPLICATIONS
echo ===================================

echo.
echo 📋 Arrêt des processus Node.js existants...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo.
echo 🔧 Démarrage du backend...
cd apps\backend
start "Backend Server" cmd /k "npm run dev"
cd ..\..

echo.
echo ⏳ Attente du démarrage du backend (10 secondes)...
timeout /t 10 >nul

echo.
echo 🌐 Démarrage du frontend...
cd apps\frontend

REM Créer le fichier .env.local
echo NEXT_PUBLIC_API_BASE_URL=http://localhost:3001 > .env.local
echo NEXT_PUBLIC_API_URL=http://localhost:3001 >> .env.local
echo NODE_ENV=development >> .env.local

start "Frontend Server" cmd /k "npm run dev"
cd ..\..

echo.
echo ✅ Applications démarrées !
echo.
echo 🌐 URLs d'accès:
echo   Frontend: http://localhost:3000
echo   Backend API: http://localhost:3001
echo   Health Check: http://localhost:3001/health
echo.
echo 🔐 Identifiants de test:
echo   Email: admin@gctpe.dz
echo   Mot de passe: admin123
echo.
echo ⚠️ Pour arrêter: Fermez les fenêtres de commande ou utilisez Ctrl+C
echo.
echo 📊 Test des connexions dans 15 secondes...
timeout /t 15 >nul

echo.
echo 🧪 Exécution du test des connexions API...
node test-api-quick.js

pause
