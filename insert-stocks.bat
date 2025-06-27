@echo off
echo 🇩🇿 Insertion des stocks algériens une par une...
echo.

echo 1️⃣ Couscous Ferrero 1kg...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Couscous Ferrero 1kg\",\"productDescription\":\"Couscous grain moyen de qualité supérieure\",\"productPrice\":350.00,\"productUnit\":\"paquet\",\"quantiteActuelle\":45,\"quantiteMinimale\":10,\"quantiteMaximale\":100}"
echo.
echo.

echo 2️⃣ Huile Elio 1L...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Huile Elio 1L\",\"productDescription\":\"Huile de table raffinée\",\"productPrice\":280.00,\"productUnit\":\"bouteille\",\"quantiteActuelle\":8,\"quantiteMinimale\":15,\"quantiteMaximale\":50}"
echo.
echo.

echo 3️⃣ Harissa Traditionnelle 200g...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Harissa Traditionnelle 200g\",\"productDescription\":\"Harissa artisanale piquante\",\"productPrice\":180.00,\"productUnit\":\"pot\",\"quantiteActuelle\":3,\"quantiteMinimale\":10,\"quantiteMaximale\":30}"
echo.
echo.

echo 4️⃣ Thé Vert Palais des Thés...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Thé Vert Palais des Thés\",\"productDescription\":\"Thé vert de qualité premium\",\"productPrice\":450.00,\"productUnit\":\"boîte\",\"quantiteActuelle\":0,\"quantiteMinimale\":5,\"quantiteMaximale\":25}"
echo.
echo.

echo 5️⃣ Savon Doux Alger 100g...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Savon Doux Alger 100g\",\"productDescription\":\"Savon traditionnel à l'huile d'olive\",\"productPrice\":120.00,\"productUnit\":\"pièce\",\"quantiteActuelle\":120,\"quantiteMinimale\":20,\"quantiteMaximale\":200}"
echo.
echo.

echo 6️⃣ Café Malongo 250g...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Café Malongo 250g\",\"productDescription\":\"Café moulu arabica\",\"productPrice\":680.00,\"productUnit\":\"paquet\",\"quantiteActuelle\":12,\"quantiteMinimale\":8,\"quantiteMaximale\":40}"
echo.
echo.

echo 7️⃣ Riz Basmati 1kg...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Riz Basmati 1kg\",\"productDescription\":\"Riz basmati long grain\",\"productPrice\":420.00,\"productUnit\":\"sac\",\"quantiteActuelle\":2,\"quantiteMinimale\":10,\"quantiteMaximale\":50}"
echo.
echo.

echo 8️⃣ Dentifrice Signal 75ml...
curl -X POST http://localhost:3001/api/v1/stock ^
  -H "Content-Type: application/json" ^
  -d "{\"productName\":\"Dentifrice Signal 75ml\",\"productDescription\":\"Dentifrice protection complète\",\"productPrice\":180.00,\"productUnit\":\"tube\",\"quantiteActuelle\":25,\"quantiteMinimale\":15,\"quantiteMaximale\":60}"
echo.
echo.

echo ✅ Vérification des stocks créés...
curl -X GET http://localhost:3001/api/v1/stock
echo.
echo.

echo 🎉 Insertion terminée !
echo 💡 Testez maintenant : http://localhost:3000/stocks
pause
