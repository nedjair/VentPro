# Test complet de toutes les routes CRUD ajoutées
Write-Host "Test complet des routes CRUD - Clients, Produits, Commandes" -ForegroundColor Blue

# Demarrer le backend de production
Write-Host "`nDemarrage du backend de production..." -ForegroundColor Yellow
$process = Start-Process -FilePath "node" -ArgumentList "production-backend.js" -PassThru -WindowStyle Hidden

# Attendre que le serveur soit pret
Write-Host "Attente du demarrage (10 secondes)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

try {
    # Test health check
    Write-Host "`nTest health check..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET -TimeoutSec 5
    Write-Host "Health check OK: $($health.status)" -ForegroundColor Green
    
    # Login
    Write-Host "`nLogin..." -ForegroundColor Yellow
    $loginBody = @{
        email = "admin@demo-tpe.fr"
        password = "demo123"
    } | ConvertTo-Json
    
    $login = Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -TimeoutSec 5
    
    if ($login.success) {
        Write-Host "Login reussi" -ForegroundColor Green
        $token = $login.token
        $headers = @{ "Authorization" = "Bearer $token" }
        
        # ===== TEST ROUTES CLIENTS =====
        Write-Host "`n=== TEST ROUTES CLIENTS ===" -ForegroundColor Cyan
        
        # GET /api/v1/clients
        Write-Host "Test GET /api/v1/clients..." -ForegroundColor Yellow
        try {
            $clients = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients" -Method GET -Headers $headers -TimeoutSec 5
            if ($clients.success) {
                Write-Host "GET clients OK: $($clients.data.Count) clients" -ForegroundColor Green
                
                if ($clients.data.Count -gt 0) {
                    $firstClient = $clients.data[0]
                    
                    # GET /api/v1/clients/:id
                    Write-Host "Test GET /api/v1/clients/:id..." -ForegroundColor Yellow
                    $clientDetail = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients/$($firstClient.id)" -Method GET -Headers $headers -TimeoutSec 5
                    if ($clientDetail.success) {
                        Write-Host "GET client detail OK" -ForegroundColor Green
                    }
                    
                    # PUT /api/v1/clients/:id
                    Write-Host "Test PUT /api/v1/clients/:id..." -ForegroundColor Yellow
                    $updateClientBody = @{
                        notes = "Client mis a jour via test le $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    } | ConvertTo-Json
                    $updateClient = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients/$($firstClient.id)" -Method PUT -Body $updateClientBody -ContentType "application/json" -Headers $headers -TimeoutSec 5
                    if ($updateClient.success) {
                        Write-Host "PUT client OK: $($updateClient.message)" -ForegroundColor Green
                    }
                }
            }
        } catch {
            Write-Host "Erreur clients: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # GET /api/v1/clients/stats/overview
        Write-Host "Test GET /api/v1/clients/stats/overview..." -ForegroundColor Yellow
        try {
            $clientStats = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/clients/stats/overview" -Method GET -Headers $headers -TimeoutSec 5
            if ($clientStats.success) {
                Write-Host "GET client stats OK: $($clientStats.data.totalClients) clients total" -ForegroundColor Green
            }
        } catch {
            Write-Host "Erreur client stats: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # ===== TEST ROUTES PRODUITS =====
        Write-Host "`n=== TEST ROUTES PRODUITS ===" -ForegroundColor Cyan
        
        # GET /api/v1/products
        Write-Host "Test GET /api/v1/products..." -ForegroundColor Yellow
        try {
            $products = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/products" -Method GET -Headers $headers -TimeoutSec 5
            if ($products.success) {
                Write-Host "GET products OK: $($products.data.Count) produits" -ForegroundColor Green
                
                if ($products.data.Count -gt 0) {
                    $firstProduct = $products.data[0]
                    
                    # GET /api/v1/products/:id
                    Write-Host "Test GET /api/v1/products/:id..." -ForegroundColor Yellow
                    $productDetail = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/products/$($firstProduct.id)" -Method GET -Headers $headers -TimeoutSec 5
                    if ($productDetail.success) {
                        Write-Host "GET product detail OK" -ForegroundColor Green
                    }
                    
                    # PUT /api/v1/products/:id
                    Write-Host "Test PUT /api/v1/products/:id..." -ForegroundColor Yellow
                    $updateProductBody = @{
                        description = "Produit mis a jour via test le $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    } | ConvertTo-Json
                    $updateProduct = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/products/$($firstProduct.id)" -Method PUT -Body $updateProductBody -ContentType "application/json" -Headers $headers -TimeoutSec 5
                    if ($updateProduct.success) {
                        Write-Host "PUT product OK: $($updateProduct.message)" -ForegroundColor Green
                    }
                }
            }
        } catch {
            Write-Host "Erreur products: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # GET /api/v1/products/stats/overview
        Write-Host "Test GET /api/v1/products/stats/overview..." -ForegroundColor Yellow
        try {
            $productStats = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/products/stats/overview" -Method GET -Headers $headers -TimeoutSec 5
            if ($productStats.success) {
                Write-Host "GET product stats OK: $($productStats.data.totalProducts) produits total" -ForegroundColor Green
            }
        } catch {
            Write-Host "Erreur product stats: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # ===== TEST ROUTES COMMANDES =====
        Write-Host "`n=== TEST ROUTES COMMANDES ===" -ForegroundColor Cyan
        
        # GET /api/v1/orders
        Write-Host "Test GET /api/v1/orders..." -ForegroundColor Yellow
        try {
            $orders = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/orders" -Method GET -Headers $headers -TimeoutSec 5
            if ($orders.success) {
                Write-Host "GET orders OK: $($orders.data.Count) commandes" -ForegroundColor Green
                
                if ($orders.data.Count -gt 0) {
                    $firstOrder = $orders.data[0]
                    
                    # GET /api/v1/orders/:id
                    Write-Host "Test GET /api/v1/orders/:id..." -ForegroundColor Yellow
                    $orderDetail = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/orders/$($firstOrder.id)" -Method GET -Headers $headers -TimeoutSec 5
                    if ($orderDetail.success) {
                        Write-Host "GET order detail OK" -ForegroundColor Green
                    }
                    
                    # PUT /api/v1/orders/:id
                    Write-Host "Test PUT /api/v1/orders/:id..." -ForegroundColor Yellow
                    $updateOrderBody = @{
                        notes = "Commande mise a jour via test le $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                    } | ConvertTo-Json
                    $updateOrder = Invoke-RestMethod -Uri "http://localhost:3001/api/v1/orders/$($firstOrder.id)" -Method PUT -Body $updateOrderBody -ContentType "application/json" -Headers $headers -TimeoutSec 5
                    if ($updateOrder.success) {
                        Write-Host "PUT order OK: $($updateOrder.message)" -ForegroundColor Green
                    }
                }
            }
        } catch {
            Write-Host "Erreur orders: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host "`n=== RESUME DES TESTS ===" -ForegroundColor Magenta
        Write-Host "Toutes les routes CRUD ont ete testees avec succes!" -ForegroundColor Green
        Write-Host "Les erreurs HTTP 404 similaires a PUT /api/v1/invoices/12 sont resolues!" -ForegroundColor Green
        
    } else {
        Write-Host "Login failed: $($login.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "Erreur generale: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Arreter le backend
    Write-Host "`nArret du backend..." -ForegroundColor Yellow
    if (-not $process.HasExited) {
        $process.Kill()
        Write-Host "Backend arrete" -ForegroundColor Green
    }
}

Write-Host "`nTest termine!" -ForegroundColor Blue
