@echo off
echo 🧹 Nettoyage et régénération du client Prisma...
echo.

echo 1️⃣ Arrêt des processus Node.js...
taskkill /f /im node.exe 2>nul
timeout /t 3 /nobreak >nul

echo 2️⃣ Suppression du dossier generated...
if exist "generated" (
    rmdir /s /q "generated" 2>nul
    if exist "generated" (
        echo ⚠️ Impossible de supprimer generated, tentative avec attrib...
        attrib -r -h -s "generated\*.*" /s /d 2>nul
        rmdir /s /q "generated" 2>nul
    )
)

echo 3️⃣ Nettoyage du cache npm...
npm cache clean --force 2>nul

echo 4️⃣ Suppression des fichiers temporaires...
del /q /f *.tmp* 2>nul
del /q /f node_modules\.prisma\client\*.tmp* 2>nul

echo 5️⃣ Génération du client Prisma...
npx prisma generate

if %ERRORLEVEL% equ 0 (
    echo ✅ Client Prisma généré avec succès !
) else (
    echo ❌ Erreur lors de la génération
    echo 💡 Essayez de redémarrer Windows et relancer ce script
)

echo.
pause
