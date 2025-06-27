@echo off
echo 🔍 TEST RAPIDE DE CONNECTIVITÉ
echo ================================

echo.
echo 1️⃣ Test Frontend (port 3000)...
curl -s -o nul -w "Frontend: %%{http_code} %%{url_effective}" http://localhost:3000
echo.

echo.
echo 2️⃣ Test Backend (port 3001)...
curl -s -o nul -w "Backend API: %%{http_code} %%{url_effective}" http://localhost:3001/api
echo.

echo.
echo 3️⃣ Test API Products...
curl -s -o nul -w "Products API: %%{http_code} %%{url_effective}" http://localhost:3001/api/v1/products
echo.

echo.
echo 4️⃣ Test API Stock...
curl -s -o nul -w "Stock API: %%{http_code} %%{url_effective}" http://localhost:3001/api/v1/stock
echo.

echo.
echo ================================
echo ✅ Si vous voyez des codes 200, 302, ou 401 = OK
echo ❌ Si vous voyez des erreurs de connexion = Problème
echo.
echo 💡 Codes de statut normaux:
echo    200 = OK
echo    302 = Redirection (normal pour pages protégées)
echo    401 = Auth requise (normal pour API)
echo    404 = Page non trouvée
echo.
pause
