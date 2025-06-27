@echo off
echo 🚀 Démarrage du serveur backend...
echo.

echo 1️⃣ Nettoyage des fichiers temporaires...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo 2️⃣ Nettoyage du dossier generated...
cd "..\..\packages\database"
if exist "generated" (
    rmdir /s /q "generated" 2>nul
)

echo 3️⃣ Génération du client Prisma...
npx prisma generate --schema=schema.prisma
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur lors de la génération du client Prisma
    echo 💡 Essayez de redémarrer Windows et relancer ce script
    pause
    exit /b 1
)

echo 4️⃣ Démarrage du serveur...
cd "..\..\apps\backend"
npm run dev:skip-generate

pause
