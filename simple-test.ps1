# Test simple de l'application Next.js
Write-Host "Test de l'application Gestion Commerciale TPE" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Test Backend
Write-Host "Test Backend (port 3001):" -ForegroundColor Cyan
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Backend OK - Status: $($backend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Backend KO - $($_.Exception.Message)" -ForegroundColor Red
}

# Test Frontend
Write-Host "Test Frontend (port 3002):" -ForegroundColor Cyan
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3002" -UseBasicParsing -TimeoutSec 5
    Write-Host "  Frontend OK - Status: $($frontend.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "  Frontend KO - $($_.Exception.Message)" -ForegroundColor Red
}

# Test API Clients
Write-Host "Test API Clients:" -ForegroundColor Cyan
try {
    $clients = Invoke-RestMethod -Uri "http://localhost:3001/clients" -TimeoutSec 5
    if ($clients.success) {
        Write-Host "  API Clients OK - $($clients.data.data.Count) clients" -ForegroundColor Green
    } else {
        Write-Host "  API Clients KO - Reponse invalide" -ForegroundColor Red
    }
} catch {
    Write-Host "  API Clients KO - $($_.Exception.Message)" -ForegroundColor Red
}

# Test API Produits
Write-Host "Test API Produits:" -ForegroundColor Cyan
try {
    $products = Invoke-RestMethod -Uri "http://localhost:3001/products" -TimeoutSec 5
    if ($products.success) {
        Write-Host "  API Produits OK - $($products.data.data.Count) produits" -ForegroundColor Green
    } else {
        Write-Host "  API Produits KO - Reponse invalide" -ForegroundColor Red
    }
} catch {
    Write-Host "  API Produits KO - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test termine!" -ForegroundColor Green
Write-Host "Frontend: http://localhost:3002" -ForegroundColor Cyan
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
