@echo off
echo 🚀 Synchronisation de la base de données pour le module Stock...
echo.

echo 📁 Répertoire actuel: %CD%
echo.

echo 1️⃣ Génération du client Prisma...
npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur lors de la génération du client Prisma
    pause
    exit /b 1
)
echo ✅ Client Prisma généré avec succès
echo.

echo 2️⃣ Création de la migration...
npx prisma migrate dev --name add_stock_model_complete
if %ERRORLEVEL% neq 0 (
    echo ❌ Erreur lors de la création de la migration
    pause
    exit /b 1
)
echo ✅ Migration créée avec succès
echo.

echo 3️⃣ Vérification du statut...
npx prisma migrate status
echo.

echo 🎉 Synchronisation terminée avec succès !
echo 💡 Vous pouvez maintenant redémarrer le serveur backend
echo.
pause
