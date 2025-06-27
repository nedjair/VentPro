@echo off
echo 🔍 VÉRIFICATION SIMPLE - MODULE STOCKS
echo =====================================

echo.
echo 1️⃣ Test Frontend (port 3000)...
echo Ouverture de la page d'accueil...
start http://localhost:3000
timeout /t 2 /nobreak >nul

echo.
echo 2️⃣ Test Backend (port 3001)...
echo Ouverture de l'API info...
start http://localhost:3001/api
timeout /t 2 /nobreak >nul

echo.
echo 3️⃣ Test Page Stocks Simple...
echo Ouverture de la page de test...
start http://localhost:3000/stocks-simple
timeout /t 2 /nobreak >nul

echo.
echo 4️⃣ Test Page Inscription...
echo Ouverture du formulaire d'inscription...
start http://localhost:3000/auth/register
timeout /t 2 /nobreak >nul

echo.
echo 5️⃣ Test Page Nouveau Produit...
echo Ouverture du formulaire de création de produit...
start http://localhost:3000/products/new
timeout /t 2 /nobreak >nul

echo.
echo =====================================
echo ✅ VÉRIFICATIONS À EFFECTUER :
echo.
echo 1. Page d'accueil : Doit s'afficher normalement
echo 2. API Backend : Doit afficher du JSON
echo 3. Page Stocks Simple : Doit afficher "Test Stock Simple"
echo 4. Page Inscription : Doit afficher le formulaire
echo 5. Page Nouveau Produit : Doit afficher le formulaire
echo.
echo 🎯 OBJECTIF :
echo Si toutes les pages s'ouvrent correctement,
echo le module Stock est fonctionnel end-to-end !
echo.
echo 📋 PROCHAINES ÉTAPES :
echo 1. Créer un compte via l'inscription
echo 2. Créer un produit
echo 3. Créer un stock pour ce produit
echo 4. Voir le stock dans la liste
echo.
pause
