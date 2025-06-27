@echo off
echo 🧹 Nettoyage et redémarrage complet...
echo.

echo 1️⃣ Arrêt de tous les processus Node.js...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul

echo 2️⃣ Nettoyage des caches Next.js...
cd "apps\frontend"
if exist ".next" (
    rmdir /s /q ".next" 2>nul
    echo ✅ Cache Next.js supprimé
)

echo 3️⃣ Nettoyage du cache Prisma...
cd "..\..\"
cd "packages\database"
if exist "generated" (
    rmdir /s /q "generated" 2>nul
    echo ✅ Cache Prisma supprimé
)

echo 4️⃣ Régénération du client Prisma...
npx prisma generate --schema=schema.prisma
if %ERRORLEVEL% equ 0 (
    echo ✅ Client Prisma régénéré
) else (
    echo ❌ Erreur lors de la génération Prisma
)

echo 5️⃣ Démarrage du backend...
cd "..\..\apps\backend"
start "Backend Server" cmd /k "npm run dev:skip-generate"
timeout /t 5 /nobreak >nul

echo 6️⃣ Démarrage du frontend...
cd "..\frontend"
start "Frontend Server" cmd /k "npm run dev"

echo.
echo 🎉 Redémarrage terminé !
echo 💡 Attendez quelques secondes puis ouvrez:
echo    - Frontend: http://localhost:3000
echo    - Backend:  http://localhost:3001
echo.
pause
