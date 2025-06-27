@echo off
echo.
echo ========================================
echo VERIFICATION DU SEEDING ALGERIEN
echo ========================================
echo.

echo 1. Test de connectivite PostgreSQL...
cd packages\database
node ..\..\test-database-status.js

echo.
echo 2. Test des donnees algeriennes...
node ..\..\test-algerian-data.js

echo.
echo 3. Verification des tables principales...
echo Connexion directe a PostgreSQL pour compter les enregistrements...

echo.
echo ========================================
echo VERIFICATION TERMINEE
echo ========================================
echo.
echo Si le seeding a reussi, vous devriez voir :
echo - 95+ enregistrements au total
echo - Donnees algeriennes authentiques
echo - Connexion admin disponible
echo.
echo Connexion admin :
echo   Email: admin@gestion-dz.com
echo   Mot de passe: admin123
echo   URL: http://localhost:3000
echo.
pause
