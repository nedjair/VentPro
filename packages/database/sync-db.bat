@echo off
echo 🔄 SYNCHRONISATION DE LA BASE DE DONNÉES
echo.

echo 📋 Formatage du schéma...
npx prisma format
if %errorlevel% neq 0 (
    echo ❌ Erreur lors du formatage
    pause
    exit /b 1
)

echo.
echo 🔄 Génération du client...
npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la génération
    pause
    exit /b 1
)

echo.
echo 🔄 Synchronisation avec la base de données...
npx prisma db push
if %errorlevel% neq 0 (
    echo ❌ Erreur lors de la synchronisation
    pause
    exit /b 1
)

echo.
echo ✅ SYNCHRONISATION TERMINÉE AVEC SUCCÈS !
echo 🚀 Le champ country a été ajouté à la base de données
pause
