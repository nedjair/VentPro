@echo off
echo 🔧 RÉSOLUTION DU PROBLÈME D'AFFICHAGE DES DONNÉES
echo ================================================

echo.
echo 📋 DIAGNOSTIC:
echo Le problème "Aucune donnée trouvée" est dû à une base de données vide.
echo Toutes les pages affichent ce message car il n'y a aucune donnée à afficher.

echo.
echo 🎯 SOLUTION:
echo Nous allons créer des données de test algériennes pour résoudre le problème.

echo.
echo 1️⃣ Création des données de test via PostgreSQL...

REM Exécuter le script SQL pour créer les données
psql -h localhost -p 5432 -U gestion_user -d gestion_commerciale -f create-test-data.sql

if %ERRORLEVEL% EQU 0 (
    echo ✅ Données de test créées avec succès !
    echo.
    echo 📊 DONNÉES CRÉÉES:
    echo    - 1 Entreprise algérienne
    echo    - 1 Utilisateur admin (admin@test.dz / admin123)
    echo    - 3 Catégories de produits
    echo    - 5 Produits algériens (Couscous, Huile, Harissa, Thé, Savon)
    echo    - 5 Stocks correspondants
    echo    - 6 Mouvements de stock
    echo    - 3 Clients algériens
    echo    - 2 Fournisseurs algériens
    echo.
    echo 🚀 PROCHAINES ÉTAPES:
    echo 1. Aller sur http://localhost:3000/auth/login
    echo 2. Se connecter avec: admin@test.dz / admin123
    echo 3. Naviguer vers les différentes pages:
    echo    → Dashboard: Affichera les statistiques
    echo    → Produits: Affichera 5 produits
    echo    → Stocks: Affichera 5 stocks avec alertes
    echo    → Clients: Affichera 3 clients
    echo    → Fournisseurs: Affichera 2 fournisseurs
    echo.
    echo ✅ PROBLÈME RÉSOLU !
    echo Les pages n'afficheront plus "Aucune donnée trouvée"
) else (
    echo ❌ Erreur lors de la création des données
    echo.
    echo 🔧 SOLUTION ALTERNATIVE:
    echo 1. Vérifiez que PostgreSQL est démarré
    echo 2. Vérifiez les paramètres de connexion dans .env
    echo 3. Ou créez les données manuellement via l'interface:
    echo    → http://localhost:3000/auth/register (créer un compte)
    echo    → http://localhost:3000/products/new (ajouter des produits)
    echo    → http://localhost:3000/clients/new (ajouter des clients)
    echo    → http://localhost:3000/stocks/new (ajouter des stocks)
)

echo.
echo 📱 PAGES À TESTER APRÈS RÉSOLUTION:
echo → http://localhost:3000/dashboard (Statistiques)
echo → http://localhost:3000/products (Liste des produits)
echo → http://localhost:3000/stocks (Gestion des stocks)
echo → http://localhost:3000/clients (Liste des clients)
echo → http://localhost:3000/suppliers (Liste des fournisseurs)

echo.
pause
