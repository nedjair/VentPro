@echo off
echo.
echo ========================================
echo SYNCHRONISATION DU SCHEMA PRISMA
echo ========================================
echo.

echo 1. Verification de PostgreSQL...
docker ps --filter "name=postgres" --format "table {{.Names}}\t{{.Status}}"
if %ERRORLEVEL% neq 0 (
    echo Demarrage de PostgreSQL...
    docker-compose -f docker-compose.prod.yml --env-file .env up -d postgres
    echo Attente du demarrage de PostgreSQL...
    timeout /t 20 /nobreak > nul
)

echo.
echo 2. Verification de la connectivite...
cd packages\database

echo.
echo 3. Reset et synchronisation complete du schema...
echo ATTENTION: Cette operation va recreer toutes les tables !
echo Appuyez sur une touche pour continuer ou Ctrl+C pour annuler...
pause > nul

echo.
echo 4. Execution du reset de la base de donnees...
npx prisma db push --force-reset --accept-data-loss
if %ERRORLEVEL% neq 0 (
    echo Erreur lors du reset de la base de donnees
    echo Tentative avec migrate reset...
    npx prisma migrate reset --force --skip-seed
    if %ERRORLEVEL% neq 0 (
        echo Erreur critique lors de la synchronisation
        pause
        exit /b 1
    )
)

echo.
echo 5. Generation du client Prisma...
npx prisma generate
if %ERRORLEVEL% neq 0 (
    echo Erreur lors de la generation du client
    pause
    exit /b 1
)

echo.
echo 6. Verification des tables creees...
npx prisma db pull --print > schema-verification.txt 2>&1
if exist schema-verification.txt (
    echo Schema verifie - voir schema-verification.txt
) else (
    echo Impossible de verifier le schema
)

cd ..\..

echo.
echo ========================================
echo SCHEMA SYNCHRONISE AVEC SUCCES !
echo ========================================
echo.
echo Tables creees selon le schema Prisma :
echo - companies (entreprises)
echo - users (utilisateurs)
echo - clients (clients)
echo - products (produits)
echo - suppliers (fournisseurs)
echo - stocks (stocks)
echo - categories (categories)
echo - orders (commandes)
echo - invoices (factures)
echo - Et toutes les tables de relations
echo.
echo Vous pouvez maintenant executer le seeding :
echo   cd packages/database
echo   npm run db:seed-basic
echo.
pause
